import { useEffect, useRef, useState } from 'react';
import { useTerminal } from '../../contexts/TerminalContext';
import './Terminal.css';

/**
 * ターミナルコンポーネント
 * xterm.jsを使用してターミナル機能を提供します
 */
const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isTerminalMounted, setIsTerminalMounted] = useState(false);
  const { initializeTerminal, fitAddon, isConnected, isInitialized } = useTerminal();

  // コンポーネントがマウントされたことを確認してからターミナルを初期化
  useEffect(() => {
    if (terminalRef.current && !isTerminalMounted) {
      console.log('Terminal component: DOM mounted, ready to initialize terminal');
      // DOMが完全にレンダリングされるのを待つ
      setTimeout(() => {
        setIsTerminalMounted(true);
      }, 100);
    }
  }, []);

  // ターミナルを初期化
  useEffect(() => {
    if (terminalRef.current && isTerminalMounted && !isInitialized) {
      console.log('Terminal component: initializing terminal');
      initializeTerminal(terminalRef.current);
    }
  }, [initializeTerminal, isTerminalMounted, isInitialized]);

  // ターミナルがリサイズされたときの処理
  useEffect(() => {
    const handleWindowResize = () => {
      if (fitAddon && isInitialized) {
        console.log('Window resize detected, fitting terminal');
        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch (e) {
            console.error('Error fitting terminal on resize:', e);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [fitAddon, isInitialized]);

  // 接続状態が変わったとき、初期化状態が変わったときにサイズを調整
  useEffect(() => {
    if (fitAddon && isInitialized) {
      console.log('Terminal component: connection or initialization state changed, fitting terminal');
      
      const fitTerminal = () => {
        try {
          fitAddon.fit();
          console.log('Terminal fitted successfully');
        } catch (e) {
          console.error('Error fitting terminal:', e);
        }
      };

      // 複数のタイミングでフィットを試行
      fitTerminal();
      
      const timer1 = setTimeout(fitTerminal, 1000);
      
      return () => {
        clearTimeout(timer1);
      };
    }
  }, [fitAddon, isConnected, isInitialized]);

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
