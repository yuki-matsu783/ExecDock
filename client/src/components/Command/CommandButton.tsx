import { Button, Tooltip } from '@mui/material';
import { CommandButtonProps } from '../../types/command';

/**
 * コマンドを実行するボタンコンポーネント
 * MUIのButtonを使用し、ツールチップでコマンドの説明を表示
 * 注: このコンポーネントは末端ノード（実行可能なコマンド）のみに使用される
 */
const CommandButton = ({ command, onClick }: CommandButtonProps) => {
  // コマンドが定義されていない場合は表示しない（親カテゴリの場合）
  if (!command.command) return null;

  return (
    <Tooltip title={command.description || command.command} placement="right">
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => command.command && onClick(command.command)}
        sx={{
          marginBottom: 0.5,
          textTransform: 'none',
          justifyContent: 'flex-start',
          backgroundColor: '#1e1e1e',
          borderRadius: 1,
          height: '32px',
          fontSize: '0.875rem',
          paddingLeft: '12px',
          '&:hover': {
            backgroundColor: '#2d2d2d'
          },
          '& .MuiButton-startIcon': {
            marginRight: '12px'
          }
        }}
      >
        {command.label}
      </Button>
    </Tooltip>
  );
};

export default CommandButton;
