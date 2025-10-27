import { ipcMain, BrowserWindow, shell } from 'electron'
import { getDb } from '../db/connection'
import { revealPassword } from '../services/platform_credentials'
import { LeadsService } from '../services/leads'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

type FlowFile = { platform: string; slug: string; name: string; file: string }

function listFlowFiles(rootDir: string): FlowFile[] {
  const flowsDir = path.join(rootDir, 'data', 'flows')
  const out: FlowFile[] = []
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.isFile() && ent.name.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(p, 'utf-8')
          const obj = JSON.parse(raw)
          if (obj && obj.slug && obj.platform && obj.name) {
            out.push({ platform: obj.platform, slug: obj.slug, name: obj.name, file: p })
          }
        } catch {}
      }
    }
  }
  walk(flowsDir)
  return out.sort((a,b) => a.platform.localeCompare(b.platform) || a.slug.localeCompare(b.slug))
}

export function registerAdminCliIpc() {
  const root = process.cwd()

  ipcMain.handle('admin:listFileFlows', async () => listFlowFiles(root))

  ipcMain.handle('admin:getLatestRunDir', async (_e, slug: unknown) => {
    if (typeof slug !== 'string' || !slug) throw new Error('slug invalide')
    const runsDir = path.join(root, 'data', 'runs', slug)
    try {
      const entries = fs.readdirSync(runsDir).filter(n => {
        try { return fs.statSync(path.join(runsDir, n)).isDirectory() } catch { return false }
      })
      if (!entries.length) return null
      const latest = entries.sort((a,b) => {
        try { return fs.statSync(path.join(runsDir, b)).mtimeMs - fs.statSync(path.join(runsDir, a)).mtimeMs } catch { return 0 }
      })[0]
      const dir = path.join(runsDir, latest)
      const report = path.join(dir, 'report.html')
      return { dir, report: fs.existsSync(report) ? report : null }
    } catch { return null }
  })

  ipcMain.handle('admin:openPath', async (_e, target: unknown) => {
    const t = typeof target === 'string' ? target : ''
    if (!t) throw new Error('Chemin manquant')
    return shell.openPath(path.resolve(t))
  })

  ipcMain.handle('admin:runFileFlow', async (e, payload: any) => {
    const wnd = BrowserWindow.fromWebContents(e.sender)
    if (!wnd) throw new Error('Fenêtre introuvable')
    const { slug, file, mode, keepOpen } = payload || {}
    if (!slug && !file) throw new Error('slug ou file requis')
    const flows = listFlowFiles(root)
    const item = file ? flows.find(f => path.resolve(f.file) === path.resolve(file)) : flows.find(f => f.slug === slug)
    if (!item) throw new Error('Flow introuvable')

    const electronBin = process.execPath
    const script = path.join(root, 'admin', 'cli', 'run_file_flow.mjs')
    const args = [ script, '--file', item.file, '--report', 'html', '--console', '--dom', 'steps', '--js', 'steps' ]
    if (mode) { args.push('--mode', mode) }
    if (keepOpen) args.push('--keep-open')

    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

    const child = spawn(electronBin, args, { cwd: root, env })
    const runKey = `${item.slug}-${Date.now()}-${child.pid}`
    const channel = `admin:runOutput:${runKey}`

    child.stdout.on('data', (buf) => {
      try { wnd.webContents.send(channel, { type:'stdout', data: buf.toString() }) } catch {}
    })
    child.stderr.on('data', (buf) => {
      try { wnd.webContents.send(channel, { type:'stderr', data: buf.toString() }) } catch {}
    })
    child.on('close', (code) => {
      const runsDir = path.join(root, 'data', 'runs', item.slug)
      let latest: string | null = null
      try {
        const entries = fs.readdirSync(runsDir)
        const sorted = entries.sort((a,b) => {
          const pa = path.join(runsDir, a)
          const pb = path.join(runsDir, b)
          try { return fs.statSync(pb).mtimeMs - fs.statSync(pa).mtimeMs } catch { return 0 }
        })
        latest = sorted.length ? path.join(runsDir, sorted[0]) : null
      } catch {}
      try { wnd.webContents.send(channel, { type:'exit', code, latestRunDir: latest }) } catch {}
    })

    return { runKey, pid: child.pid, flow: item }
  })

  ipcMain.handle('admin:listHLFlows', async () => {
    const flowsDir = path.join(root, 'data', 'flows')
    const out: Array<{ platform:string; slug:string; name:string; file:string }> = []
    const walk = (d:string) => {
      if (!fs.existsSync(d)) return
      for (const ent of fs.readdirSync(d, { withFileTypes:true })) {
        const p = path.join(d, ent.name)
        if (ent.isDirectory()) walk(p)
        else if (ent.isFile() && ent.name.endsWith('.hl.json')) {
          try { const obj = JSON.parse(fs.readFileSync(p,'utf-8')); out.push({ platform: obj.platform||'unknown', slug: obj.slug||ent.name, name: obj.name||obj.slug||ent.name, file:p }) } catch {}
        }
      }
    }
    walk(flowsDir)
    return out
  })

  ipcMain.handle('admin:readFlowFile', async (_e, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath) throw new Error('File path required')
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch (err) {
      throw new Error('Failed to read flow file: ' + (err instanceof Error ? err.message : String(err)))
    }
  })


  ipcMain.handle('admin:runHLFlowWithLeadId', async (e, payload: any) => {
    const wnd = BrowserWindow.fromWebContents(e.sender)
    if (!wnd) throw new Error('Fenêtre introuvable')
    const { flowFile, leadId, platform, mode } = payload || {}
    if (!flowFile || !leadId || !platform) throw new Error('flowFile, leadId et platform requis')

    // Résoudre credentials depuis la DB
    const db = getDb()
    const row = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?').get(platform) as { id?: number } | undefined
    if (!row?.id) {
      throw new Error('Plateforme introuvable: ' + platform)
    }
    const usernameRow = db.prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(row.id) as { username?: string } | undefined
    const username = usernameRow?.username || ''
    const password = revealPassword(row.id)

    // Lancer le CLI avec credentials via env vars (pas de fichier temporaire)
    const electronBin = process.execPath
    const script = path.join(root, 'automation', 'cli', 'run.mjs')
    const args = [ script, flowFile, '--lead-id', leadId ]
    if (mode === 'headless') { args.push('--headless') }

    // Passer credentials via variables d'environnement (PLATFORM_USERNAME/PASSWORD)
    const platformUpper = platform.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      [`${platformUpper}_USERNAME`]: username,
      [`${platformUpper}_PASSWORD`]: password
    }

    const child = spawn(electronBin, args, { cwd: root, env })
    const runKey = `${path.basename(flowFile)}-${Date.now()}-${child.pid}`
    const channel = `admin:runOutput:${runKey}`

    child.stdout.on('data', (b)=>{ try { wnd.webContents.send(channel, { type:'stdout', data: b.toString() }) } catch {} })
    child.stderr.on('data', (b)=>{ try { wnd.webContents.send(channel, { type:'stderr', data: b.toString() }) } catch {} })
    child.on('close', (code)=>{
      try { wnd.webContents.send(channel, { type:'exit', code }) } catch {}
    })

    return { runKey, pid: child.pid }
  })
}
