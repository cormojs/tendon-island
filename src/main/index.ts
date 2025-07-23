import { app, shell, BrowserWindow, ipcMain, screen, IpcMainEvent } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { createRestAPIClient, createStreamingAPIClient } from 'masto'
import { Post } from '../common/types'
import sanitizeHtml from 'sanitize-html'
import { Status } from 'masto/dist/esm/mastodon/entities/v1'

function createWindow() {
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

function createToast(message: string = 'Toast notification') {
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

  const window = createWindow()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('show-toast', (_event: IpcMainEvent, message: string) => {
  createToast(message)
})

ipcMain.on('save-config', (_e: IpcMainEvent, config: { domain: string, secret: string }) => {
  const existingConfig: { [domain: string]: { secret: string }; } =
    existsSync('./config.json') ? JSON.parse(readFileSync('./config.json', { encoding: 'utf-8' })) : {}
  existingConfig[config.domain] = { secret: config.secret }
  writeFileSync('./config.json', JSON.stringify(existingConfig))
})

async function startSubscribeAll() {
  const toast = createToast()

  if (existsSync('./config.json')) {
    createToast
    const file = readFileSync('./config.json', {
      encoding: 'utf-8'
    })
    const config = JSON.parse(file) as {
      [domain: string]: {
        secret: string
      }
    }
    await Promise.all(
      Object.entries(config).map(([domain, {secret}]) =>
        startSubscribe(domain, secret, (post) => {
          toast.webContents.send("set-post", post)
        })
      )
    )
  }
}

function sanitizeContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [ 'p', 'code', 'b', 'i', 'em', 'strong', 'a', 'blockquote', 'br' ],
    allowedAttributes: {
      'a': ['href']
    }
  })
}

async function convertedMediaAttachments(attachments: Status['mediaAttachments']): Promise<(Status['mediaAttachments'][number] & {
  array: Uint8Array,
  mediaType: string
})[]> {
  const converted = Promise.all(
    attachments.map(async (media) => {
      const result = await fetch(media.previewUrl)
      const array = await result.bytes()

      return {
        ...media,
        array,
        mediaType: result.headers['Content-Type'] ?? 'image/png'
      }
    })
  )
  return converted
}

async function startSubscribe(domain: string, secret: string, callback: (post: Post) => void) {
  const rest = createRestAPIClient({
    url: `https://${domain}`,
    accessToken: secret
  })
  const instance = await rest.v2.instance.fetch()
  using streaming = createStreamingAPIClient({
    streamingApiUrl: instance.configuration.urls.streaming,
    accessToken: secret
  })
  for await (const event of streaming.user.subscribe()) {
    switch (event.event) {
      case 'update': {
        const {
          content,
          account,
          reblog,
          mediaAttachments,
          ...restPayload
        } = event.payload

        const avatarResult = await fetch(account.avatar)
        const avatarArray = await avatarResult.bytes()
        const avatarType = avatarResult.headers['Content-Type'] ?? 'image/png'

        const reblogMediaAttachments = reblog ? await convertedMediaAttachments(reblog.mediaAttachments) : null
        const {
          account: reblogAccount,
          content: reblogContent,
          mediaAttachments: _,
          ...reblogRestPayload
        } = reblog ?? { content: null, account: null, mediaAttachments: [] }
        const reblogAvatarResult= reblog ? await fetch(reblog.account.avatar) : null
        const reblogAvatarArray = await reblogAvatarResult?.bytes()
        const reblogAvatarType = reblogAvatarResult ? reblogAvatarResult.headers['Content-Type'] ?? 'image/png' : null

        console.dir(event.payload)

        callback({
          body: sanitizeContent(content),
          account: {
            ...account,
            avatarArray,
            avatarType
          },
          reblog: reblogAccount && reblogContent && reblogAvatarArray && reblogAvatarType && reblogMediaAttachments ? {
            body: sanitizeContent(reblogContent),
            account: {
              ...reblogAccount,
              avatarArray: reblogAvatarArray,
              avatarType: reblogAvatarType
            },
            mediaAttachments: reblogMediaAttachments,
            ...reblogRestPayload
          } : undefined,
          mediaAttachments: await convertedMediaAttachments(mediaAttachments),
          ...restPayload
        })
        break
      }
      case 'delete':
      case 'notification':
      case 'filters_changed':
      case 'conversation':
      case 'announcement':
      case 'announcement.reaction':
      case 'announcement.delete':
      case 'status.update':
      case 'notifications_merged':
        break
    }
  }
}
