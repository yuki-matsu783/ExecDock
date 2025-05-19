import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TerminalProvider, useTerminal } from './contexts/TerminalContext';
import CommandPanel from './components/Command/CommandPanel';
import Terminal from './components/Terminal/Terminal';
import FileExplorer from './components/FileExplorer/FileExplorer';
import Editor from './components/Editor/Editor';
import { commandTreeStorage } from './services/commandTreeStorage';
import { useState, useCallback, useEffect, useRef } from 'react';
import './assets/main.css';

// Main application component wrapped with providers
function App(): React.JSX.Element {
  return (
    <TerminalProvider>
      <AppContent />
    </TerminalProvider>
  );
}

/**
 * アプリケーションの内容コンポーネント
 * 4分割のパネルレイアウトを実装
 */
function AppContent(): React.JSX.Element {
  const { isElectron } = useTerminal();
  // コマンドツリーの状態管理（ローカルストレージと連携）
  const [commandTree, setCommandTree] = useState(() => {
    const savedTree = commandTreeStorage.loadTree();
    return savedTree || commandTreeStorage.getDefaultCommands();
  });
  
  // 現在開いているファイルの状態
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

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
  
  // ファイル選択時の処理
  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);
  
  // ファイルを開く処理
  const handleFileOpen = useCallback((filePath: string) => {
    if (editorRef.current && editorRef.current.openFile) {
      editorRef.current.openFile(filePath);
    }
  }, []);

  return (
    <div className="app-container">
      <PanelGroup direction="horizontal">
        {/* 左パネルグループ */}
        <Panel defaultSize={25} minSize={15}>
          <PanelGroup direction="vertical">
            {/* 左上: ファイルエクスプローラ */}
            <Panel defaultSize={50} minSize={15}>
              <FileExplorer 
                onFileSelect={handleFileSelect} 
                onFileOpen={handleFileOpen} 
              />
            </Panel>
            
            <PanelResizeHandle className="resize-handle-horizontal" />
            
            {/* 左下: コマンドパネル */}
            <Panel defaultSize={50} minSize={15}>
              <CommandPanel 
                commandTree={commandTree} 
                onUpdate={handleCommandTreeUpdate} 
              />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* 右パネルグループ */}
        <Panel defaultSize={75}>
          <PanelGroup direction="vertical">
            {/* 右上: エディター */}
            <Panel defaultSize={60} minSize={10}>
              <Editor 
                ref={editorRef} 
                isElectron={isElectron} 
              />
            </Panel>
            
            <PanelResizeHandle className="resize-handle-horizontal" />
            
            {/* 右下: ターミナル */}
            <Panel defaultSize={40} minSize={10}>
              <Terminal />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
