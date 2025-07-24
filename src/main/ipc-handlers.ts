import { ipcMain, IpcMainEvent } from 'electron'
import { createToast } from './window-manager'
import { startOAuthFlow } from './mastodon-client'
import { loadConfig } from './config-manager'
import { AuthInfo } from '../common/types'

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

  ipcMain.handle('get-auth-info', async () => {
    const config = loadConfig()
    if (!config) {
      return null
    }

    const authInfo: AuthInfo[] = []
    for (const [domain, accounts] of Object.entries(config)) {
      for (const [acct] of Object.entries(accounts)) {
        authInfo.push({ domain, acct })
      }
    }
    return authInfo
  })
}
