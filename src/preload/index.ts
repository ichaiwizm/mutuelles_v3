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
  credentials: {
    listSelected: () => ipcRenderer.invoke('pcreds:listSelected') as Promise<Array<{ platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }>>,
    get: (platform_id: number) => ipcRenderer.invoke('pcreds:get', platform_id) as Promise<{ username:string|null; has_creds:boolean }>,
    set: (payload: { platform_id:number; username:string; password:string }) => ipcRenderer.invoke('pcreds:set', payload) as Promise<boolean>,
    delete: (platform_id: number) => ipcRenderer.invoke('pcreds:delete', platform_id) as Promise<boolean>,
    reveal: (platform_id: number) => ipcRenderer.invoke('pcreds:reveal', platform_id) as Promise<string>
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
    }
  }
}
