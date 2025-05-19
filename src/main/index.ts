import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as nodePty from 'node-pty'
import { RuntimeType, executeWithRuntime, isRuntimeAvailable } from '../shared/runtime'
import { initializeTerminal } from '../shared/terminal'
import * as fs from 'fs/promises'
import * as path from 'path'

// Terminal process reference
let ptyProcess: nodePty.IPty | null = null

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
  
  // Initialize PTY process and set up communication
  if (!ptyProcess) {
    // 共通のターミナル初期化関数を使用
    ptyProcess = initializeTerminal({
      cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
      env: process.env as Record<string, string>
    })
    
    // Forward PTY output to renderer process - similar to server implementation
    ptyProcess.onData((data) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', data)
      }
    })
    
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`PTY process exited with code ${exitCode}`)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', `\r\nProcess exited with code ${exitCode}\r\n`)
      }
      // Restart the PTY process if window is still open
      if (!mainWindow.isDestroyed()) {
        // 共通のターミナル初期化関数を使用して再起動
        ptyProcess = initializeTerminal({
          cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
          env: process.env as Record<string, string>
        })
        
        // Set up event handler for new PTY
        ptyProcess.onData((data) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:data', data)
          }
        })
      }
    })
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
  
  // Terminal IPC handlers - similar to server WebSocket handlers
  ipcMain.on('terminal:write', (_event, data) => {
    if (ptyProcess) {
      ptyProcess.write(data)
    }
  })
  
  ipcMain.on('terminal:execute', (_event, command) => {
    if (ptyProcess) {
      // Add newline if not present
      if (!command.endsWith('\n')) {
        command += '\n'
      }
      ptyProcess.write(command)
    }
  })
  
  // 特定のランタイムでコマンド実行するハンドラ
  ipcMain.handle('runtime:node', async (_event, args) => {
    if (ptyProcess) {
      // 共通のランタイム実行関数を使用
      await executeWithRuntime(ptyProcess, RuntimeType.NODE, args, true, app.getAppPath())
    }
    return true
  })

  ipcMain.handle('runtime:python', async (_event, args) => {
    if (ptyProcess) {
      // 共通のランタイム実行関数を使用
      await executeWithRuntime(ptyProcess, RuntimeType.PYTHON, args, true, app.getAppPath())
    }
    return true
  })
  
  // ランタイム利用可能性をチェックするハンドラ
  ipcMain.handle('runtime:check', async (_event, type) => {
    const runtimeType = type === 'node' ? RuntimeType.NODE : RuntimeType.PYTHON
    // 共通のランタイム確認関数を使用
    return await isRuntimeAvailable(runtimeType, true, app.getAppPath())
  })
  
  ipcMain.on('terminal:resize', (_event, { cols, rows }) => {
    if (ptyProcess) {
      ptyProcess.resize(cols, rows)
    }
  })

  // ファイルシステム操作のIPC処理を追加
  
  // 現在のディレクトリを取得
  ipcMain.handle('fileSystem:getCurrentDirectory', async () => {
    try {
      if (ptyProcess) {
        // PTYプロセスの現在のディレクトリを取得
        // ここではmacOS/Linux/Windows間の互換性を考慮
        const command = process.platform === 'win32' ? 'echo %cd%' : 'pwd';
        
        return new Promise<string>(resolve => {
          // 一時的なデータハンドラを作成
          const dataHandler = (data: string) => {
            // 改行を削除してパスを取得
            const path = data.trim();
            // ハンドラを削除
            ptyProcess?.removeAllListeners('data');
            // ハンドラを再設定
            setupDefaultDataHandler();
            // 結果を返す
            resolve(path);
          };
          
          // 既存のデータハンドラを保存し、一時的なハンドラを設定
          const setupDefaultDataHandler = () => {
            ptyProcess?.onData((data) => {
              BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                  win.webContents.send('terminal:data', data);
                }
              });
            });
          };
          
          // 既存のハンドラをクリア
          ptyProcess?.removeAllListeners('data');
          
          // 一時的なハンドラを設定
          ptyProcess?.onData(dataHandler);
          
          // コマンドを実行
          ptyProcess?.write(`${command}\n`);
          
          // タイムアウト処理（5秒後）
          setTimeout(() => {
            ptyProcess?.removeAllListeners('data');
            setupDefaultDataHandler();
            resolve(process.env.HOME || process.env.USERPROFILE || process.cwd());
          }, 5000);
        });
      } else {
        return process.env.HOME || process.env.USERPROFILE || process.cwd();
      }
    } catch (error) {
      console.error('Failed to get current directory:', error);
      return process.env.HOME || process.env.USERPROFILE || process.cwd();
    }
  });
  
  // ディレクトリ内のファイル一覧を取得
  ipcMain.handle('fileSystem:listDirectory', async (_event, dirPath) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      return files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(dirPath, file.name)
      }));
    } catch (error) {
      console.error(`Failed to list directory ${dirPath}:`, error);
      return [];
    }
  });
  
  // ファイル内容を読み込む
  ipcMain.handle('fileSystem:readFile', async (_event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  });
  
  // ファイル内容を書き込む
  ipcMain.handle('fileSystem:writeFile', async (_event, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
      throw error;
    }
  });
  
  // ファイル・ディレクトリ存在確認
  ipcMain.handle('fileSystem:exists', async (_event, path) => {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  });

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
  // Close PTY process if it exists
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// このファイルでは、アプリ固有のメインプロセスコードの残りの部分を
// 含めることができます。別のファイルに入れて、ここで要求することもできます。
