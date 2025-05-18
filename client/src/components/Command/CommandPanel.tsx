import { Box, Typography, Divider } from '@mui/material';
import { CommandPanelProps, Command } from '../../types/command';
import CommandButton from './CommandButton';

/**
 * コマンドパネルコンポーネント
 * カテゴリーごとにコマンドボタンをグループ化して表示
 */
const CommandPanel = ({ commands, onExecute }: CommandPanelProps) => {
  // コマンドをカテゴリーごとにグループ化
  const groupedCommands = commands.reduce((groups, command) => {
    const category = command.category || 'その他';
    return {
      ...groups,
      [category]: [...(groups[category] || []), command],
    };
  }, {} as Record<string, Command[]>);

  return (
    <Box className="command-panel" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2, color: '#cccccc' }}>
        Commands
      </Typography>

      {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              color: '#808080',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
            }}
          >
            {category}
          </Typography>
          
          {categoryCommands.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onClick={onExecute}
            />
          ))}

          <Divider sx={{ mt: 2, bgcolor: '#3c3c3c' }} />
        </Box>
      ))}
    </Box>
  );
};

export default CommandPanel;
