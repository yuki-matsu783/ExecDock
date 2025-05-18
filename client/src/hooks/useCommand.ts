import { useCallback } from 'react';

/**
 * コマンド実行を管理するカスタムフック
 * WebSocket接続を通じてコマンドを送信します
 */
const useCommand = (ws: WebSocket | null) => {
  /**
   * コマンドを実行します
   * @param command 実行するコマンド文字列
   */
  const executeCommand = useCallback((command: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket接続が確立されていません');
      return;
    }

    // コマンドの最後に改行を追加して送信
    ws.send(JSON.stringify({ input: command + '\n' }));
  }, [ws]);

  return { executeCommand };
};

export default useCommand;
