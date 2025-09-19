import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getStats: () => ipcRenderer.invoke('app:getStats') as Promise<{ platforms:number; profiles:number; credentials:number }>,
  settings: {
    getTheme: () => ipcRenderer.invoke('settings:getTheme') as Promise<'light' | 'dark' | null>,
    setTheme: (t: 'light' | 'dark') => ipcRenderer.invoke('settings:setTheme', t) as Promise<boolean>
  },
  platforms: {
    list: () => ipcRenderer.invoke('platforms:list') as Promise<Array<{id:number; name:string; login_url:string|null}>>,
    create: (p: { name: string; login_url?: string }) => ipcRenderer.invoke('platforms:create', p) as Promise<{id:number; name:string; login_url:string|null}>,
    delete: (id: number) => ipcRenderer.invoke('platforms:delete', id) as Promise<boolean>
  },
  catalog: {
    list: () => ipcRenderer.invoke('catalog:list') as Promise<Array<{id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean}>>,
    setSelected: (payload: { platform_id:number; selected:boolean }) => ipcRenderer.invoke('catalog:setSelected', payload) as Promise<{selected:boolean}>,
    listPages: (platformId: number) => ipcRenderer.invoke('catalog:listPages', platformId) as Promise<Array<{id:number; platform_id:number; slug:string; name:string; type:string; status:string; order_index:number}>>,
    listFields: (pageId: number) => ipcRenderer.invoke('catalog:listFields', pageId) as Promise<Array<{id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; help?:string|null; order_index:number}>>
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list') as Promise<Array<{id:number; name:string; user_data_dir:string; browser_channel:string|null}>>,
    create: (p: { name: string }) => ipcRenderer.invoke('profiles:create', p) as Promise<{id:number; name:string; user_data_dir:string}>,
    delete: (id: number) => ipcRenderer.invoke('profiles:delete', id) as Promise<boolean>,
    openDir: (id: number) => ipcRenderer.invoke('profiles:openDir', id) as Promise<string>
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
      platforms: {
        list: () => Promise<Array<{id:number; name:string; login_url:string|null}>>
        create: (p: { name: string; login_url?: string }) => Promise<{id:number; name:string; login_url:string|null}>
        delete: (id: number) => Promise<boolean>
      }
      catalog: {
        list: () => Promise<Array<{id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean}>>
        setSelected: (payload: { platform_id:number; selected:boolean }) => Promise<{selected:boolean}>
        listPages: (platformId: number) => Promise<Array<{id:number; platform_id:number; slug:string; name:string; type:string; status:string; order_index:number}>>
        listFields: (pageId: number) => Promise<Array<{id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; help?:string|null; order_index:number}>>
      }
      profiles: {
        list: () => Promise<Array<{id:number; name:string; user_data_dir:string; browser_channel:string|null}>>
        create: (p: { name: string }) => Promise<{id:number; name:string; user_data_dir:string}>
        delete: (id: number) => Promise<boolean>
        openDir: (id: number) => Promise<string>
      }
      credentials: {
        listSelected: () => Promise<Array<{ platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }>>
        get: (platform_id: number) => Promise<{ username:string|null; has_creds:boolean }>
        set: (payload: { platform_id:number; username:string; password:string }) => Promise<boolean>
        delete: (platform_id: number) => Promise<boolean>
        reveal: (platform_id: number) => Promise<string>
      }
    }
  }
}
