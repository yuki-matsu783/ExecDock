/**
 * コマンドの定義
 */
export interface Command {
  /** コマンドの一意な識別子 */
  id: string;
  /** ボタンに表示するラベル */
  label: string;
  /** 実行するコマンド文字列 */
  command: string;
  /** コマンドの説明（ツールチップに表示） */
  description?: string;
  /** コマンドのカテゴリ */
  category?: string;
}

/**
 * コマンドボタンのプロパティ
 */
export interface CommandButtonProps {
  /** コマンドの定義 */
  command: Command;
  /** クリック時の処理 */
  onClick: (command: string) => void;
}

/**
 * コマンドパネルのプロパティ
 */
export interface CommandPanelProps {
  /** コマンドのリスト */
  commands: Command[];
  /** コマンド実行時の処理 */
  onExecute: (command: string) => void;
}
