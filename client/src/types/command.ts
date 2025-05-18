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
}

/**
 * コマンドツリーの定義
 * JSONでインポート/エクスポート可能な形式
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
