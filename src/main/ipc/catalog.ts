import { ipcMain } from 'electron'
import { listCatalog, listFields, listPages, setSelected } from '../services/catalog'

export function registerCatalogIpc() {
  ipcMain.handle('catalog:list', async () => listCatalog())
  ipcMain.handle('catalog:setSelected', async (_e, payload: unknown) => setSelected(payload))
  ipcMain.handle('catalog:listPages', async (_e, platformId: unknown) => listPages(platformId))
  ipcMain.handle('catalog:listFields', async (_e, pageId: unknown) => listFields(pageId))
}

