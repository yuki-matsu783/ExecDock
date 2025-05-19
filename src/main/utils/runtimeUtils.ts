import { app } from 'electron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * ランタイムの種類
 */
export enum RuntimeType {
  NODE = 'node',
  PYTHON = 'python3'
}

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
    const commandPath = stdout.trim();
    
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
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'runtimes')
    : path.join(app.getAppPath(), 'resources', 'runtimes');

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
export async function resolveRuntimePath(type: RuntimeType): Promise<string | null> {
  // システムにインストールされたコマンドを優先
  const systemPath = await getSystemCommandPath(type);
  if (systemPath) {
    return systemPath;
  }

  // システムにインストールされていなければバンドルされたものを使用
  return getBundledRuntimePath(type);
}

/**
 * 指定されたランタイムが利用可能かチェックする
 * @param type - ランタイムの種類
 * @returns 利用可能な場合はtrue
 */
export async function isRuntimeAvailable(type: RuntimeType): Promise<boolean> {
  const runtimePath = await resolveRuntimePath(type);
  return runtimePath !== null;
}