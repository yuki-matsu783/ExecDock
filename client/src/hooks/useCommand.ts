import { useCallback } from 'react';
import { useTerminal } from '../contexts/TerminalContext';

/**
 * コマンド実行を管理するカスタムフック
 * TerminalContextを通じてコマンドを送信します
 */
const useCommand = () => {
  const { executeCommand, isConnected } = useTerminal();

  /**
   * コマンドを実行します
   * @param command 実行するコマンド文字列
   */
  const runCommand = useCallback((command: string) => {
    executeCommand(command);
  }, [executeCommand]);

  return { 
    executeCommand: runCommand,
    isConnected
  };
};

export default useCommand;
