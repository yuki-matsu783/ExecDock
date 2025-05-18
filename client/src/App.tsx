import { useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Command } from './types/command';
import CommandPanel from './components/Command/CommandPanel';
import Terminal from './components/Terminal/Terminal';
import useXterm from './hooks/useXterm';
import useCommand from './hooks/useCommand';
import './App.css';

/**
 * アプリケーションのルートコンポーネント
 * 左右に分割可能なパネルレイアウトを実装
 */
function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ws } = useXterm(containerRef);
  const { executeCommand } = useCommand(ws);

  // サンプルコマンド定義
  const commands: Command[] = [
    {
      id: 'clear',
      label: 'Clear Terminal',
      command: 'clear',
      description: 'ターミナルの表示をクリア',
      category: 'Terminal',
    },
    {
      id: 'ls',
      label: 'List Files',
      command: 'ls -la',
      description: '詳細形式でファイル一覧を表示',
      category: 'File System',
    },
    {
      id: 'pwd',
      label: 'Current Directory',
      command: 'pwd',
      description: '現在のディレクトリパスを表示',
      category: 'File System',
    },
    {
      id: 'date',
      label: 'Current Date',
      command: 'date',
      description: '現在の日時を表示',
      category: 'System',
    },
  ];

  return (
    <div className="app-container">
      <PanelGroup direction="horizontal">
        {/* 左パネル: コマンドボタン */}
        <Panel defaultSize={20} minSize={15}>
          <CommandPanel commands={commands} onExecute={executeCommand} />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* 右パネル: ターミナル */}
        <Panel defaultSize={80}>
          <div ref={containerRef} style={{ height: '100%' }}>
            <Terminal />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
