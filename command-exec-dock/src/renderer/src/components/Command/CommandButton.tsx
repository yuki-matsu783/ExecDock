import { Button, Tooltip } from '@mui/material';
import { CommandButtonProps, ExecutionType } from '../../types/command';

/**
 * コマンドボタンコンポーネント
 * コマンドを実行可能なボタンとして表示
 */
const CommandButton = ({ command, onClick }: CommandButtonProps) => {
  if (!command.command) return null;

  return (
    <Tooltip
      title={command.description?.split('\n').map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      arrow
      placement="right"
    >
      <Button
        variant="text"
        onClick={() => {
          // 即時実行の場合は改行を追加、入力待ちの場合はそのまま
          const cmd = command.executionType === ExecutionType.IMMEDIATE ? 
            command.command! + '\n' : 
            command.command! + ' ';
          onClick(cmd);
        }}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          color: '#cccccc',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        {command.label}
      </Button>
    </Tooltip>
  );
};

export default CommandButton;