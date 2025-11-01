import { ipcMain } from 'electron'
import { enqueue, listByLead, listRecent } from '../../core/tasks/repo'
import { runAllPendingForLead } from '../../core/worker/queue'
import type { Task } from '../../shared/types/canonical'

export function registerTasksV2Ipc() {
  ipcMain.handle('v2:tasks:listByLead', (_e, leadId: string) => listByLead(leadId))
  ipcMain.handle('v2:tasks:listRecent', (_e, limit?: number) => listRecent(limit ?? 50))
  ipcMain.handle('v2:tasks:enqueue', (_e, tasks: Task[]) => {
    for (const t of tasks) enqueue(t)
    return true
  })
  ipcMain.handle('v2:tasks:runPending', async (_e, leadId: string) => {
    await runAllPendingForLead(leadId, listByLead)
    return true
  })
}
