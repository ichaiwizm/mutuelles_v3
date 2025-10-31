import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import dotenv from 'dotenv'
import { installMainErrorHandlers } from './errors'
import { initDatabase, getDb } from '../core/db/connection'

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../../.env')

dotenv.config({ path: envPath })

console.log('📁 Chargement .env depuis:', envPath)
console.log('🔑 GOOGLE_CLIENT_ID chargé:', process.env.GOOGLE_CLIENT_ID ? 'Oui ✓' : 'Non ✗')
import { registerLeadsV2Ipc } from './ipc_v2/leads'
import { registerTasksV2Ipc } from './ipc_v2/tasks'
import { registerSecretsV2Ipc } from './ipc_v2/secrets'
import '../core/worker/register_default_runners'

let mainWindow: BrowserWindow | null = null

function getPreloadPath() {
  const filename = app.isPackaged ? 'index.js' : 'index.mjs'
  return path.join(__dirname, '../preload/', filename)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Broker-Automation',
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
  registerLeadsV2Ipc()
  registerTasksV2Ipc()
  registerSecretsV2Ipc()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

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
  const count = (sql: string) => (conn.prepare(sql).get() as { c: number }).c
  return {
    platforms: 0,
    profiles: 0,
    credentials: 0,
  }
})
