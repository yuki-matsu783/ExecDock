import React from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import clsx from 'clsx';
import './TreeView.css';

interface FileNode {
  id: string;
  name: string;
  children?: FileNode[];
}

// テスト用のツリーデータ
const testData: FileNode[] = [
  {
    id: '1',
    name: 'src',
    children: [
      {
        id: '2',
        name: 'components',
        children: [
          { id: '3', name: 'App.tsx' },
          { id: '4', name: 'TreeView.tsx' }
        ]
      },
      {
        id: '5',
        name: 'assets',
        children: [
          { id: '6', name: 'style.css' }
        ]
      }
    ]
  },
  {
    id: '7',
    name: 'public',
    children: [
      { id: '8', name: 'index.html' }
    ]
  }
];

/**
 * ツリービューのノードコンポーネント
 * ファイルまたはディレクトリを表示
 */
const TreeNode = React.forwardRef<HTMLDivElement, NodeRendererProps<FileNode>>((props, ref) => {
  const { node, style } = props;
  
  return (
    <div className={clsx('tree-node', node.state)} style={style} ref={ref}>
      {node.isInternal ? (
        <FolderIcon className="node-icon" fontSize="small" />
      ) : (
        <InsertDriveFileIcon className="node-icon" fontSize="small" />
      )}
      <span className="tree-node-name">{node.data.name}</span>
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

/**
 * ファイルツリービューコンポーネント
 * 現在のディレクトリ構造をツリー表示する
 */
const TreeView: React.FC = () => {
  const { ref, height = 300 } = useResizeObserver();

  return (
    <div className="tree-view-container" ref={ref}>
      {testData && height > 0 ? (
        <Tree
          data={testData}
          width="100%"
          height={height}
          indent={24}
          rowHeight={24}
          overscanCount={5}
          padding={4}
        >
          {TreeNode}
        </Tree>
      ) : (
        <div className="tree-view-loading">Loading...</div>
      )}
    </div>
  );
};

export default TreeView;
