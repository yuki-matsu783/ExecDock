import React, { useState, useEffect, useCallback } from 'react';
import TreeView from '@mui/x-tree-view/TreeView';
import TreeItem from '@mui/x-tree-view/TreeItem';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import useFileSystem, { FileSystemItem } from '../../hooks/useFileSystem';
import './FileExplorer.css';

// File explorer item type for tree structure
interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeItem[];
}

interface FileExplorerProps {
  onFileSelect: (filePath: string) => void;
  onFileOpen: (filePath: string) => void;
}

const StyledTreeItem = styled(TreeItem)({
  '& .MuiTreeItem-content': {
    padding: '4px 0',
  },
  '& .MuiTreeItem-label': {
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, onFileOpen }) => {
  const { currentDirectory, getCurrentDirectory, listDirectory } = useFileSystem();
  
  const [fileTree, setFileTree] = useState<FileTreeItem | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Get file list for current directory
  const refreshFiles = useCallback(async () => {
    setLoading(true);
    try {
      // Get current directory
      const cwd = await getCurrentDirectory();
      if (!cwd) return;
      
      // Get files in current directory
      const files = await listDirectory(cwd);
      
      // Build file tree structure
      const root: FileTreeItem = {
        id: cwd,
        name: cwd.split('/').pop() || cwd,
        path: cwd,
        isDirectory: true,
        children: files.map(file => ({
          id: `${file.path}`,
          name: file.name,
          path: file.path,
          isDirectory: file.isDirectory,
          children: file.isDirectory ? [] : undefined
        }))
      };
      
      setFileTree(root);
      // Expand root node
      setExpanded([root.id]);
    } catch (error) {
      console.error('Failed to refresh files:', error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentDirectory, listDirectory]);

  // Initial file load
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  // Handle node toggle (expand/collapse)
  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  // Handle node select
  const handleSelect = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setSelected(nodeIds);
    if (nodeIds.length > 0) {
      onFileSelect(nodeIds[0]);
    }
  };

  // Handle node expand - load children when a directory is expanded
  const handleNodeExpand = async (nodeId: string) => {
    try {
      // Get files for the expanded directory
      const files = await listDirectory(nodeId);
      
      // Update file tree
      if (fileTree) {
        // Find the node to update
        const updateNode = (node: FileTreeItem): FileTreeItem => {
          if (node.id === nodeId) {
            return {
              ...node,
              children: files.map(file => ({
                id: `${file.path}`,
                name: file.name,
                path: file.path,
                isDirectory: file.isDirectory,
                children: file.isDirectory ? [] : undefined
              }))
            };
          }
          
          if (node.children) {
            return {
              ...node,
              children: node.children.map(updateNode)
            };
          }
          
          return node;
        };
        
        setFileTree(updateNode(fileTree));
      }
    } catch (error) {
      console.error(`Failed to list directory ${nodeId}:`, error);
    }
  };

  // Handle double-click to open file
  const handleDoubleClick = (nodeId: string, isDirectory: boolean) => {
    if (!isDirectory) {
      onFileOpen(nodeId);
    } else if (!expanded.includes(nodeId)) {
      // If directory is not expanded, expand it
      setExpanded([...expanded, nodeId]);
      handleNodeExpand(nodeId);
    }
  };

  // Recursive render function for tree items
  const renderTree = (node: FileTreeItem) => (
    <StyledTreeItem 
      key={node.id}
      nodeId={node.id}
      label={
        <span>
          {node.isDirectory ? (expanded.includes(node.id) ? <FolderOpenIcon color="primary" fontSize="small" /> : <FolderIcon color="primary" fontSize="small" />) : <InsertDriveFileIcon fontSize="small" />}
          {node.name}
        </span>
      }
      onClick={() => {
        if (node.isDirectory && !expanded.includes(node.id)) {
          handleNodeExpand(node.id);
        }
      }}
      onDoubleClick={() => handleDoubleClick(node.id, node.isDirectory)}
    >
      {Array.isArray(node.children)
        ? node.children.map((child) => renderTree(child))
        : null}
    </StyledTreeItem>
  );

  // Handle manual refresh
  const handleRefresh = () => {
    refreshFiles();
  };

  return (
    <div className="file-explorer-container">
      <div className="file-explorer-header">
        <div className="file-explorer-title">
          <h3>Files</h3>
          <IconButton size="small" onClick={handleRefresh} disabled={loading} title="Refresh file list">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </div>
        <div className="file-explorer-path" title={currentDirectory}>{currentDirectory}</div>
      </div>
      <div className="file-explorer-tree">
        {loading ? (
          <div className="file-explorer-loading">Loading files...</div>
        ) : fileTree ? (
          <TreeView
            aria-label="file system navigator"
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            expanded={expanded}
            selected={selected}
            onNodeToggle={handleToggle}
            onNodeSelect={handleSelect}
          >
            {renderTree(fileTree)}
          </TreeView>
        ) : (
          <div className="file-explorer-error">Failed to load files</div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;