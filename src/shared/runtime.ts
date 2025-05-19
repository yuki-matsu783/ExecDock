import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import * as nodePty from 'node-pty';

const execPromise = util.promisify(exec);

/**
 * ランタイムの種類
 */
export enum RuntimeType {
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
export async function isExecutable(filePath: string): Promise<boolean> {
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
export async function getSystemCommandPath(command: string): Promise<string | null> {
  try {
    // Unix系OSの場合はwhich、Windowsの場合はwhereコマンドを使用
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execPromise(`${whichCmd} ${command}`);
    // WindowsとUnixで出力形式が異なる場合があるため、最初の行のみを使用
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
 * Electron版とWeb版で異なるパス解決を行う
 * @param type - ランタイムの種類
 * @param isElectron - Electron環境かどうか
 * @param appPath - Electron環境の場合のアプリパス（app.getAppPath()の結果）
 * @returns バンドルされたランタイムパス、存在しない場合はnull
 */
export function getBundledRuntimePath(
  type: RuntimeType, 
  isElectron: boolean = false,
  appPath?: string
): string | null {
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
  // Electron版とWeb版で異なるパス解決を行う
  let resourcesPath: string;
  
  if (isElectron && appPath) {
    // Electron環境の場合
    resourcesPath = path.join(appPath, 'resources', 'runtimes');
  } else {
    // Web版の場合はプロジェクトルートからの相対パス
    resourcesPath = path.join(__dirname, '../../../resources/runtimes');
  }

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
 * @param isElectron - Electron環境かどうか
 * @param appPath - Electron環境の場合のアプリパス
 * @returns 利用可能なランタイムへのパス、見つからなければnull
 */
export async function resolveRuntimePath(
  type: RuntimeType,
  isElectron: boolean = false,
  appPath?: string
): Promise<string | null> {
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
  const bundledPath = getBundledRuntimePath(type, isElectron, appPath);
  runtimePathCache[cacheKey] = bundledPath;
  return bundledPath;
}

/**
 * 特定のランタイムでコマンドを実行する
 * @param pty - PTYインスタンス
 * @param type - ランタイムの種類
 * @param args - ランタイムに渡す引数
 * @param isElectron - Electron環境かどうか
 * @param appPath - Electron環境の場合のアプリパス
 */
export async function executeWithRuntime(
  pty: nodePty.IPty,
  type: RuntimeType,
  args: string,
  isElectron: boolean = false,
  appPath?: string
): Promise<void> {
  const runtimePath = await resolveRuntimePath(type, isElectron, appPath);
  
  if (runtimePath) {
    // ランタイムが見つかった場合、それを使用してコマンドを実行
    const command = `${runtimePath} ${args}`;
    pty.write(command + '\n');
  } else {
    // ランタイムが見つからなかった場合、エラーメッセージを表示
    pty.write(`Error: ${type} runtime not found. Please install ${type} or check your PATH.\n`);
  }
}

/**
 * ランタイムが利用可能かどうかをチェック
 * @param type - ランタイムの種類
 * @param isElectron - Electron環境かどうか
 * @param appPath - Electron環境の場合のアプリパス
 * @returns ランタイムが利用可能な場合はtrue
 */
export async function isRuntimeAvailable(
  type: RuntimeType,
  isElectron: boolean = false,
  appPath?: string
): Promise<boolean> {
  const path = await resolveRuntimePath(type, isElectron, appPath);
  return path !== null;
}

/**
 * ランタイムのキャッシュをクリア
 */
export function clearRuntimeCache(): void {
  for (const key in runtimePathCache) {
    delete runtimePathCache[key];
  }
}