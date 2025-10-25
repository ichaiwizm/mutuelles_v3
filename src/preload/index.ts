import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getStats: () => ipcRenderer.invoke('app:getStats') as Promise<{ platforms:number; profiles:number; credentials:number }>,
  sendFailureNotification: (failures: Array<{leadName: string; platform: string; error?: string}>) =>
    ipcRenderer.invoke('notifications:sendFailure', failures) as Promise<{success: boolean}>,
  settings: {
    getTheme: () => ipcRenderer.invoke('settings:getTheme') as Promise<'light' | 'dark' | null>,
    setTheme: (t: 'light' | 'dark') => ipcRenderer.invoke('settings:setTheme', t) as Promise<boolean>,
    getAutomationSettings: () => ipcRenderer.invoke('settings:getAutomationSettings'),
    setAutomationSettings: (settings: any) => ipcRenderer.invoke('settings:setAutomationSettings', settings) as Promise<boolean>
  },
  catalog: {
    list: () => ipcRenderer.invoke('catalog:list') as Promise<Array<{id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean}>>,
    setSelected: (payload: { platform_id:number; selected:boolean }) => ipcRenderer.invoke('catalog:setSelected', payload) as Promise<{selected:boolean}>,
    listPages: (platformId: number) => ipcRenderer.invoke('catalog:listPages', platformId) as Promise<Array<{id:number; platform_id:number; slug:string; name:string; type:string; url:string|null; status:string; order_index:number}>>,
    listFields: (pageId: number) => ipcRenderer.invoke('catalog:listFields', pageId) as Promise<Array<{id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; order_index:number}>>,
    getUiForms: () => ipcRenderer.invoke('catalog:getUiForms') as Promise<Array<{ slug:string; ui:any|null }>>
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
    readFlowFile: (filePath: string) => ipcRenderer.invoke('admin:readFlowFile', filePath) as Promise<any>,
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
  ,
  scenarios: {
    run: (payload: { scenarioId?: string; platformSlugs?: string[]; leadIds: string[]; options?: { mode?: 'headless'|'dev'|'dev_private'; concurrency?: number } }) =>
      ipcRenderer.invoke('scenarios:run', payload) as Promise<{ runId: string }>,
    onProgress: (runId: string, cb: (e:any)=>void) => {
      const ch = `scenarios:progress:${runId}`
      const h = (_: any, data: any) => cb(data)
      ipcRenderer.on(ch, h)
      return () => ipcRenderer.removeListener(ch, h)
    },
    openPath: (p: string) => ipcRenderer.invoke('scenarios:openPath', p) as Promise<string>,
    exists: (p: string) => ipcRenderer.invoke('scenarios:exists', p) as Promise<boolean>,
    listFlows: () => ipcRenderer.invoke('scenarios:listFlows') as Promise<{
      success: boolean
      data?: Array<{
        platform: string
        platformName: string
        flows: Array<{ slug: string; name: string; file: string; stepsCount: number }>
      }>
      error?: string
    }>,
    getHistory: (filters?: any) => ipcRenderer.invoke('scenarios:getHistory', filters) as Promise<{ success: boolean; data?: Array<any>; error?: string }>,
    getActiveRun: (runId: string) => ipcRenderer.invoke('scenarios:getActiveRun', runId) as Promise<{ success: boolean; data?: any; error?: string }>,
    getRunItems: (runId: string) => ipcRenderer.invoke('scenarios:getRunItems', runId) as Promise<{ success: boolean; data?: Array<any>; error?: string }>,
    getRunSteps: (itemId: string) => ipcRenderer.invoke('scenarios:getRunSteps', itemId) as Promise<{ success: boolean; data?: Array<any>; error?: string }>,
    deleteRun: (runId: string) => ipcRenderer.invoke('scenarios:deleteRun', runId) as Promise<{ success: boolean; message?: string; error?: string }>,
    getRunDetails: (runDir: string) => ipcRenderer.invoke('scenarios:getRunDetails', runDir) as Promise<{ success: boolean; data?: any; error?: string }>,
    debugDump: () => ipcRenderer.invoke('scenarios:debugDump') as Promise<{ success: boolean; data?: { runs: any[]; items: any[] }; error?: string }>,
    repairFinalize: () => ipcRenderer.invoke('scenarios:repairFinalize') as Promise<{ success: boolean; repaired?: number; error?: string }>,
    getItemDetails: (itemId: string) => ipcRenderer.invoke('scenarios:getItemDetails', itemId) as Promise<{ success: boolean; data?: any; error?: string }>,
    readScreenshot: (screenshotPath: string) => ipcRenderer.invoke('scenarios:readScreenshot', screenshotPath) as Promise<{ success: boolean; data?: string; error?: string }>,
    stop: (runId: string) => ipcRenderer.invoke('scenarios:stop', runId) as Promise<{ success: boolean; message?: string; error?: string; cancelledCount?: number }>,
    requeueItem: (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:requeueItem', runId, itemId) as Promise<{ success: boolean; message?: string; error?: string }>,
    requeueItems: (runId: string, itemIds: string[]) => ipcRenderer.invoke('scenarios:requeueItems', runId, itemIds) as Promise<{ success: boolean; message?: string; error?: string; requeuedCount?: number }>,
    stopItem: (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:stopItem', runId, itemId) as Promise<{ success: boolean; message?: string; error?: string }>,
    pauseItem: (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:pauseItem', runId, itemId) as Promise<{ success: boolean; message?: string; error?: string }>,
    resumeItem: (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:resumeItem', runId, itemId) as Promise<{ success: boolean; message?: string; error?: string }>,
    window: {
      getState: async (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:window:getState', runId, itemId) as Promise<{ success: boolean; state?: string; message?: string }>,
      minimize: async (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:window:minimize', runId, itemId) as Promise<{ success: boolean; message?: string }>,
      restore: async (runId: string, itemId: string) => ipcRenderer.invoke('scenarios:window:restore', runId, itemId) as Promise<{ success: boolean; message?: string }>
    }
  }
})

declare global {
  interface Window {
    api: {
      getVersion: () => Promise<string>
      getStats: () => Promise<{ platforms:number; profiles:number; credentials:number }>
      sendFailureNotification: (failures: Array<{leadName: string; platform: string; error?: string}>) => Promise<{success: boolean}>
      settings: {
        getTheme: () => Promise<'light' | 'dark' | null>
        setTheme: (t: 'light' | 'dark') => Promise<boolean>
        getAutomationSettings: () => Promise<any>
        setAutomationSettings: (settings: any) => Promise<boolean>
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
      scenarios: {
        run: (payload: { scenarioId?: string; platformSlugs?: string[]; leadIds: string[]; options?: { mode?: 'headless'|'dev'|'dev_private'; concurrency?: number } }) => Promise<{ runId: string }>
        onProgress: (runId: string, cb: (e:any)=>void) => (()=>void)
        openPath: (p: string) => Promise<string>
        exists: (p: string) => Promise<boolean>
        listFlows: () => Promise<{
          success: boolean
          data?: Array<{
            platform: string
            platformName: string
            flows: Array<{ slug: string; name: string; file: string; stepsCount: number }>
          }>
          error?: string
        }>
        getHistory: () => Promise<{
          success: boolean
          data?: Array<{
            id: string
            slug: string
            platform: string
            leadId?: string
            leadName?: string
            status: 'success' | 'error' | 'running' | 'stopped'
            startedAt: string
            finishedAt?: string
            durationMs?: number
            runDir: string
            error?: string
            mode: 'headless' | 'dev' | 'dev_private'
            stepsTotal?: number
            stepsCompleted?: number
          }>
          error?: string
        }>
        getActiveRun: (runId: string) => Promise<{
          success: boolean
          data?: any
          error?: string
        }>
        getRunItems: (runId: string) => Promise<{
          success: boolean
          data?: Array<any>
          error?: string
        }>
        getRunSteps: (itemId: string) => Promise<{
          success: boolean
          data?: Array<any>
          error?: string
        }>
      getRunDetails: (runDir: string) => Promise<{
        success: boolean
        data?: any
        error?: string
      }>
      debugDump: () => Promise<{
        success: boolean
        data?: { runs: any[]; items: any[] }
        error?: string
      }>
      repairFinalize: () => Promise<{
        success: boolean
        repaired?: number
        error?: string
      }>
        getItemDetails: (itemId: string) => Promise<{
          success: boolean
          data?: any
          error?: string
        }>
        readScreenshot: (screenshotPath: string) => Promise<{
          success: boolean
          data?: string
          error?: string
        }>
        stop: (runId: string) => Promise<{
          success: boolean
          message?: string
          error?: string
          cancelledCount?: number
        }>
        requeueItem: (runId: string, itemId: string) => Promise<{
          success: boolean
          message?: string
          error?: string
        }>
        requeueItems: (runId: string, itemIds: string[]) => Promise<{
          success: boolean
          message?: string
          error?: string
          requeuedCount?: number
        }>
        stopItem: (runId: string, itemId: string) => Promise<{
          success: boolean
          message?: string
          error?: string
        }>
        pauseItem: (runId: string, itemId: string) => Promise<{
          success: boolean
          message?: string
          error?: string
        }>
        resumeItem: (runId: string, itemId: string) => Promise<{
          success: boolean
          message?: string
          error?: string
        }>
        window: {
          getState: (runId: string, itemId: string) => Promise<{ success: boolean; state?: string; message?: string }>
          minimize: (runId: string, itemId: string) => Promise<{ success: boolean; message?: string }>
          restore: (runId: string, itemId: string) => Promise<{ success: boolean; message?: string }>
        }
      }
      adminHL: {
        listHLFlows: () => Promise<Array<{ platform:string; slug:string; name:string; file:string }>>
        listLeads: (platform: string) => Promise<Array<{ platform:string; name:string; file:string }>>
        run: (payload: { platform:string; flowFile:string; leadFile:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => Promise<{ runKey:string; pid:number }>
        runWithLeadId: (payload: { platform:string; flowFile:string; leadId:string; mode?: 'headless'|'dev'|'dev_private'; keepOpen?: boolean }) => Promise<{ runKey:string; pid:number }>
        readFlowFile: (filePath: string) => Promise<any>
        onRunOutput: (runKey: string, cb:(e:any)=>void) => (()=>void)
      }
    }
  }
}
