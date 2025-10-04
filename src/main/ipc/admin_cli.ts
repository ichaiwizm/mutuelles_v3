import { ipcMain, BrowserWindow, shell } from 'electron'
import { getDb } from '../db/connection'
import { revealPassword } from '../services/platform_credentials'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

type FlowFile = { platform: string; slug: string; name: string; file: string }

function findProjectRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 10; i++) {
    const p = path.join(dir, 'package.json')
    if (fs.existsSync(p)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

function listFlowFiles(rootDir: string): FlowFile[] {
  const flowsDir = path.join(rootDir, 'admin', 'flows')
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
  const root = findProjectRoot(__dirname)

  ipcMain.handle('admin:listFileFlows', async () => listFlowFiles(root))

  ipcMain.handle('admin:getLatestRunDir', async (_e, slug: unknown) => {
    if (typeof slug !== 'string' || !slug) throw new Error('slug invalide')
    const runsDir = path.join(root, 'admin', 'runs-cli', slug)
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
      // Try to find the latest run dir for this slug
      const runsDir = path.join(root, 'admin', 'runs-cli', item.slug)
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
    const flowsDir = path.join(root, 'admin', 'flows')
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

  ipcMain.handle('admin:listLeads', async () => {
    const leadsDir = path.join(root, 'admin', 'leads')
    const out: Array<{ name:string; file:string }> = []
    try {
      const files = fs.readdirSync(leadsDir).filter(f => f.endsWith('.json'))
      for (const f of files) out.push({ name: f.replace(/\.json$/,''), file: path.join(leadsDir,f) })
    } catch {}
    return out
  })

  ipcMain.handle('admin:runHLFlow', async (e, payload: any) => {
    const wnd = BrowserWindow.fromWebContents(e.sender)
    if (!wnd) throw new Error('Fenêtre introuvable')
    const { flowFile, leadFile, platform, mode, keepOpen } = payload || {}
    if (!flowFile || !leadFile) throw new Error('flowFile et leadFile requis')
    const fieldsFile = path.join(root, 'admin', 'field-definitions', `${platform}.json`)
    if (!fs.existsSync(fieldsFile)) throw new Error('field-definitions introuvable pour '+platform)
    const electronBin = process.execPath
    const script = path.join(root, 'admin', 'cli', 'run.mjs')
    // New CLI syntax: run.mjs <platform> <flowSlugOrPath> [--lead <name>] [--headless]
    const args = [ script, platform, flowFile, '--lead', path.basename(leadFile, '.json') ]
    // New run.mjs: default is visible with window kept open, --headless for invisible auto-close
    if (mode === 'headless') { args.push('--headless') }
    // keepOpen is now the default behavior unless --headless is used

    // Resolve credentials in the main process via DB+safeStorage, then pass via env to child (transport only)
    const db = getDb()
    const row = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?').get(platform) as { id?: number } | undefined
    if (!row?.id) throw new Error('Plateforme introuvable: ' + platform)
    const usernameRow = db.prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(row.id) as { username?: string } | undefined
    const username = usernameRow?.username || ''
    const password = revealPassword(row.id)
    // Write creds to a temp file to avoid env propagation issues
    const tmpDir = path.join(root, 'admin')
    try { fs.mkdirSync(tmpDir, { recursive: true }) } catch {}
    const credFile = path.join(tmpDir, `creds-${Date.now()}-${Math.random().toString(36).slice(2,8)}.json`)
    fs.writeFileSync(credFile, JSON.stringify({ username, password }), 'utf-8')
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', ADMIN_CRED_FILE: credFile }
    const child = spawn(electronBin, args, { cwd: root, env })
    const runKey = `${path.basename(flowFile)}-${Date.now()}-${child.pid}`
    const channel = `admin:runOutput:${runKey}`
    child.stdout.on('data', (b)=>{ try { wnd.webContents.send(channel, { type:'stdout', data: b.toString() }) } catch {} })
    child.stderr.on('data', (b)=>{ try { wnd.webContents.send(channel, { type:'stderr', data: b.toString() }) } catch {} })
    child.on('close', (code)=>{ try { fs.existsSync(credFile) && fs.unlinkSync(credFile) } catch {}; try { wnd.webContents.send(channel, { type:'exit', code }) } catch {} })
    return { runKey, pid: child.pid }
  })
}
