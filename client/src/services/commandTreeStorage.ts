import { CommandTree, CommandTreeStorage, STORAGE_KEYS } from '../types/command';
import { parse, stringify } from 'yaml';
import defaultCommands from '../config/defaultCommands.yaml?raw';

/**
 * コマンドツリーのローカルストレージ管理
 */
export const commandTreeStorage: CommandTreeStorage = {
  /**
   * コマンドツリーを保存
   */
  saveTree: (tree: CommandTree) => {
    try {
      const yamlString = stringify(tree, { blockQuote: 'literal' });
      localStorage.setItem(STORAGE_KEYS.COMMAND_TREE, yamlString);
    } catch (error) {
      console.error('Failed to save command tree:', error);
    }
  },

  /**
   * コマンドツリーを読み込み
   */
  loadTree: (): CommandTree | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMMAND_TREE);
      if (!data) {
        // デフォルトコマンドを読み込み
        const defaultTree = parse(defaultCommands) as CommandTree;
        return defaultTree;
      }

      const tree = parse(data) as CommandTree;
      
      // バリデーション
      if (!tree.version || !Array.isArray(tree.commands)) {
        console.error('Invalid command tree format');
        return null;
      }

      return tree;
    } catch (error) {
      console.error('Failed to load command tree:', error);
      return null;
    }
  },

  /**
   * デフォルトコマンドを取得
   */
  getDefaultCommands: (): CommandTree => {
    return parse(defaultCommands) as CommandTree;
  },
};
