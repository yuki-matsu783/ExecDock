import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createServer } from 'http'
import { TerminalServer } from '../server/terminalServer'
import icon from '../../resources/icon.png?asset'

let terminalServer: TerminalServer | null = null

function createHttpServer(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    terminalServer = new TerminalServer(server)
    
    const port = 8999
    server.listen(port, () => {
      console.log(`WebSocket server started on port ${port}`)
      resolve(port)
    })
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
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

  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Start WebSocket server
  await createHttpServer()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (terminalServer) {
    terminalServer.close()
    terminalServer = null
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
