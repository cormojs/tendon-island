import { ipcMain, IpcMainEvent } from 'electron'
import { createToast } from './window-manager'
import { saveConfig } from './config-manager'

export function setupIpcHandlers(): void {
  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('show-toast', (_event: IpcMainEvent, message: string) => {
    createToast(message)
  })

  ipcMain.on('save-config', (_e: IpcMainEvent, config: { domain: string, secret: string }) => {
    saveConfig(config)
  })
}
