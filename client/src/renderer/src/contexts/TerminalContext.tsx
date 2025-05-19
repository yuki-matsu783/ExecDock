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
  focusTerminal: () => void;
  isConnected: boolean;
  isInitialized: boolean;
  initializeTerminal: (container: HTMLDivElement) => void;
  isElectron: boolean; // Electronで実行中かどうか
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
  focusTerminal: () => {},
  isConnected: false,
  isInitialized: false,
  initializeTerminal: () => {},
  isElectron: false,
};

// Electronで実行中かどうかを確認する
const isRunningInElectron = (): boolean => {
  return !!(window.api?.terminal?.isElectron);
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
  const [isElectron] = useState(isRunningInElectron());
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
  const electronDataUnsubscribeRef = useRef<(() => void) | null>(null);

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
      console.debug('Initializing terminal...');

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
            cursor: '#ffffff'
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
      console.debug('Opening terminal in container...');
      term.open(container);
      
      return { 
        term, 
        fitAddon, 
        searchAddon, 
        webLinksAddon, 
        unicode11Addon, 
        serializeAddon, 
        cleanup: () => {
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
    if (!mounted.current || isElectron) return null;

    try {
      // 既存の接続があれば閉じる
      if (wsRef.current) {
        console.debug('Closing existing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }

      console.debug('Connecting to WebSocket server...');
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
            console.debug(`Sending initial terminal size: ${terminal.cols}x${terminal.rows}`);
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
          console.debug(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
          
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
  }, [isElectron]);

  // Electron IPC通信の設定
  const setupElectronIPCTerminal = useCallback((term: Terminal) => {
    if (!isElectron || !window.api?.terminal) return null;

    console.debug('Setting up Electron IPC terminal communication');
    
    // Electron IPCリスナーを設定
    const unsubscribe = window.api.terminal.onData((data: string) => {
      if (mounted.current && term) {
        term.write(data);
      }
    });
    
    // 接続状態を更新
    setIsConnected(true);
    
    // Electron IPCでの初期サイズ送信
    if (term) {
      console.debug(`Sending initial terminal size to Electron: ${term.cols}x${term.rows}`);
      window.api.terminal.resize(term.cols, term.rows);
    }
    
    return unsubscribe;
  }, [isElectron]);

  // ターミナル初期化関数
  const initializeTerminal = useCallback((container: HTMLDivElement) => {
    // 既に初期化済みなら何もしない
    if (!container || termRef.current || !mounted.current) return;
    
    containerRef.current = container;

    // DOM要素が完全にレンダリングされるのを確実にするため、わずかに遅延して初期化
    setTimeout(() => {
      if (!mounted.current) return;
      
      try {
        console.debug('Terminal initialization started');
        
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

        // リサイズの最適化変数
        let lastFitTime = Date.now();
        let lastResize = { cols: term.cols, rows: term.rows };
        let fitTimeoutId: NodeJS.Timeout | null = null;
        
        // リサイズ処理を一元化する関数
        const handleFitTerminal = (immediate = false) => {
          if (!mounted.current || !fitAddonRef.current) return;
          
          // 既存のタイマーをクリア
          if (fitTimeoutId) {
            clearTimeout(fitTimeoutId);
            fitTimeoutId = null;
          }
          
          const delay = immediate ? 0 : 100;
          
          // 最後のリサイズからの経過時間をチェック（デバウンス）
          const now = Date.now();
          if (!immediate && now - lastFitTime < 200) return;
          
          fitTimeoutId = setTimeout(() => {
            try {
              if (fitAddonRef.current && termRef.current) {
                fitAddonRef.current.fit();
                lastFitTime = Date.now();
                
                // 新しいサイズが前回と異なる場合のみログ出力
                const newCols = termRef.current.cols;
                const newRows = termRef.current.rows;
                if (lastResize.cols !== newCols || lastResize.rows !== newRows) {
                  console.debug(`Terminal resized: ${newCols}x${newRows}`);
                  lastResize = { cols: newCols, rows: newRows };
                  
                  // 実行環境に応じたサイズ更新の送信
                  if (isElectron && window.api?.terminal) {
                    window.api.terminal.resize(newCols, newRows);
                  } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ resizer: [newCols, newRows] }));
                  }
                }
              }
            } catch (e) {
              console.error('Error fitting terminal:', e);
            }
          }, delay);
        };
        
        // ウィンドウリサイズイベントリスナー
        const handleWindowResize = () => {
          if (!mounted.current) return;
          handleFitTerminal();
        };
        
        // ウィンドウリサイズイベントを登録
        window.addEventListener('resize', handleWindowResize);
        
        // 実行環境に応じた通信の設定
        if (isElectron) {
          // Electron IPCモードで通信を設定
          const unsubscribe = setupElectronIPCTerminal(term);
          if (unsubscribe) {
            electronDataUnsubscribeRef.current = unsubscribe;
          }
        } else {
          // WebSocketモードで通信を設定
          connectWebSocket(term);
        }

        // 重複するデータ送信を防ぐためのフラグ
        let fitSizeJustSent = false;

        // ターミナルで入力されたデータを適切な方法で送信
        term.onData((data) => {
          if (isElectron && window.api?.terminal) {
            // Electron IPCで送信
            window.api.terminal.write(data);
          } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // WebSocketで送信
            wsRef.current.send(JSON.stringify({ input: data }));
          }
        });

        // ターミナルのサイズが変更されたときの処理
        term.onResize((size) => {
          // 重複するサイズ送信を制限
          if (fitSizeJustSent) {
            return;
          }
          
          // 実行環境に応じたリサイズ情報の送信
          if (isElectron && window.api?.terminal) {
            // Electron IPCで送信
            window.api.terminal.resize(size.cols, size.rows);
          } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // WebSocketで送信
            wsRef.current.send(JSON.stringify({ resizer: [size.cols, size.rows] }));
          }
          
          // フラグを設定して少しの間、重複送信を防止
          fitSizeJustSent = true;
          setTimeout(() => {
            fitSizeJustSent = false;
          }, 100);
        });
        
        // クリーンアップ関数を拡張
        cleanupFunctionRef.current = () => {
          if (fitTimeoutId) {
            clearTimeout(fitTimeoutId);
          }
          window.removeEventListener('resize', handleWindowResize);
          cleanup();
        };
        
        // 初期フィットを実行 - 短いタイマーで確実に実行
        setTimeout(() => {
          if (mounted.current) {
            handleFitTerminal(true);
          }
        }, 50);
        
        // 接続状態や初期化状態が変わった時のエフェクト
        const handleConnectionStateChange = () => {
          if (mounted.current) {
            handleFitTerminal();
          }
        };
        
        // 監視の設定
        const connectionObserver = new MutationObserver(handleConnectionStateChange);
        if (container.parentElement) {
          connectionObserver.observe(container.parentElement, { attributes: true, childList: false, subtree: false });
        }
        
        // クリーンアップに監視の解除を追加
        const originalCleanup = cleanupFunctionRef.current;
        cleanupFunctionRef.current = () => {
          connectionObserver.disconnect();
          if (originalCleanup) originalCleanup();
        };

        setIsInitialized(true);
        console.debug('Terminal initialization completed');
      } catch (err) {
        console.error('Terminal initialization error:', err);
      }
    }, 10); // わずかな遅延でDOMの準備を確実に
  }, [setupTerminal, connectWebSocket, isElectron, setupElectronIPCTerminal]);

  // リソースクリーンアップ
  useEffect(() => {
    return () => {
      console.debug('Terminal context cleanup starting');
      
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
          console.debug('Closing WebSocket connection during cleanup');
          ws.close();
        }
        wsRef.current = null;
      }
      
      // Electron IPCのクリーンアップ
      if (electronDataUnsubscribeRef.current) {
        console.debug('Removing Electron IPC listeners');
        electronDataUnsubscribeRef.current();
        electronDataUnsubscribeRef.current = null;
      }
      
      // ターミナルのクリーンアップ
      if (cleanupFunctionRef.current) {
        console.debug('Cleaning up terminal');
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
      
      termRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      webLinksAddonRef.current = null;
      unicode11AddonRef.current = null;
      serializeAddonRef.current = null;
      
      console.debug('Terminal context cleanup completed');
    };
  }, []);

  // コマンド実行関数
  const focusTerminal = useCallback(() => {
    if (termRef.current) {
      termRef.current.focus();
    }
  }, []);

  const executeCommand = useCallback((command: string) => {
    if (isElectron && window.api?.terminal) {
      // Electron IPCでコマンドを実行
      console.debug(`Executing command via Electron IPC: ${command}`);
      window.api.terminal.executeCommand(command);
    } else {
      // WebSocketでコマンドを実行
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket接続が確立されていません');
        return;
      }
      
      console.debug(`Executing command via WebSocket: ${command}`);
      ws.send(JSON.stringify({ input: command }));
    }
  }, [isElectron]);

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
    focusTerminal,
    isConnected,
    isInitialized,
    initializeTerminal,
    isElectron,
  };

  return (
    <TerminalContext.Provider value={contextValue}>
      {children}
    </TerminalContext.Provider>
  );
};

// カスタムフック
export const useTerminal = () => useContext(TerminalContext);