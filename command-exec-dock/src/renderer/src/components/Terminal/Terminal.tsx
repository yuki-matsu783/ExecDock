import { useEffect, useRef } from 'react';
import { useTerminal } from '../../contexts/TerminalContext';
import './Terminal.css';

/**
 * ターミナルコンポーネント
 * xterm.jsを使用してターミナル機能を提供します
 * コンテナ要素の提供と表示のみを担当し、すべてのロジックはContextに委譲します
 */
const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { initializeTerminal, isInitialized } = useTerminal();

  // マウント時にコンテナ要素を渡すだけのシンプルな実装
  useEffect(() => {
    if (terminalRef.current) {
      initializeTerminal(terminalRef.current);
    }
  }, [initializeTerminal]);

  return (
    <div className="terminal-container" ref={terminalRef} data-initialized={isInitialized}>
      {!isInitialized && (
        <div className="terminal-loading">
          <p>ターミナルを初期化中...</p>
        </div>
      )}
    </div>
  );
};

export default Terminal;