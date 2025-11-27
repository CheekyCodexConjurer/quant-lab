import React from 'react';
import { Folder, FileText } from 'lucide-react';

export type FileTreeNode = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
};

type FileTreeProps = {
  root: FileTreeNode;
  expanded: Record<string, boolean>;
  onToggle: (path: string, next: boolean) => void;
  selectedPath?: string | null;
  onSelect?: (node: FileTreeNode) => void;
  onMove?: (fromPath: string, toFolder: string) => void | Promise<void>;
  renamingPath?: string | null;
  onRenameSubmit?: (path: string, name: string) => void;
  onRenameCancel?: () => void;
  onStartRename?: (path: string) => void;
  dragOverPath?: string | null;
  setDragOverPath?: (path: string | null) => void;
  onReorder?: (fromPath: string, toPath: string) => void;
  renderActions?: (node: FileTreeNode) => React.ReactNode;
  renderFolderActions?: (node: FileTreeNode) => React.ReactNode;
  onFolderContextMenu?: (node: FileTreeNode, event: React.MouseEvent) => void;
  isStructuralFolder?: (path: string) => boolean;
};

const INDENT = 12;

export const FileTree: React.FC<FileTreeProps> = ({
  root,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
  onMove,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  dragOverPath,
  setDragOverPath,
  onReorder,
  renderActions,
  renderFolderActions,
  onFolderContextMenu,
  isStructuralFolder,
}) => {
  const renderNodes = (nodes: FileTreeNode[], depth = 0, parentPath: string | null = null) =>
    nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isOpen = expanded[node.path] ?? true;
      const isSelected = selectedPath === node.path;
      const isRenaming = renamingPath === node.path;
      const indent = depth * INDENT;
      const structural = isFolder && isStructuralFolder?.(node.path);

      const handleDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        const fromPath = event.dataTransfer.getData('text/plain');
        if (!fromPath) return;
        if (node.type === 'folder' && onMove) {
          await onMove(fromPath, node.path);
          setDragOverPath && setDragOverPath(null);
          return;
        }
        if (node.type === 'file' && onReorder) {
          const fromParent = fromPath.split('/').slice(0, -1).join('/') || '';
          const toParent = node.path.split('/').slice(0, -1).join('/') || '';
          if (fromParent === toParent) {
            onReorder(fromPath, node.path);
          }
          setDragOverPath && setDragOverPath(null);
        }
      };

      const handleDragOver = (event: React.DragEvent) => {
        const canMove = node.type === 'folder' && !!onMove;
        const canReorder = node.type === 'file' && !!onReorder;
        if (!canMove && !canReorder) return;
        event.preventDefault();
        setDragOverPath && setDragOverPath(node.path);
      };

      const handleDragLeave = () => {
        const canMove = node.type === 'folder' && !!onMove;
        const canReorder = node.type === 'file' && !!onReorder;
        if (!canMove && !canReorder) return;
        setDragOverPath && setDragOverPath(null);
      };

      const handleDragStart = (event: React.DragEvent) => {
        if (node.type === 'file') {
          event.dataTransfer.setData('text/plain', node.path);
          event.dataTransfer.effectAllowed = 'move';
          // Use a lightweight drag image to avoid dragging the whole list snapshot.
          const ghost = document.createElement('div');
          ghost.textContent = node.name;
          ghost.style.position = 'absolute';
          ghost.style.top = '-1000px';
          ghost.style.left = '-1000px';
          ghost.style.padding = '4px 8px';
          ghost.style.background = '#f8fafc';
          ghost.style.border = '1px solid #e2e8f0';
          ghost.style.borderRadius = '4px';
          ghost.style.fontSize = '11px';
          ghost.style.fontFamily = 'Inter, system-ui, sans-serif';
          document.body.appendChild(ghost);
          event.dataTransfer.setDragImage(ghost, 4, 4);
          setTimeout(() => {
            document.body.removeChild(ghost);
          }, 0);
        }
      };

      return (
        <div key={node.path} className="space-y-1">
          <div
            className={`group flex items-center justify-between cursor-pointer px-3 py-1.5 text-xs rounded-sm transition-colors duration-150 ${
              isSelected
                ? 'bg-slate-50 border-l-2 border-l-slate-900'
                : 'hover:bg-slate-100/60 border-l-2 border-l-transparent'
            } ${dragOverPath === node.path ? 'ring-1 ring-slate-300 ring-offset-0' : ''}`}
            style={{ paddingLeft: 12 + indent }}
            draggable={node.type === 'file'}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(event) => {
              if (isFolder && onFolderContextMenu) {
                event.preventDefault();
                onFolderContextMenu(node, event);
              }
            }}
            onClick={() => {
              if (isFolder) {
                onToggle(node.path, !isOpen);
              }
              onSelect && onSelect(node);
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isFolder ? <Folder size={14} className="text-slate-500" /> : <FileText size={14} className="text-slate-500" />}
              {isRenaming ? (
                <input
                  autoFocus
                  defaultValue={node.name.replace(/\.py$/i, '')}
                  className="text-xs px-1 py-0.5 border border-slate-200 rounded bg-white w-32"
                  onBlur={(event) => {
                    const raw = event.target.value.trim();
                    if (!raw) {
                      onRenameCancel && onRenameCancel();
                      return;
                    }
                    const sanitized = raw.replace(/\.py$/i, '');
                    onRenameSubmit && onRenameSubmit(node.path, sanitized);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      (event.target as HTMLInputElement).blur();
                    }
                    if (event.key === 'Escape') {
                      onRenameCancel && onRenameCancel();
                    }
                  }}
                />
              ) : (
                <span className="truncate max-w-[200px]">{node.name}</span>
              )}
            </div>
            {isFolder && renderFolderActions ? (
              <div
                className={`flex items-center gap-2 ${structural ? 'hidden' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {renderFolderActions(node)}
              </div>
            ) : null}
            {!isFolder && renderActions ? (
              <div className="flex items-center gap-2">
                {renderActions(node)}
              </div>
            ) : null}
          </div>
          {node.children && node.children.length && isOpen ? (
            <div className="space-y-1">{renderNodes(node.children, depth + 1, node.path)}</div>
          ) : null}
        </div>
      );
    });

  return <div>{renderNodes([root])}</div>;
};
