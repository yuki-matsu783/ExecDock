import * as os from 'os';
import * as nodePty from 'node-pty';

/**
 * ターミナル初期化オプション
 */
export interface TerminalOptions {
  /**
   * カラム数
   */
  cols?: number;
  /**
   * 行数
   */
  rows?: number;
  /**
   * 作業ディレクトリ
   */
  cwd?: string;
  /**
   * 環境変数
   */
  env?: Record<string, string>;
  /**
   * ログイン状態で起動するかどうか（Unix系のみ）
   */
  useLogin?: boolean;
}

/**
 * プラットフォームに適したシェルを選択
 * @returns シェル名とコマンドライン引数のペア
 */
export function getPlatformShell(): { shell: string; args: string[] } {
  // Windowsの場合はcmd.exe、それ以外はユーザーのシェルまたはデフォルトのシェルを使用
  const shell = os.platform() === 'win32' ? 'cmd.exe' : process.env.SHELL || 'zsh';
  
  // Windowsの場合は /K オプション、Unix系の場合はログインシェルとして -l オプションを指定
  const args = os.platform() === 'win32' ? ['/K'] : ['-l'];
  
  return { shell, args };
}

/**
 * PTYプロセスを初期化
 * @param options - 初期化オプション
 * @returns 初期化されたPTYインスタンス
 */
export function initializeTerminal(options?: TerminalOptions): nodePty.IPty {
  const { shell, args } = getPlatformShell();
  
  // デフォルトのオプション値を設定
  const defaultOptions: Required<TerminalOptions> = {
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
    env: process.env as Record<string, string>,
    useLogin: true
  };
  
  // オプションをマージ
  const mergedOptions = { ...defaultOptions, ...options };
  
  // ログインシェルオプションの処理
  const shellArgs = [...args];
  if (os.platform() !== 'win32' && !mergedOptions.useLogin) {
    // useLoginがfalseの場合、-lオプションを削除
    const loginIndex = shellArgs.indexOf('-l');
    if (loginIndex >= 0) {
      shellArgs.splice(loginIndex, 1);
    }
  }
  
  console.log(`Spawning PTY with shell: ${shell}`);
  
  // PTYプロセスを生成して返す
  return nodePty.spawn(shell, shellArgs, {
    name: os.platform() === 'win32' ? 'cmd' : 'xterm-color',
    cols: mergedOptions.cols,
    rows: mergedOptions.rows,
    cwd: mergedOptions.cwd,
    env: mergedOptions.env
  });
}

/**
 * ターミナルにコマンドを送信
 * @param pty - 対象のPTYインスタンス
 * @param command - 実行するコマンド
 */
export function executeCommand(pty: nodePty.IPty, command: string): void {
  if (!command.endsWith('\n')) {
    command += '\n';
  }
  pty.write(command);
}

/**
 * ターミナルをリサイズ
 * @param pty - 対象のPTYインスタンス
 * @param cols - カラム数
 * @param rows - 行数
 */
export function resizeTerminal(pty: nodePty.IPty, cols: number, rows: number): void {
  pty.resize(cols, rows);
}