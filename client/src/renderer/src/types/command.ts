/**
 * コマンド実行タイプ
 */
export enum ExecutionType {
  /** 即時実行（改行付きで実行） */
  IMMEDIATE = 'immediate',
  /** 入力待ち（ユーザー入力後に実行） */
  INPUT_REQUIRED = 'input_required'
}

/**
 * コマンドノードの定義
 * 階層構造を持つコマンドツリーのノードを表現
 */
export interface CommandNode {
  /** ノードの一意な識別子 */
  id: string;
  /** 表示するラベル */
  label: string;
  /** 実行するコマンド文字列（末端ノードのみ） */
  command?: string;
  /** コマンドの説明（ツールチップに表示） */
  description?: string;
  /** 子ノード（サブコマンド・カテゴリ） */
  children?: CommandNode[];
  /** お気に入り順序（設定時は1から始まる整数） */
  favorite?: number;
  /** コマンドの実行タイプ */
  executionType?: ExecutionType;
}

/**
 * ローカルストレージのキー定義
 */
export const STORAGE_KEYS = {
  COMMAND_TREE: 'command-tree',
} as const;

/**
 * コマンドツリーのストレージ管理
 */
export interface CommandTreeStorage {
  /** コマンドツリーの保存 */
  saveTree: (tree: CommandTree) => void;
  /** コマンドツリーの読み込み */
  loadTree: () => CommandTree | null;
  /** デフォルトコマンドの取得 */
  getDefaultCommands: () => CommandTree;
}

/**
 * コマンドツリーの定義
 * YAMLでインポート/エクスポート可能な形式
 */
export interface CommandTree {
  /** データ形式のバージョン */
  version: string;
  /** ルートレベルのコマンド */
  commands: CommandNode[];
}

/**
 * コマンドボタンのプロパティ
 */
export interface CommandButtonProps {
  /** コマンドの定義 */
  command: CommandNode;
  /** クリック時の処理 */
  onClick: (command: string) => void;
}

/**
 * コマンドパネルのプロパティ
 */
export interface CommandPanelProps {
  /** コマンドツリー */
  commandTree: CommandTree;
  /** コマンドツリー更新時の処理 */
  onUpdate: (newTree: CommandTree) => void;
}

/**
 * YAMLテキストをCommandTreeとして型安全に扱うための型ガード
 */
export const isCommandTree = (data: unknown): data is CommandTree => {
  if (typeof data !== 'object' || data === null) return false;
  const tree = data as CommandTree;
  return typeof tree.version === 'string' && Array.isArray(tree.commands);
};