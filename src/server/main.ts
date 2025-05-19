import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { RuntimeType, executeWithRuntime, resolveRuntimePath } from '../shared/runtime';
import { initializeTerminal } from '../shared/terminal';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// ExpressアプリケーションとHTTPサーバーの初期化
const app = express();
const server = new http.Server(app);

// Promisify exec
const execAsync = promisify(exec);

// 静的ファイル配信ディレクトリの設定
// 開発環境と本番環境で異なるディレクトリを使用
let staticDir = 'dist/client' // 本番環境用
if (process.env.NODE_ENV === "development") {
  staticDir = ".cache/dist/client"; // 開発環境用
}

// ルートパスに静的ファイル配信ミドルウェアを設定
app.use("/", express.static(staticDir));
const wss = new WebSocket.Server({ server });

// WebSocket接続時のイベントハンドラ
wss.on("connection", (ws) => {
  // 新しいPTY(疑似端末)プロセスを生成 - 共通の初期化関数を使用
  const pty = initializeTerminal({
    cwd: process.env.HOME as string,  // ホームディレクトリを作業ディレクトリに設定
  });
  
  // PTYからの出力データをWebSocketクライアントに送信
  pty.onData((data) => {
    ws.send(JSON.stringify({ output: data }));
  });

  // WebSocketクライアントからのメッセージ処理
  ws.on("message", async (message) => {
    console.log("received: %s", message);  // 受信メッセージのログ
    const m = JSON.parse(message.toString());

    // 入力データの場合、PTYに書き込み
    if (m.input) {
      pty.write(m.input);
    } 
    // リサイズ要求の場合、PTYのサイズを変更
    else if (m.resize) {
      pty.resize(m.resize[0], m.resize[1]);
    }
    // Node.jsコマンドの実行要求
    else if (m.node) {
      // 共通のランタイム実行関数を使用
      await executeWithRuntime(pty, RuntimeType.NODE, m.node, false);
    }
    // Pythonコマンドの実行要求
    else if (m.python) {
      // 共通のランタイム実行関数を使用
      await executeWithRuntime(pty, RuntimeType.PYTHON, m.python, false);
    }
    // ランタイムの利用可否チェック要求
    else if (m.checkRuntime) {
      const runtimeType = m.checkRuntime === 'node' ? RuntimeType.NODE : RuntimeType.PYTHON;
      const runtimePath = await resolveRuntimePath(runtimeType, false);
      ws.send(JSON.stringify({ 
        runtimeAvailable: { 
          type: m.checkRuntime, 
          available: runtimePath !== null 
        }
      }));
    }
    // ファイルシステム操作の処理
    // 現在のディレクトリを取得
    else if (m.fileSystem && m.fileSystem.getCurrentDirectory) {
      try {
        // ターミナルの現在のディレクトリを取得
        const { stdout } = await execAsync('pwd');
        const currentDirectory = stdout.trim();
        
        ws.send(JSON.stringify({
          fileSystem: {
            currentDirectory
          }
        }));
      } catch (error) {
        console.error('Failed to get current directory:', error);
        ws.send(JSON.stringify({
          fileSystem: {
            error: 'Failed to get current directory'
          }
        }));
      }
    }
    // ディレクトリの内容を取得
    else if (m.fileSystem && m.fileSystem.listDirectory) {
      try {
        const dirPath = m.fileSystem.listDirectory;
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        
        const fileList = files.map(file => ({
          name: file.name,
          isDirectory: file.isDirectory(),
          path: path.join(dirPath, file.name)
        }));
        
        ws.send(JSON.stringify({
          fileSystem: {
            directoryContents: fileList
          }
        }));
      } catch (error) {
        console.error(`Failed to list directory: ${error}`);
        ws.send(JSON.stringify({
          fileSystem: {
            error: `Failed to list directory: ${error.message}`
          }
        }));
      }
    }
    // ファイル内容を読み込む
    else if (m.fileSystem && m.fileSystem.readFile) {
      try {
        const filePath = m.fileSystem.readFile;
        const content = await fs.readFile(filePath, 'utf8');
        
        ws.send(JSON.stringify({
          fileSystem: {
            fileContent: content
          }
        }));
      } catch (error) {
        console.error(`Failed to read file: ${error}`);
        ws.send(JSON.stringify({
          fileSystem: {
            error: `Failed to read file: ${error.message}`
          }
        }));
      }
    }
    // ファイル内容を書き込む
    else if (m.fileSystem && m.fileSystem.writeFile) {
      try {
        const { path: filePath, content } = m.fileSystem.writeFile;
        await fs.writeFile(filePath, content, 'utf8');
        
        ws.send(JSON.stringify({
          fileSystem: {
            writeSuccess: true
          }
        }));
      } catch (error) {
        console.error(`Failed to write file: ${error}`);
        ws.send(JSON.stringify({
          fileSystem: {
            error: `Failed to write file: ${error.message}`
          }
        }));
      }
    }
    // ファイル/ディレクトリの存在を確認
    else if (m.fileSystem && m.fileSystem.exists) {
      try {
        const filePath = m.fileSystem.exists;
        try {
          await fs.access(filePath);
          ws.send(JSON.stringify({
            fileSystem: {
              exists: true
            }
          }));
        } catch {
          ws.send(JSON.stringify({
            fileSystem: {
              exists: false
            }
          }));
        }
      } catch (error) {
        console.error(`Error checking file existence: ${error}`);
        ws.send(JSON.stringify({
          fileSystem: {
            error: `Error checking file existence: ${error.message}`
          }
        }));
      }
    }
  });
  
  // WebSocketが閉じられたときの処理
  ws.on('close', () => {
    // 接続が終了したらPTYプロセスも終了
    try {
      pty.kill();
    } catch (err) {
      console.error('Failed to kill PTY process:', err);
    }
  });
});

// サーバーを指定ポート(環境変数PORTまたはデフォルト8999)で起動
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on ${JSON.stringify(server.address())} :)`);
});
