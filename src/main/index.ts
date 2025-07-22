import { app, shell, BrowserWindow, ipcMain, screen, IpcMainEvent } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createToast(message: string = 'Toast notification'): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const toastWindow = new BrowserWindow({
    width: 300,
    height: 100,
    x: width - 320,
    y: height - 100,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    toastWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/toast.html')
  } else {
    toastWindow.loadFile(join(__dirname, '../renderer/toast.html'))
  }

  toastWindow.webContents.once('did-finish-load', () => {
    toastWindow.webContents.send('set-message', message)

    // setTimeout(() => {
    //   toastWindow.webContents.send('start-fadeout')

    //   setTimeout(() => {
    //     if (!toastWindow.isDestroyed()) {
    //       toastWindow.close()
    //     }
    //   }, 1000)
    // }, 4000000)
  })

  ipcMain.on("close-toast", (_e) => {
    if (!toastWindow.isDestroyed()) {
      toastWindow.close()
    }
  })
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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('show-toast', (_event: IpcMainEvent, message: string) => {
  createToast(message)
})
