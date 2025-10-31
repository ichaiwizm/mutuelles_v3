import { ipcMain } from 'electron'
import { insertLead, listLeads, getLeadById } from '../../core/leads/repo'
import type { LeadGenerique } from '../../shared/types/canonical'

export function registerLeadsV2Ipc() {
  ipcMain.handle('v2:leads:list', (_e, limit?: number) => listLeads(limit ?? 200))
  ipcMain.handle('v2:leads:get', (_e, id: string) => getLeadById(id))
  ipcMain.handle('v2:leads:create', (_e, lead: LeadGenerique) => {
    insertLead(lead)
    return true
  })
}

