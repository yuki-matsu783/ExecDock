import { Box, Typography, IconButton, Accordion, AccordionSummary, AccordionDetails, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SettingsIcon from '@mui/icons-material/Settings';
import { CommandPanelProps, CommandNode, CommandTree } from '../../types/command';
import CommandButton from './CommandButton';
import { useTerminal } from '../../contexts/TerminalContext';
import defaultCommandsYaml from '../../config/defaultCommands.yaml?raw';
import { commandTreeStorage } from '../../services/commandTreeStorage';
import { parse } from 'yaml';
import CommandEditModal from './CommandEditModal';
import { useCallback, useState } from 'react';

/**
 * お気に入りコマンドのリストを取得
 */
const getFavorites = (tree: CommandTree): CommandNode[] => {
  const favorites: CommandNode[] = [];
  
  const traverse = (node: CommandNode) => {
    if (node.favorite && !node.children) {
      favorites.push(node);
    }
    node.children?.forEach(traverse);
  };
  
  tree.commands.forEach(traverse);
  return favorites.sort((a, b) => (a.favorite || 0) - (b.favorite || 0));
};

/**
 * コマンドノードをレンダリングするコンポーネント
 * 再帰的に階層構造を表示
 */
const CommandNodeComponent = ({ 
  node, 
  onClick,
  onFavoriteToggle,
  isExpanded,
  onExpandToggle,
  expandedNodes,
}: { 
  node: CommandNode;
  onClick: (command: string) => void;
  onFavoriteToggle?: (node: CommandNode) => void;
  isExpanded?: boolean;
  onExpandToggle?: (nodeId: string, expanded: boolean) => void;
  expandedNodes?: Set<string>;
}) => {
  // 子ノードがある場合はアコーディオン、ない場合はボタンを表示
  if (node.children) {
    return (
      <Accordion 
        expanded={isExpanded || false}
        onChange={() => onExpandToggle?.(node.id, !isExpanded)}
        sx={{
          backgroundColor: 'transparent',
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
        }}
      >
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
              flexGrow: 1,
            }}
          >
            {node.label}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '0 8px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {node.children.map((child) => (
              <CommandNodeComponent 
                key={child.id} 
                node={child} 
                onClick={onClick}
                onFavoriteToggle={onFavoriteToggle}
                isExpanded={expandedNodes?.has(child.id)}
                onExpandToggle={onExpandToggle}
                expandedNodes={expandedNodes}
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flexGrow: 1 }}>
        <CommandButton command={node} onClick={onClick} />
      </Box>
      {onFavoriteToggle && (
        <IconButton 
          size="small" 
          onClick={() => onFavoriteToggle(node)}
          sx={{ 
            padding: 0.5,
            color: '#cccccc',
          }}
        >
          {node.favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
        </IconButton>
      )}
    </Box>
  );
};

/**
 * コマンドパネルコンポーネント
 * 階層構造のコマンドツリーを表示し、インポート/エクスポート機能を提供
 */
const CommandPanel = ({ commandTree = parse(defaultCommandsYaml), onUpdate }: CommandPanelProps) => {
  const { executeCommand, focusTerminal } = useTerminal();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // アコーディオンの開閉状態を管理
  const handleExpandToggle = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(nodeId);
      } else {
        newSet.delete(nodeId);
      }
      return newSet;
    });
  }, []);

  // アコーディオンの全開閉
  const toggleAllExpanded = useCallback(() => {
    const hasExpanded = expandedNodes.size > 0;
    const getAllNodeIds = (node: CommandNode): string[] => {
      const ids = node.children ? [node.id] : [];
      return node.children ? 
        ids.concat(...node.children.map(getAllNodeIds)) :
        ids;
    };
    
    if (hasExpanded) {
      setExpandedNodes(new Set());
    } else {
      const allIds = commandTree.commands.flatMap(getAllNodeIds);
      setExpandedNodes(new Set(allIds));
    }
  }, [commandTree.commands, expandedNodes]);

  /**
   * お気に入りの切り替え
   */
  const handleFavoriteToggle = useCallback((node: CommandNode) => {
    const updateNode = (target: CommandNode): CommandNode => {
      if (target.id === node.id) {
        // お気に入りの追加/削除
        if (target.favorite) {
          const { favorite: _, ...rest } = target;
          return rest;
        } else {
          // 新しいお気に入り順序を計算
          const favorites = getFavorites(commandTree);
          const newOrder = Math.max(0, ...favorites.map(f => f.favorite || 0)) + 1;
          return { ...target, favorite: newOrder };
        }
      }
      if (target.children) {
        return {
          ...target,
          children: target.children.map(updateNode)
        };
      }
      return target;
    };

    const newTree: CommandTree = {
      ...commandTree,
      commands: commandTree.commands.map(updateNode)
    };

    onUpdate(newTree);
    commandTreeStorage.saveTree(newTree);
  }, [commandTree, onUpdate]);

  return (
    <Box className="command-panel" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="h6" component="h2" sx={{ color: '#cccccc', flexGrow: 1 }}>
            Commands
          </Typography>
          <IconButton
            size="small"
            onClick={toggleAllExpanded}
            title={expandedNodes.size > 0 ? "Collapse All" : "Expand All"}
            sx={{ color: '#cccccc' }}
          >
            {expandedNodes.size > 0 ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setIsEditMode(true)}
            title="Edit Commands"
            sx={{ color: '#cccccc' }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>

        <CommandEditModal
          open={isEditMode}
          onClose={() => setIsEditMode(false)}
          commandTree={commandTree}
          onUpdate={onUpdate}
        />
      </>

      {/* お気に入りセクション */}
      {getFavorites(commandTree).length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              color: '#808080',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            Favorites
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {getFavorites(commandTree).map(node => (
              <CommandNodeComponent
                key={node.id}
                node={node}
                onClick={(cmd) => {
                  executeCommand(cmd);
                  focusTerminal();
                }}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </Box>
          <Divider sx={{ mt: 2, bgcolor: '#3c3c3c' }} />
        </Box>
      )}

      {/* コマンドツリー */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {commandTree.commands.map((command) => (
          <CommandNodeComponent 
            key={command.id} 
            node={command} 
            onClick={(cmd) => {
              executeCommand(cmd);
              focusTerminal();
            }}
            onFavoriteToggle={handleFavoriteToggle}
            isExpanded={expandedNodes.has(command.id)}
            onExpandToggle={handleExpandToggle}
            expandedNodes={expandedNodes}
          />
        ))}
      </Box>
    </Box>
  );
};

export default CommandPanel;
