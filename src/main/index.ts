import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { installMainErrorHandlers } from './errors'
import { initDatabase, getDb } from './db/connection'
import { registerSettingsIpc } from './ipc/settings'
import { registerProfilesIpc } from './ipc/profiles'
import { registerCatalogIpc } from './ipc/catalog'
import { registerPlatformCredsIpc } from './ipc/platform_credentials'
import { registerBrowsersIpc } from './ipc/browsers'
import { registerAutomationIpc } from './ipc/automation'
import { registerAdminCliIpc } from './ipc/admin_cli'
import { registerLeadsIPC } from './ipc/leads'
import { registerPlatformLeadsIpc } from './ipc/platform_leads'

let mainWindow: BrowserWindow | null = null

function getPreloadPath() {
  const filename = app.isPackaged ? 'index.js' : 'index.mjs'
  return path.join(__dirname, '../preload/', filename)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Mutuelles',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (!app.isPackaged) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => (mainWindow = null))
}

app.whenReady().then(() => {
  if (!app.isPackaged) process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
  installMainErrorHandlers()
  initDatabase()
  registerSettingsIpc()
  registerProfilesIpc()
  registerCatalogIpc()
  registerPlatformCredsIpc()
  registerBrowsersIpc()
  registerAutomationIpc()
  registerAdminCliIpc()
  registerLeadsIPC()
  registerPlatformLeadsIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC minimal
ipcMain.handle('app:getVersion', async () => {
  try {
    return app.getVersion()
  } catch (err) {
    console.error("app:getVersion a échoué", err)
    throw err
  }
})

ipcMain.handle('app:getStats', async () => {
  const conn = getDb()
  const count = (sql: string) => (conn.prepare(sql).get() as { c:number }).c
  return {
    platforms: count('SELECT COUNT(*) as c FROM platforms_catalog WHERE selected = 1'),
    profiles: count('SELECT COUNT(*) as c FROM profiles'),
    credentials: count('SELECT COUNT(*) as c FROM platform_credentials')
  }
})
