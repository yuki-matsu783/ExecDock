import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { Tabs, Tab, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import './Editor.css';

// File tab interface
interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface EditorProps {
  isElectron: boolean;
}

// Define the ref type for the Editor component
export interface EditorHandle {
  openFile: (filePath: string) => Promise<void>;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ isElectron }, ref) => {
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('vs-dark');
  const editorRef = useRef<any>(null);
  
  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    openFile: async (filePath: string) => {
      await handleFileOpen(filePath);
    }
  }));
  
  // Get file content from the backend
  const loadFile = async (filePath: string) => {
    try {
      let content = '';
      if (isElectron && window.api?.fileSystem) {
        content = await window.api.fileSystem.readFile(filePath);
      } else {
        // For web version, this would use a WebSocket command
        console.warn('File reading not implemented for web version yet');
      }
      
      return content;
    } catch (error) {
      console.error(`Failed to load file ${filePath}:`, error);
      return '';
    }
  };
  
  // Save file content to the backend
  const saveFile = async (filePath: string, content: string) => {
    try {
      if (isElectron && window.api?.fileSystem) {
        await window.api.fileSystem.writeFile(filePath, content);
        return true;
      } else {
        // For web version, this would use a WebSocket command
        console.warn('File saving not implemented for web version yet');
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to save file ${filePath}:`, error);
      return false;
    }
  };
  
  // Handle opening a file in editor
  const handleFileOpen = async (filePath: string) => {
    // Check if file is already open
    const existingTab = tabs.find(tab => tab.path === filePath);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }
    
    // Load file content
    const content = await loadFile(filePath);
    
    // Create new tab
    const fileName = filePath.split('/').pop() || 'Untitled';
    const newTab: FileTab = {
      id: `tab-${Date.now()}`,
      path: filePath,
      name: fileName,
      content,
      isDirty: false,
    };
    
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  
  // Handle tab close
  const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    
    // Find tab to close
    const tabToClose = tabs.find(tab => tab.id === tabId);
    if (!tabToClose) return;
    
    // Prompt for saving if dirty
    if (tabToClose.isDirty) {
      const shouldSave = window.confirm(`${tabToClose.name} has unsaved changes. Save before closing?`);
      if (shouldSave) {
        saveFile(tabToClose.path, tabToClose.content);
      }
    }
    
    // Close tab
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // Set active tab to previous tab or null if no tabs left
    if (activeTab === tabId) {
      if (newTabs.length > 0) {
        // Find index of closed tab
        const index = tabs.findIndex(tab => tab.id === tabId);
        // Set active tab to the one before, or the first one if it was the first
        const newActiveTab = index > 0 ? tabs[index - 1].id : newTabs[0].id;
        setActiveTab(newActiveTab);
      } else {
        setActiveTab(null);
      }
    }
  };
  
  // Handle editor content change
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || activeTab === null) return;
    
    // Update tab content
    setTabs(tabs.map(tab => 
      tab.id === activeTab 
        ? { ...tab, content: value, isDirty: true } 
        : tab
    ));
  };
  
  // Handle save file
  const handleSaveFile = async () => {
    if (activeTab === null) return;
    
    // Find active tab
    const tab = tabs.find(tab => tab.id === activeTab);
    if (!tab) return;
    
    // Save file
    const success = await saveFile(tab.path, tab.content);
    
    // Update tab state
    if (success) {
      setTabs(tabs.map(t => 
        t.id === activeTab 
          ? { ...t, isDirty: false } 
          : t
      ));
    }
  };
  
  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addCommand(
      // Ctrl+S or Cmd+S to save
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, 
      handleSaveFile
    );
  };
  
  // Get current tab content
  const activeTabContent = useMemo(() => {
    if (activeTab === null) return '';
    const tab = tabs.find(tab => tab.id === activeTab);
    return tab ? tab.content : '';
  }, [tabs, activeTab]);
  
  // Get file extension for language identification
  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension) return 'plaintext';
    
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext',
      // Add more extensions as needed
    };
    
    return languageMap[extension] || 'plaintext';
  };
  
  // Get active tab language
  const activeTabLanguage = useMemo(() => {
    if (activeTab === null) return 'plaintext';
    const tab = tabs.find(tab => tab.id === activeTab);
    return tab ? getLanguageFromFilename(tab.name) : 'plaintext';
  }, [tabs, activeTab]);
  
  return (
    <div className="editor-container">
      {tabs.length > 0 ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#252526' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              className="editor-tabs"
            >
              {tabs.map((tab) => (
                <Tab 
                  key={tab.id} 
                  label={
                    <div className="tab-label">
                      <span>{tab.name}{tab.isDirty ? ' *' : ''}</span>
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleCloseTab(e, tab.id)}
                        className="close-tab-button"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </div>
                  } 
                  value={tab.id} 
                />
              ))}
            </Tabs>
            <div className="editor-actions">
              <IconButton 
                size="small" 
                onClick={handleSaveFile}
                disabled={activeTab === null}
                title="Save file (Ctrl+S)"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </div>
          </Box>
          
          <div className="monaco-editor-container">
            <MonacoEditor
              height="100%"
              theme={theme}
              language={activeTabLanguage}
              value={activeTabContent}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                automaticLayout: true,
                fontSize: 14,
                wordWrap: 'on',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
              }}
            />
          </div>
        </>
      ) : (
        <div className="no-files-open">
          <p>No files open</p>
          <p>Double-click a file in the explorer to open it</p>
        </div>
      )}
    </div>
  );
});

export default Editor;