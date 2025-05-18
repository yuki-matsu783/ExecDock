import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  Typography, 
  Box,
  Button,
  DialogActions,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useCallback, useRef } from 'react';
import { CommandTree } from '../../types/command';
import { parse, stringify } from 'yaml';

interface CommandEditModalProps {
  open: boolean;
  onClose: () => void;
  commandTree: CommandTree;
  onUpdate: (newTree: CommandTree) => void;
}

const CommandEditModal = ({ open, onClose, commandTree, onUpdate }: CommandEditModalProps) => {
  const [jsonContent, setJsonContent] = useState<string>(
    stringify(commandTree)
  );
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSONの変更を検知
  const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(event.target.value);
    setError('');
  };

  // JSON形式の検証
  const validateJson = (content: string): CommandTree | null => {
    try {
      const parsed = parse(content);
      if (!parsed.version || !Array.isArray(parsed.commands)) {
        throw new Error('Invalid command tree format: missing version or commands');
      }
      return parsed as CommandTree;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  };

  // 変更を保存
  const handleSave = () => {
    const newTree = validateJson(jsonContent);
    if (newTree) {
      onUpdate(newTree);
      onClose();
    }
  };

  // JSONファイルのエクスポート
  const handleExport = useCallback(() => {
    const blob = new Blob([jsonContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commands.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonContent]);

  // JSONファイルのインポート
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = validateJson(content);
        if (parsed) {
          setJsonContent(JSON.stringify(parsed, null, 2));
        }
      } catch (err) {
        setError('Failed to import file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e',
          color: '#cccccc',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Edit Commands</Typography>
          <Box>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              title="Import JSON"
              sx={{ color: '#cccccc', mr: 1 }}
            >
              <FileUploadIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleExport}
              title="Export JSON"
              sx={{ color: '#cccccc', mr: 1 }}
            >
              <FileDownloadIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: '#cccccc' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <textarea
          value={jsonContent}
          onChange={handleJsonChange}
          style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#2d2d2d',
            color: '#cccccc',
            border: '1px solid #3c3c3c',
            padding: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            resize: 'none',
          }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".yaml,.yml"
          style={{ display: 'none' }}
        />
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            backgroundColor: '#2d2d2d',
            '&:hover': {
              backgroundColor: '#3d3d3d',
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommandEditModal;
