import { CommandTree, CommandTreeStorage, STORAGE_KEYS } from '../types/command';

/**
 * コマンドツリーのローカルストレージ管理
 */
export const commandTreeStorage: CommandTreeStorage = {
  /**
   * コマンドツリーを保存
   */
  saveTree: (tree: CommandTree) => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMAND_TREE, JSON.stringify(tree));
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
      if (!data) return null;

      const tree = JSON.parse(data) as CommandTree;
      
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
};
