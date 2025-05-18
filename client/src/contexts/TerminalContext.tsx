import React, { createContext, useContext, useRef, useState, useEffect, ReactNode, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

// ターミナルコンテキストの型定義
interface TerminalContextType {
  term: Terminal | null;
  fitAddon: FitAddon | null;
  searchAddon: SearchAddon | null;
  webLinksAddon: WebLinksAddon | null;
  unicode11Addon: Unicode11Addon | null;
  serializeAddon: SerializeAddon | null;
  ws: WebSocket | null;
  executeCommand: (command: string) => void;
  isConnected: boolean;
  isInitialized: boolean;
  initializeTerminal: (container: HTMLDivElement) => void;
}

// コンテキストの初期値
const initialContext: TerminalContextType = {
  term: null,
  fitAddon: null,
  searchAddon: null,
  webLinksAddon: null,
  unicode11Addon: null,
  serializeAddon: null,
  ws: null,
  executeCommand: () => {},
  isConnected: false,
  isInitialized: false,
  initializeTerminal: () => {},
};

// ターミナルコンテキストの作成
export const TerminalContext = createContext<TerminalContextType>(initialContext);

// プロバイダーのプロパティ型
interface TerminalProviderProps {
  children: ReactNode;
}

// WebSocketサーバーのURLを設定
const getWebSocketUrl = () => {
  // 開発環境ではlocalhostを使用、本番環境では現在のホスト名を使用
  const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  return `ws://${hostname}:8999`;
};

// 最大再接続回数
const MAX_RECONNECT_ATTEMPTS = 5;

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const termRef = useRef<Terminal | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const webLinksAddonRef = useRef<WebLinksAddon | null>(null);
  const unicode11AddonRef = useRef<Unicode11Addon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mounted = useRef(true);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);

  // コンポーネントのアンマウント時にフラグをリセット
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ターミナルの初期化処理
  const setupTerminal = useCallback((container: HTMLDivElement) => {
    if (!container || !mounted.current) return null;

    try {
      console.log('Initializing terminal...');

      // ターミナルの初期化
      const term = new Terminal({
        cols: 80,
        rows: 24,
        allowProposedApi: true,
        fontFamily: 'monospace',
        fontSize: 14,
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#ffffff',
          selection: 'rgba(255, 255, 255, 0.3)',
        }
      });

      // アドオンの初期化
      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon();
      const unicode11Addon = new Unicode11Addon();
      const serializeAddon = new SerializeAddon();

      // アドオンの読み込み
      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(unicode11Addon);
      term.loadAddon(serializeAddon);

      // ターミナルをDOMに表示
      console.log('Opening terminal in container...');
      term.open(container);
      
      // ウィンドウがリサイズされたときの処理
      const handleResize = () => {
        if (!mounted.current) return;
        
        try {
          if (fitAddon) {
            fitAddon.fit();
          }
        } catch (e) {
          console.error('Error resizing terminal:', e);
        }
      };

      window.addEventListener('resize', handleResize);

      // スタイル調整のため少し遅延してfit
      setTimeout(() => {
        if (!mounted.current) return;
        
        try {
          fitAddon.fit();
          console.log('Terminal fitted successfully');
        } catch (e) {
          console.error('Error fitting terminal:', e);
        }
      }, 100);

      return { 
        term, 
        fitAddon, 
        searchAddon, 
        webLinksAddon, 
        unicode11Addon, 
        serializeAddon, 
        cleanup: () => {
          window.removeEventListener('resize', handleResize);
          term.dispose();
        } 
      };
    } catch (err) {
      console.error('Failed to initialize terminal:', err);
      return null;
    }
  }, []);

  // WebSocketの接続を確立する関数
  const connectWebSocket = useCallback((term: Terminal | null = null) => {
    if (!mounted.current) return null;

    try {
      // 既存の接続があれば閉じる
      if (wsRef.current) {
        console.log('Closing existing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log('Connecting to WebSocket server...');
      const ws = new WebSocket(getWebSocketUrl());
      
      // 接続が確立したときの処理
      ws.addEventListener('open', () => {
        if (!mounted.current) return;
        
        console.info('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // ターミナルが初期化済みの場合、サイズ情報を送信
        if (term || termRef.current) {
          const terminal = term || termRef.current;
          if (terminal) {
            console.log(`Sending initial terminal size: ${terminal.cols}x${terminal.rows}`);
            ws.send(JSON.stringify({ resizer: [terminal.cols, terminal.rows] }));
          }
        }
      });

      // サーバーからメッセージを受信したときの処理
      ws.addEventListener('message', (event) => {
        if (!mounted.current) return;
        
        try {
          const currentTerm = termRef.current;
          if (!currentTerm) return;
          
          const output = JSON.parse(event.data);
          if (output.output) {
            currentTerm.write(output.output);
          }
        } catch (e) {
          console.error('Error processing message:', e);
        }
      });

      // エラー処理
      ws.addEventListener('error', (error) => {
        if (!mounted.current) return;
        console.error('WebSocket error:', error);
      });

      // 接続が閉じられたときの再接続処理
      ws.addEventListener('close', () => {
        if (!mounted.current) return;
        
        console.warn('WebSocket connection closed');
        setIsConnected(false);
        
        // 再接続を試みる
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        if (mounted.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted.current) {
              connectWebSocket();
            }
          }, delay);
        } else if (mounted.current) {
          console.error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts.`);
        }
      });

      wsRef.current = ws;
      return ws;
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      return null;
    }
  }, []);

  // ターミナル初期化関数
  const initializeTerminal = useCallback((container: HTMLDivElement) => {
    if (!container || termRef.current || !mounted.current) return;
    containerRef.current = container;

    try {
      // 先にターミナルをセットアップ
      const terminalSetup = setupTerminal(container);
      if (!terminalSetup) {
        console.error('Failed to setup terminal');
        return;
      }

      const { term, fitAddon, searchAddon, webLinksAddon, unicode11Addon, serializeAddon, cleanup } = terminalSetup;

      // インスタンスを保存
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;
      webLinksAddonRef.current = webLinksAddon;
      unicode11AddonRef.current = unicode11Addon;
      serializeAddonRef.current = serializeAddon;
      cleanupFunctionRef.current = cleanup;

      // WebSocket 接続を確立
      const ws = connectWebSocket(term);

      // ターミナルで入力されたデータをサーバーに送信
      term.onData((data) => {
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ input: data }));
        }
      });

      // ターミナルのサイズが変更されたときの処理
      term.onResize((size) => {
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          console.log(`Terminal resized: ${size.cols}x${size.rows}`);
          const resizer = JSON.stringify({ resizer: [size.cols, size.rows] });
          currentWs.send(resizer);
        }
      });

      setIsInitialized(true);
      console.log('Terminal initialization completed');
    } catch (err) {
      console.error('Terminal initialization error:', err);
    }
  }, [setupTerminal, connectWebSocket]);

  // リソースクリーンアップ
  useEffect(() => {
    return () => {
      console.log('Terminal context cleanup starting');
      
      mounted.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // WebSocketのクリーンアップ
      if (wsRef.current) {
        // クローズイベントでの再接続を防ぐためにイベントリスナーを除去
        const ws = wsRef.current;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log('Closing WebSocket connection during cleanup');
          ws.close();
        }
        wsRef.current = null;
      }
      
      // ターミナルのクリーンアップ
      if (cleanupFunctionRef.current) {
        console.log('Cleaning up terminal');
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
      
      termRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      webLinksAddonRef.current = null;
      unicode11AddonRef.current = null;
      serializeAddonRef.current = null;
      
      console.log('Terminal context cleanup completed');
    };
  }, []);

  // コマンド実行関数
  const executeCommand = useCallback((command: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket接続が確立されていません');
      return;
    }
    
    console.log(`Executing command: ${command}`);
    // コマンドの最後に改行を追加して送信
    ws.send(JSON.stringify({ input: command + '\n' }));
  }, []);

  // コンテキスト値
  const contextValue = {
    term: termRef.current,
    fitAddon: fitAddonRef.current,
    searchAddon: searchAddonRef.current,
    webLinksAddon: webLinksAddonRef.current,
    unicode11Addon: unicode11AddonRef.current, 
    serializeAddon: serializeAddonRef.current,
    ws: wsRef.current,
    executeCommand,
    isConnected,
    isInitialized,
    initializeTerminal,
  };

  return (
    <TerminalContext.Provider value={contextValue}>
      {children}
    </TerminalContext.Provider>
  );
};

// カスタムフック
export const useTerminal = () => useContext(TerminalContext);