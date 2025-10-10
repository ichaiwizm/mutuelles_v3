import { ipcMain } from 'electron'
import { listCatalog, setSelected, getUiFormsFromDb } from '../services/catalog'

export function registerCatalogIpc() {
  ipcMain.handle('catalog:list', async () => listCatalog())
  ipcMain.handle('catalog:setSelected', async (_e, payload: unknown) => setSelected(payload))
  ipcMain.handle('catalog:getUiForms', async () => getUiFormsFromDb())
}

