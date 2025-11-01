declare global {
  interface Window {
    api: {
      getVersion: () => Promise<string>
    }
    apiV2: {
      leads: {
        list: (limit?: number) => Promise<any[]>
        get: (id: string) => Promise<any>
        create: (lead: any) => Promise<boolean>
      }
      tasks: {
        listByLead: (leadId: string) => Promise<any[]>
        listRecent: (limit?: number) => Promise<any[]>
        enqueue: (tasks: any[]) => Promise<boolean>
        runPending: (leadId: string) => Promise<boolean>
      }
      secrets: {
        set: (p: { platform: string; username: string; password: string }) => Promise<boolean>
        get: (p: { platform: string; username: string }) => Promise<string | null>
        delete: (p: { platform: string; username: string }) => Promise<boolean>
      }
    }
  }
}

export {}
