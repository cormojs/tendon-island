import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow, createToast } from './window-manager'
import { setupIpcHandlers } from './ipc-handlers'
import { loadConfig } from './config-manager'
import { startSubscribe } from './mastodon-client'

let mainWindow: BrowserWindow | null = null

// カスタムプロトコルハンドラーを設定
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('tendon-island', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('tendon-island')
}

// 二重起動を防ぐ
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 既にアプリが起動している場合は終了
  app.quit()
} else {
  // 二番目のインスタンスが起動しようとした時の処理
  app.on('second-instance', (_, commandLine) => {
    // 既存のウィンドウがある場合はフォーカスを当てる
    if (mainWindow !== null) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }

    // WindowsでのURL処理 - コマンドライン引数からURLを取得
    if (process.platform === 'win32') {
      console.log("cmd", commandLine)
      const url = commandLine.find(arg => arg.startsWith('tendon-island:'))
      if (url !== undefined) {
        // open-urlイベントを手動で発火
        app.emit("open-url-win", { url })
      }
    }
  })

  // プロセスが直接起動した場合
  if (process.platform === 'win32') {
    console.log("argv", process.argv)
    const url = process.argv.find(arg => arg.startsWith('tendon-island:'))
    if (url !== undefined) {
      // open-urlイベントを手動で発火
      app.emit('open-url-win', { url })
    }
  }
}

async function startSubscribeAll(): Promise<void> {
  const toast = createToast()

  const config = loadConfig()
  if (config) {
    await Promise.all(
      Object.entries(config).map(([domain, acccounts]) =>
        Object.entries(acccounts).map(([_, { secret }]) =>
          startSubscribe(domain, secret, (post) => {
            toast.webContents.send("set-post", post)
          })
        )
      )
    )
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Setup IPC handlers
  setupIpcHandlers()

  const window = createWindow()
  mainWindow = window
  window.on('close', () => {
    app.quit()
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  startSubscribeAll()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
