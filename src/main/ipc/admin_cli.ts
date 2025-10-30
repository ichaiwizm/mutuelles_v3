import { ipcMain, BrowserWindow, shell } from 'electron'
import { getDb } from '../db/connection'
import { revealPassword } from '../services/platform_credentials'
import { LeadsService } from '../services/leads'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

export function registerAdminCliIpc() {
  const root = process.cwd()

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
