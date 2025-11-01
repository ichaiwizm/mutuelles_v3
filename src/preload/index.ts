import { contextBridge, ipcRenderer } from 'electron'

// Minimal legacy surface used by App header
contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
})

// v2 Canonical API
contextBridge.exposeInMainWorld('apiV2', {
  leads: {
    list: (limit?: number) => ipcRenderer.invoke('v2:leads:list', limit),
    get: (id: string) => ipcRenderer.invoke('v2:leads:get', id),
    create: (lead: any) => ipcRenderer.invoke('v2:leads:create', lead),
  },
  tasks: {
    listByLead: (leadId: string) => ipcRenderer.invoke('v2:tasks:listByLead', leadId),
    listRecent: (limit?: number) => ipcRenderer.invoke('v2:tasks:listRecent', limit),
    enqueue: (tasks: any[]) => ipcRenderer.invoke('v2:tasks:enqueue', tasks),
    runPending: (leadId: string) => ipcRenderer.invoke('v2:tasks:runPending', leadId),
  },
  secrets: {
    set: (p: { platform: string; username: string; password: string }) => ipcRenderer.invoke('v2:secrets:set', p),
    get: (p: { platform: string; username: string }) => ipcRenderer.invoke('v2:secrets:get', p) as Promise<string | null>,
    delete: (p: { platform: string; username: string }) => ipcRenderer.invoke('v2:secrets:delete', p) as Promise<boolean>,
  }
})

export {}
