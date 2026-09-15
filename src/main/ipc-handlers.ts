import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { BrowserWindow, clipboard, dialog, ipcMain } from 'electron'
import type { StoreShape } from '@shared/types'
import { getKey, setKey } from './storage'

export function registerIpcHandlers(): void {
  ipcMain.handle('clipboard:write', async (_e, text: string) => {
    clipboard.writeText(text)
  })

  // Save arbitrary text to a user-chosen file (used for Markdown export).
  ipcMain.handle('app:exportFile', async (e, defaultName: string, content: string) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (canceled || !filePath) return false
    await writeFile(filePath, content, 'utf8')
    return true
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
