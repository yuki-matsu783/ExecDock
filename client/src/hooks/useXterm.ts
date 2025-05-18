import { useEffect } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import '@xterm/xterm/css/xterm.css';

/**
 * xterm.jsの初期化と管理を行うカスタムフック
 * 
 * このフックは以下の機能を提供します：
 * - xtermインスタンスの作成と初期化
 * - 各種アドオン（Fit, Search, WebLinks, Unicode11, Serialize）の設定
 * - WebSocketを通じたサーバーとの双方向通信の確立
 * - ターミナルのリサイズ処理
 * - クリーンアップ処理（終了時のリソース解放）
 * 
 * @param containerRef ターミナルを表示するDOM要素のref
 * @returns {Object} ターミナルインスタンスと各種アドオン
 */
const useXterm = (containerRef: React.RefObject<HTMLDivElement>) => {
  const terminal = useTerminal();
  
  useEffect(() => {
    // コンテナ要素が存在する場合、ターミナルを初期化
    if (containerRef.current) {
      terminal.initializeTerminal(containerRef.current);
    }
  }, [containerRef, terminal]);

  return terminal;
};

export default useXterm;
