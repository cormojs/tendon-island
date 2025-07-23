import { BrowserWindow, shell, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

export function createWindow(): BrowserWindow {
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

  return mainWindow
}

export function createToast(message: string = 'Toast notification'): BrowserWindow {
  const { width } = screen.getPrimaryDisplay().workAreaSize

  const toastWindow = new BrowserWindow({
    useContentSize: true,
    width: 500,
    height: 200,
    x: width - 500,
    y: 100,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enablePreferredSizeMode: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    toastWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/toast.html')
  } else {
    toastWindow.loadFile(join(__dirname, '../renderer/toast.html'))
  }

  toastWindow.webContents.once('did-finish-load', () => {
    toastWindow.webContents.send('set-message', message)
  })

  ipcMain.on("close-toast", (_e) => {
    if (!toastWindow.isDestroyed()) {
      toastWindow.close()
    }
  })

  toastWindow.webContents.on('preferred-size-changed', (_e, { width, height }) => {
    // 必要なら余白を足して調整
    toastWindow.setContentSize(width + 20, height, /*animate*/ true);
  });

  return toastWindow
}
