import { Button, Tooltip } from '@mui/material';
import { CommandButtonProps } from '../../types/command';

/**
 * コマンドを実行するボタンコンポーネント
 * MUIのButtonを使用し、ツールチップでコマンドの説明を表示
 */
const CommandButton = ({ command, onClick }: CommandButtonProps) => {
  return (
    <Tooltip title={command.description || command.command} placement="right">
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => onClick(command.command)}
        sx={{
          marginBottom: 1,
          textTransform: 'none',
          justifyContent: 'flex-start',
          backgroundColor: '#2d2d2d',
          '&:hover': {
            backgroundColor: '#3d3d3d'
          }
        }}
      >
        {command.label}
      </Button>
    </Tooltip>
  );
};

export default CommandButton;
