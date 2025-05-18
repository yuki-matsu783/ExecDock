import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

/**
 * xterm.jsの初期化と管理を行うカスタムフック
 * @param containerRef ターミナルを表示するDOM要素のref
 * @returns ターミナルインスタンスと各種アドオン
 */
const useXterm = (containerRef: React.RefObject<HTMLDivElement>) => {
  // ターミナルとアドオンのインスタンスを保持するref
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const webLinksAddonRef = useRef<WebLinksAddon | null>(null);
  const unicode11AddonRef = useRef<Unicode11Addon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ターミナルの初期化
    const term = new Terminal({
      cols: 80,
      rows: 24,
      allowProposedApi: true,
    });

    // アドオンの初期化
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();
    const serializeAddon = new SerializeAddon();

    // アドオンの読み込み
    [
      fitAddon,
      searchAddon,
      webLinksAddon,
      unicode11Addon,
      serializeAddon,
    ].forEach((addon) => term.loadAddon(addon));

    // ターミナルをDOMに表示
    term.open(containerRef.current);
    fitAddon.fit();

    // WebSocket接続の確立
    const ws = new WebSocket(`ws://${location.hostname}:8999`);
    
    ws.addEventListener('open', () => {
      console.info('WebSocket connected');
    });

    ws.addEventListener('message', (event) => {
      console.debug('Message from server ', event.data);
      try {
        const output = JSON.parse(event.data);
        term.write(output.output);
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    // ターミナル入力をサーバーに送信
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ input: data }));
      }
    });

    // リサイズイベントの処理
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    // ターミナルリサイズ時の処理
    term.onResize((size) => {
      if (ws.readyState === WebSocket.OPEN) {
        const resizer = JSON.stringify({ resizer: [size.cols, size.rows] });
        ws.send(resizer);
      }
    });

    // Refに保存
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    webLinksAddonRef.current = webLinksAddon;
    unicode11AddonRef.current = unicode11Addon;
    serializeAddonRef.current = serializeAddon;
    wsRef.current = ws;

    // クリーンアップ処理
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [containerRef]);

  return {
    term: termRef.current,
    fitAddon: fitAddonRef.current,
    searchAddon: searchAddonRef.current,
    webLinksAddon: webLinksAddonRef.current,
    unicode11Addon: unicode11AddonRef.current,
    serializeAddon: serializeAddonRef.current,
    ws: wsRef.current
  };
};

export default useXterm;
