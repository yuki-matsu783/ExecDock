import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TerminalProvider } from './contexts/TerminalContext';
import CommandPanel from './components/Command/CommandPanel';
import Terminal from './components/Terminal/Terminal';
import { commandTreeStorage } from './services/commandTreeStorage';
import { useState, useCallback, useEffect } from 'react';
import './assets/main.css';

/**
 * アプリケーションのルートコンポーネント
 * 左右に分割可能なパネルレイアウトを実装
 */
function App(): React.JSX.Element {
  // コマンドツリーの状態管理（ローカルストレージと連携）
  const [commandTree, setCommandTree] = useState(() => {
    const savedTree = commandTreeStorage.loadTree();
    return savedTree || commandTreeStorage.getDefaultCommands();
  });

  // 初期ロード時にデフォルトコマンドを保存
  useEffect(() => {
    if (!commandTreeStorage.loadTree()) {
      commandTreeStorage.saveTree(commandTreeStorage.getDefaultCommands());
    }
  }, []);

  /**
   * コマンドツリーを更新
   * インポート機能で使用
   */
  const handleCommandTreeUpdate = useCallback((newTree) => {
    setCommandTree(newTree);
  }, []);

  return (
    <TerminalProvider>
      <div className="app-container">
        <PanelGroup direction="horizontal">
          {/* 左パネル: コマンドボタン */}
          <Panel defaultSize={20} minSize={15}>
            <CommandPanel commandTree={commandTree} onUpdate={handleCommandTreeUpdate} />
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* 右パネル: ターミナル */}
          <Panel defaultSize={80}>
            <Terminal />
          </Panel>
        </PanelGroup>
      </div>
    </TerminalProvider>
  );
}

export default App;
