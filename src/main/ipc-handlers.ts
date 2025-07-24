import { ipcMain, IpcMainEvent } from 'electron'
import { createToast } from './window-manager'
import { startOAuthFlow } from './mastodon-client'

export function setupIpcHandlers(): void {
  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('show-toast', (_event: IpcMainEvent, message: string) => {
    createToast(message)
  })

  ipcMain.on('start-oauth', async (_event: IpcMainEvent, domain: string) => {
    try {
      await startOAuthFlow(domain)
    } catch (error) {
      console.error('OAuth flow error:', error)
    }
  })
}
