import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getStats: () => ipcRenderer.invoke('app:getStats') as Promise<{ platforms:number; profiles:number; credentials:number }>,
  settings: {
    getTheme: () => ipcRenderer.invoke('settings:getTheme') as Promise<'light' | 'dark' | null>,
    setTheme: (t: 'light' | 'dark') => ipcRenderer.invoke('settings:setTheme', t) as Promise<boolean>
  },
  catalog: {
    list: () => ipcRenderer.invoke('catalog:list') as Promise<Array<{id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean}>>,
    setSelected: (payload: { platform_id:number; selected:boolean }) => ipcRenderer.invoke('catalog:setSelected', payload) as Promise<{selected:boolean}>,
    listPages: (platformId: number) => ipcRenderer.invoke('catalog:listPages', platformId) as Promise<Array<{id:number; platform_id:number; slug:string; name:string; type:string; url:string|null; status:string; order_index:number}>>,
    listFields: (pageId: number) => ipcRenderer.invoke('catalog:listFields', pageId) as Promise<Array<{id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; order_index:number}>>
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list') as Promise<Array<{id:number; name:string; user_data_dir:string; browser_channel:string|null; initialized_at:string|null}>>,
    create: (p: { name: string }) => ipcRenderer.invoke('profiles:create', p) as Promise<{id:number; name:string; user_data_dir:string}>,
    delete: (id: number) => ipcRenderer.invoke('profiles:delete', id) as Promise<boolean>,
    openDir: (id: number) => ipcRenderer.invoke('profiles:openDir', id) as Promise<string>,
    init: (id: number) => ipcRenderer.invoke('profiles:init', id) as Promise<boolean>,
    test: (id: number) => ipcRenderer.invoke('profiles:test', id) as Promise<boolean>
  },
  browsers: {
    getChromePath: () => ipcRenderer.invoke('browsers:getChromePath') as Promise<string|null>,
    setChromePath: (p: string) => ipcRenderer.invoke('browsers:setChromePath', p) as Promise<boolean>,
    pickChrome: () => ipcRenderer.invoke('browsers:pickChrome') as Promise<string|null>
  },
  automation: {
    listFlows: () => ipcRenderer.invoke('automation:listFlows') as Promise<Array<{ id:number; slug:string; name:string; platform_id:number; platform:string; active:boolean }>>,
    run: (payload: { flowSlug: string; mode?: 'headless'|'dev'|'dev_private' }) => ipcRenderer.invoke('automation:run', payload) as Promise<{ runId:string; screenshotsDir:string }>,
    onProgress: (runId: string, cb: (e: any) => void) => {
      const channel = `automation:progress:${runId}`
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },
    openRunDir: (dir: string) => ipcRenderer.invoke('automation:openRunDir', dir) as Promise<string>,
    listRuns: (params?: { flowSlug?: string; limit?: number; offset?: number }) => ipcRenderer.invoke('automation:listRuns', params ?? {}) as Promise<{ items: Array<{ runId:string; flowSlug:string; startedAt:string; finishedAt?:string|null; status:string; screenshotsDir?:string|null; jsonPath?:string|null; stepsTotal?:number|null; okSteps?:number|null; error?:string|null }>; total: number }>,
    getRun: (runId: string) => ipcRenderer.invoke('automation:getRun', runId) as Promise<{ jsonPath:string; json:any }>,
    listScreenshots: (runId: string) => ipcRenderer.invoke('automation:listScreenshots', runId) as Promise<string[]>,
    getScreenshot: (runId: string, filename: string) => ipcRenderer.invoke('automation:getScreenshot', { runId, filename }) as Promise<string>,
    exportRunJson: (runId: string) => ipcRenderer.invoke('automation:exportRunJson', runId) as Promise<string|null>,
    deleteRun: (runId: string) => ipcRenderer.invoke('automation:deleteRun', runId) as Promise<boolean>,
    deleteAllRuns: () => ipcRenderer.invoke('automation:deleteAllRuns') as Promise<{ deleted: number }>,
    listFlowSteps: (flowSlug: string) => ipcRenderer.invoke('automation:listFlowSteps', flowSlug) as Promise<any[]>
  },
  admin: {
    listFileFlows: () => ipcRenderer.invoke('admin:listFileFlows') as Promise<Array<{ platform:string; slug:string; name:string; file:string }>>,
    getLatestRunDir: (slug: string) => ipcRenderer.invoke('admin:getLatestRunDir', slug) as Promise<{ dir:string; report:string|null } | null>,
    runFileFlow: (payload: { slug?: string; file?: string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => ipcRenderer.invoke('admin:runFileFlow', payload) as Promise<{ runKey:string; pid:number; flow:{ platform:string; slug:string; name:string; file:string } }>,
    onRunOutput: (runKey: string, cb: (e: { type:'stdout'|'stderr'|'exit'; data?: string; code?: number|null; latestRunDir?: string|null }) => void) => {
      const ch = `admin:runOutput:${runKey}`
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on(ch, handler)
      return () => ipcRenderer.removeListener(ch, handler)
    },
    openPath: (p: string) => ipcRenderer.invoke('admin:openPath', p) as Promise<string>
  },
  adminHL: {
    listHLFlows: () => ipcRenderer.invoke('admin:listHLFlows') as Promise<Array<{ platform:string; slug:string; name:string; file:string }>>,
    listLeads: () => ipcRenderer.invoke('admin:listLeads') as Promise<Array<{ name:string; file:string }>>,
    run: (payload: { platform:string; flowFile:string; leadFile:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => ipcRenderer.invoke('admin:runHLFlow', payload) as Promise<{ runKey:string; pid:number }>,
    runWithLeadId: (payload: { platform:string; flowFile:string; leadId:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => ipcRenderer.invoke('admin:runHLFlowWithLeadId', payload) as Promise<{ runKey:string; pid:number }>,
    onRunOutput: (runKey: string, cb: (e:any)=>void) => {
      const ch = `admin:runOutput:${runKey}`
      const h = (_:any, d:any)=>cb(d)
      ipcRenderer.on(ch, h)
      return ()=>ipcRenderer.removeListener(ch, h)
    }
  },
  credentials: {
    listSelected: () => ipcRenderer.invoke('pcreds:listSelected') as Promise<Array<{ platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }>>,
    get: (platform_id: number) => ipcRenderer.invoke('pcreds:get', platform_id) as Promise<{ username:string|null; has_creds:boolean }>,
    set: (payload: { platform_id:number; username:string; password:string }) => ipcRenderer.invoke('pcreds:set', payload) as Promise<boolean>,
    delete: (platform_id: number) => ipcRenderer.invoke('pcreds:delete', platform_id) as Promise<boolean>,
    reveal: (platform_id: number) => ipcRenderer.invoke('pcreds:reveal', platform_id) as Promise<string>
  },
  leads: {
    create: (data: any) => ipcRenderer.invoke('leads:create', data) as Promise<{ success: boolean; data?: any; error?: string }>,
    get: (id: string) => ipcRenderer.invoke('leads:get', id) as Promise<{ success: boolean; data?: any; error?: string }>,
    update: (id: string, data: any) => ipcRenderer.invoke('leads:update', id, data) as Promise<{ success: boolean; data?: any; error?: string }>,
    delete: (id: string) => ipcRenderer.invoke('leads:delete', id) as Promise<{ success: boolean; error?: string }>,
    list: (filters?: any, pagination?: any) => ipcRenderer.invoke('leads:list', filters, pagination) as Promise<{ success: boolean; data?: any; error?: string }>,
    stats: () => ipcRenderer.invoke('leads:stats') as Promise<{ success: boolean; data?: any; error?: string }>,
    search: (query: string) => ipcRenderer.invoke('leads:search', query) as Promise<{ success: boolean; data?: any; error?: string }>,
    deleteMany: (ids: string[]) => ipcRenderer.invoke('leads:deleteMany', ids) as Promise<{ success: boolean; data?: any; error?: string }>
  }
})

declare global {
  interface Window {
    api: {
      getVersion: () => Promise<string>
      getStats: () => Promise<{ platforms:number; profiles:number; credentials:number }>
      settings: {
        getTheme: () => Promise<'light' | 'dark' | null>
        setTheme: (t: 'light' | 'dark') => Promise<boolean>
      }
      catalog: {
        list: () => Promise<Array<{id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean}>>
        setSelected: (payload: { platform_id:number; selected:boolean }) => Promise<{selected:boolean}>
        listPages: (platformId: number) => Promise<Array<{id:number; platform_id:number; slug:string; name:string; type:string; url:string|null; status:string; order_index:number}>>
        listFields: (pageId: number) => Promise<Array<{id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; order_index:number}>>
      }
      profiles: {
        list: () => Promise<Array<{id:number; name:string; user_data_dir:string; browser_channel:string|null; initialized_at:string|null}>>
        create: (p: { name: string }) => Promise<{id:number; name:string; user_data_dir:string}>
        delete: (id: number) => Promise<boolean>
        openDir: (id: number) => Promise<string>
        init: (id: number) => Promise<boolean>
        test: (id: number) => Promise<boolean>
      }
      browsers: {
        getChromePath: () => Promise<string|null>
        setChromePath: (p: string) => Promise<boolean>
        pickChrome: () => Promise<string|null>
      }
      credentials: {
        listSelected: () => Promise<Array<{ platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }>>
        get: (platform_id: number) => Promise<{ username:string|null; has_creds:boolean }>
        set: (payload: { platform_id:number; username:string; password:string }) => Promise<boolean>
        delete: (platform_id: number) => Promise<boolean>
        reveal: (platform_id: number) => Promise<string>
      }
      leads: {
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>
        get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>
        update: (id: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>
        delete: (id: string) => Promise<{ success: boolean; error?: string }>
        list: (filters?: any, pagination?: any) => Promise<{ success: boolean; data?: any; error?: string }>
        stats: () => Promise<{ success: boolean; data?: any; error?: string }>
        search: (query: string) => Promise<{ success: boolean; data?: any; error?: string }>
        deleteMany: (ids: string[]) => Promise<{ success: boolean; data?: any; error?: string }>
      }
      automation: {
        listFlows: () => Promise<Array<{ id:number; slug:string; name:string; platform_id:number; platform:string; active:boolean }>>
        run: (payload: { flowSlug: string; mode?: 'headless'|'dev'|'dev_private' }) => Promise<{ runId:string; screenshotsDir:string }>
        onProgress: (runId: string, cb: (e:any)=>void) => (()=>void)
        openRunDir: (dir: string) => Promise<string>
        listRuns: (params?: { flowSlug?: string; limit?: number; offset?: number }) => Promise<{ items: Array<{ runId:string; flowSlug:string; startedAt:string; finishedAt?:string|null; status:string; screenshotsDir?:string|null; jsonPath?:string|null; stepsTotal?:number|null; okSteps?:number|null; error?:string|null }>; total: number }>
        getRun: (runId: string) => Promise<{ jsonPath:string; json:any }>
        listScreenshots: (runId: string) => Promise<string[]>
        getScreenshot: (runId: string, filename: string) => Promise<string>
        exportRunJson: (runId: string) => Promise<string|null>
        deleteRun: (runId: string) => Promise<boolean>
        deleteAllRuns: () => Promise<{ deleted: number }>
        listFlowSteps: (flowSlug: string) => Promise<any[]>
      }
      adminHL: {
        listHLFlows: () => Promise<Array<{ platform:string; slug:string; name:string; file:string }>>
        listLeads: (platform: string) => Promise<Array<{ platform:string; name:string; file:string }>>
        run: (payload: { platform:string; flowFile:string; leadFile:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => Promise<{ runKey:string; pid:number }>
        runWithLeadId: (payload: { platform:string; flowFile:string; leadId:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => Promise<{ runKey:string; pid:number }>
        onRunOutput: (runKey: string, cb:(e:any)=>void) => (()=>void)
      }
    }
  }
}
