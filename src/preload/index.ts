import { contextBridge, ipcRenderer } from 'electron'
import type { ExposedApi, StoreShape } from '@shared/types'

// Security bridge between the sandboxed renderer and the main process.
// Only these explicitly-listed capabilities are exposed to window.api.
const api: ExposedApi = {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),
  exportFile: (defaultName, content) =>
    ipcRenderer.invoke('app:exportFile', defaultName, content) as Promise<boolean>,
  getPreloadPath: (scriptName) => ipcRenderer.invoke('app:getPreloadPath', scriptName),

  storeGet: <K extends keyof StoreShape>(key: K) =>
    ipcRenderer.invoke('store:get', key) as Promise<StoreShape[K]>,
  storeSet: <K extends keyof StoreShape>(key: K, value: StoreShape[K]) =>
    ipcRenderer.invoke('store:set', key, value),

  onMenuAction: (cb) => {
    const listener = (_e: unknown, action: string): void => cb(action)
    ipcRenderer.on('menu:action', listener)
    // Returns a disposer. Callers MUST call it on unmount — without cleanup,
    // StrictMode's double-invoke and HMR remounts stack listeners, and a single
    // menu click then fires the handler once per accumulated listener.
    return () => ipcRenderer.removeListener('menu:action', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
