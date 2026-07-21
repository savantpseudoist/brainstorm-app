import { join } from 'node:path'
import { clipboard, ipcMain } from 'electron'
import type { StoreShape } from '@shared/types'
import { getKey, setKey } from './storage'

export function registerIpcHandlers(): void {
  ipcMain.handle('clipboard:write', async (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('store:get', async (_e, key: keyof StoreShape) => getKey(key))
  ipcMain.handle('store:set', async (_e, key: keyof StoreShape, value: StoreShape[keyof StoreShape]) => {
    setKey(key, value as never)
  })

  ipcMain.handle('app:getPreloadPath', async (_e, scriptName: string) => {
    const path = join(__dirname, '../preload', scriptName)
    const { pathToFileURL } = await import('node:url')
    return pathToFileURL(path).href
  })
}
