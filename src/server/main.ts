import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import * as nodePty from 'node-pty';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// ランタイムの種類
enum RuntimeType {
  NODE = 'node',
  PYTHON = 'python3'
}

// ランタイムパスのキャッシュ
const runtimePathCache: Record<string, string | null> = {};

/**
 * 実行可能ファイルが存在し、実行権限があるかチェックする
 * @param filePath - チェックするファイルパス
 * @returns 実行可能な場合はtrue
 */
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * システムにインストールされたコマンドのパスを取得する
 * @param command - コマンド名
 * @returns コマンドの絶対パス、存在しない場合はnull
 */
async function getSystemCommandPath(command: string): Promise<string | null> {
  try {
    // Unix系OSの場合はwhich、Windowsの場合はwhereコマンドを使用
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execPromise(`${whichCmd} ${command}`);
    const commandPath = stdout.trim().split('\n')[0];
    
    // 空でなく、実行可能ファイルが存在する場合
    if (commandPath && await isExecutable(commandPath)) {
      return commandPath;
    }
    return null;
  } catch {
    return null; // コマンドが見つからなかった場合
  }
}

/**
 * アプリケーションにバンドルされたランタイムへのパスを取得
 * @param type - ランタイムの種類
 * @returns バンドルされたランタイムパス、存在しない場合はnull
 */
function getBundledRuntimePath(type: RuntimeType): string | null {
  let platform: string;
  let arch: string;
  let extension = '';

  // プラットフォームとアーキテクチャを特定
  switch (process.platform) {
    case 'win32':
      platform = 'windows';
      extension = '.exe';
      break;
    case 'darwin':
      platform = 'mac';
      break;
    case 'linux':
      platform = 'linux';
      break;
    default:
      return null; // サポートされていないプラットフォーム
  }

  // アーキテクチャを特定
  switch (process.arch) {
    case 'x64':
      arch = 'x64';
      break;
    case 'arm64':
      arch = 'arm64';
      break;
    default:
      return null; // サポートされていないアーキテクチャ
  }

  // 実行可能ファイルへのパスを構築
  // Web版の場合はプロジェクトルートからの相対パスを使用
  const resourcesPath = path.join(__dirname, '../../../resources/runtimes');

  const runtimePath = path.join(
    resourcesPath,
    type,
    `${platform}-${arch}`,
    `${type}${extension}`
  );

  try {
    // ファイルが存在し、実行可能かチェック
    fs.accessSync(runtimePath, fs.constants.X_OK);
    return runtimePath;
  } catch {
    return null;
  }
}

/**
 * ランタイムのパスを解決する
 * システムにインストールされたものを優先し、なければバンドルされたものを使用
 * @param type - ランタイムの種類
 * @returns 利用可能なランタイムへのパス、見つからなければnull
 */
async function resolveRuntimePath(type: RuntimeType): Promise<string | null> {
  // キャッシュにあれば、それを返す
  const cacheKey = type.toString();
  if (cacheKey in runtimePathCache) {
    return runtimePathCache[cacheKey];
  }

  // システムにインストールされたコマンドを優先
  const systemPath = await getSystemCommandPath(type);
  if (systemPath) {
    runtimePathCache[cacheKey] = systemPath;
    return systemPath;
  }

  // システムにインストールされていなければバンドルされたものを使用
  const bundledPath = getBundledRuntimePath(type);
  runtimePathCache[cacheKey] = bundledPath;
  return bundledPath;
}

// 特定のランタイムでコマンドを実行する
async function executeWithRuntime(pty: nodePty.IPty, type: RuntimeType, args: string): Promise<void> {
  const runtimePath = await resolveRuntimePath(type);
  
  if (runtimePath) {
    // ランタイムが見つかった場合、それを使用してコマンドを実行
    const command = `${runtimePath} ${args}`;
    pty.write(command + '\n');
  } else {
    // ランタイムが見つからなかった場合、エラーメッセージを表示
    pty.write(`Error: ${type} runtime not found. Please install ${type} or check your PATH.\n`);
  }
}

// ExpressアプリケーションとHTTPサーバーの初期化
const app = express();
const server = new http.Server(app);

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
  // 新しいPTY(疑似端末)プロセスを生成
  // OSに応じて適切なシェルを選択 (Windowsならcmd.exe、それ以外はzsh)
  const shell = process.platform === 'win32' ? 'cmd.exe' : 'zsh';
  const shellArgs = process.platform === 'win32' ? ['/K'] : [];
  
  console.log(`Using shell: ${shell} for platform: ${process.platform}`);
  
  let pty = nodePty.spawn(shell, shellArgs, {
    name: process.platform === 'win32' ? 'cmd' : 'xterm-color',  // ターミナルタイプ
    cols: 80,            // 初期カラム数
    rows: 24,            // 初期行数
    cwd: process.env.HOME as string,  // ホームディレクトリを作業ディレクトリに設定
    // env: process.env,  // 環境変数の継承(コメントアウト)
  });

  // PTYからの出力データをWebSocketクライアントに送信
  pty.onData((data) => {
    // console.log("send: %s", data);  // デバッグ用ログ(コメントアウト)
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
      await executeWithRuntime(pty, RuntimeType.NODE, m.node);
    }
    // Pythonコマンドの実行要求
    else if (m.python) {
      await executeWithRuntime(pty, RuntimeType.PYTHON, m.python);
    }
    // ランタイムの利用可否チェック要求
    else if (m.checkRuntime) {
      const runtimeType = m.checkRuntime === 'node' ? RuntimeType.NODE : RuntimeType.PYTHON;
      const runtimePath = await resolveRuntimePath(runtimeType);
      ws.send(JSON.stringify({ 
        runtimeAvailable: { 
          type: m.checkRuntime, 
          available: runtimePath !== null 
        }
      }));
    }
  });
});

// サーバーを指定ポート(環境変数PORTまたはデフォルト8999)で起動
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on ${JSON.stringify(server.address())} :)`);
});
