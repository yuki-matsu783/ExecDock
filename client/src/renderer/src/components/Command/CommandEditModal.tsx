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
import { commandTreeStorage } from '../../services/commandTreeStorage';

interface CommandEditModalProps {
  open: boolean;
  onClose: () => void;
  commandTree: CommandTree;
  onUpdate: (newTree: CommandTree) => void;
}

const CommandEditModal = ({ open, onClose, commandTree, onUpdate }: CommandEditModalProps) => {
  const [yamlContent, setYamlContent] = useState<string>(
    stringify(commandTree, { blockQuote: 'literal' })
  );
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YAMLの変更を検知
  const handleYamlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setYamlContent(event.target.value);
    setError('');
  };

  // YAML形式の検証
  const validateYaml = (content: string): CommandTree | null => {
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
    const newTree = validateYaml(yamlContent);
    if (newTree) {
      onUpdate(newTree);
      commandTreeStorage.saveTree(newTree);
      onClose();
    }
  };

  // YAMLファイルのエクスポート
  const handleExport = useCallback(() => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commands.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }, [yamlContent]);

  // YAMLファイルのインポート
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = validateYaml(content);
        if (parsed) {
          setYamlContent(stringify(parsed, { blockQuote: 'literal' }));
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
              title="Import YAML"
              sx={{ color: '#cccccc', mr: 1 }}
            >
              <FileUploadIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleExport}
              title="Export YAML"
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
          value={yamlContent}
          onChange={handleYamlChange}
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