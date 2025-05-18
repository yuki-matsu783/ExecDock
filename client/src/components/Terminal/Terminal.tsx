import { useEffect, useRef } from 'react';
import useXterm from '../../hooks/useXterm';
import './Terminal.css';

/**
 * ターミナルコンポーネント
 * xterm.jsを使用してターミナル機能を提供します
 */
const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { term, fitAddon } = useXterm(terminalRef);

  // コンポーネントのマウント時にターミナルをフィット
  useEffect(() => {
    if (fitAddon) {
      fitAddon.fit();
    }
  }, [fitAddon]);

  return (
    <div className="terminal-container" ref={terminalRef} />
  );
};

export default Terminal;
