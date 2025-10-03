import { ipcMain, BrowserWindow, shell } from 'electron'
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
  const flowsDir = path.join(rootDir, 'flows')
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
}
