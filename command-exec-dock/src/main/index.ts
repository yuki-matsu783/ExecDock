import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // ブラウザウィンドウを作成
  const mainWindow = new BrowserWindow({
    width: 1200, // 横幅を拡大
    height: 800, // 高さを拡大
    minWidth: 800, // 最小サイズを設定
    minHeight: 600,
    show: false,
    autoHideMenuBar: false, // メニューバーを表示
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // ウィンドウが準備できたら表示
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 外部リンクをデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // デベロッパーツールを開発環境でデフォルトで開く
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }

  // 開発時はリモートURLを、本番環境ではローカルのHTMLファイルをロード
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Electronの初期化が完了し、ブラウザウィンドウを作成する準備ができたらこのメソッドが呼ばれる
app.whenReady().then(() => {
  // アプリのユーザーモデルIDを設定
  electronApp.setAppUserModelId('com.electron')

  // 開発環境ではF12でDevToolsを開けるように設定
  // 本番環境ではCommand/Control + Rを無視するように設定
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPCテスト用
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // macOSでは、Dockアイコンがクリックされ、他のウィンドウが開いていない場合、
    // アプリケーションでウィンドウを再作成するのが一般的です
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// すべてのウィンドウが閉じられたときにアプリケーションを終了します（Windows & Linux）
// macOSでは、ユーザーがCmd + Qで明示的に終了するまで、
// アプリケーションとそのメニューバーがアクティブなままになるのが一般的です
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// このファイルでは、アプリ固有のメインプロセスコードの残りの部分を
// 含めることができます。別のファイルに入れて、ここで要求することもできます。
