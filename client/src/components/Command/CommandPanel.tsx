import { Box, Typography, IconButton, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { CommandPanelProps, CommandNode, CommandTree } from '../../types/command';
import CommandButton from './CommandButton';
import { useTerminal } from '../../contexts/TerminalContext';
import defaultCommands from '../../config/defaultCommands.json';
import { useCallback, useRef } from 'react';

/**
 * コマンドノードをレンダリングするコンポーネント
 * 再帰的に階層構造を表示
 */
const CommandNodeComponent = ({ node, onClick }: { node: CommandNode; onClick: (command: string) => void }) => {
  // 子ノードがある場合はアコーディオン、ない場合はボタンを表示
  if (node.children) {
    return (
      <Accordion defaultExpanded sx={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        '&:before': {
          display: 'none',
        },
      }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: '#808080' }} />}
          sx={{
            minHeight: '40px',
            padding: '0 8px',
            '& .MuiAccordionSummary-content': {
              margin: '0',
            },
          }}
        >
          <Typography
            sx={{
              color: '#808080',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            {node.label}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '0 8px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {node.children.map((child) => (
              <CommandNodeComponent key={child.id} node={child} onClick={onClick} />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return <CommandButton command={node} onClick={onClick} />;
};

/**
 * コマンドパネルコンポーネント
 * 階層構造のコマンドツリーを表示し、インポート/エクスポート機能を提供
 */
const CommandPanel = ({ commandTree = defaultCommands, onUpdate }: CommandPanelProps) => {
  const { executeCommand, focusTerminal } = useTerminal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * コマンドツリーをJSONファイルとしてエクスポート
   */
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(commandTree, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commands.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [commandTree]);

  /**
   * JSONファイルからコマンドツリーをインポート
   */
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as CommandTree;
        
        // バージョンチェック
        if (!importedData.version) {
          throw new Error('Invalid command tree format: version is missing');
        }
        
        // コマンド配列の存在チェック
        if (!Array.isArray(importedData.commands)) {
          throw new Error('Invalid command tree format: commands must be an array');
        }

        // データを更新
        onUpdate(importedData);

        console.log('Commands imported successfully');
      } catch (err) {
        console.error('Failed to import commands:', err);
        alert('コマンドのインポートに失敗しました: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, [onUpdate]);

  return (
    <Box className="command-panel" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ color: '#cccccc', flexGrow: 1 }}>
          Commands
        </Typography>
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          title="インポート"
          sx={{ color: '#cccccc' }}
        >
          <FileUploadIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleExport}
          title="エクスポート"
          sx={{ color: '#cccccc' }}
        >
          <FileDownloadIcon />
        </IconButton>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          style={{ display: 'none' }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {commandTree.commands.map((command) => (
          <CommandNodeComponent 
            key={command.id} 
            node={command} 
            onClick={(cmd) => {
              executeCommand(cmd);
              focusTerminal();
            }} 
          />
        ))}
      </Box>
    </Box>
  );
};

export default CommandPanel;
