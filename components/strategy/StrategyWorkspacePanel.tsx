import React, { RefObject } from 'react';
import { FolderPlus, Plus, Upload } from 'lucide-react';
import { FileTree, FileTreeNode } from '../files/FileTree';

export interface StrategyWorkspacePanelProps {
  tree: FileTreeNode;
  expanded: Record<string, boolean>;
  onToggle: (path: string, next: boolean) => void;
  activePath: string | null;
  renamingPath: string | null;
  onRenameSubmit: (path: string, name: string) => void;
  onRenameCancel: () => void;
  onReorder: (fromPath: string, toPath: string) => void;
  onSelectNode: (node: FileTreeNode) => void;
  onNewFolder: () => void;
  onNewStrategy: () => void;
  importInputRef: RefObject<HTMLInputElement>;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StrategyWorkspacePanel: React.FC<StrategyWorkspacePanelProps> = ({
  tree,
  expanded,
  onToggle,
  activePath,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
  onReorder,
  onSelectNode,
  onNewFolder,
  onNewStrategy,
  importInputRef,
  onImportFile,
}) => {
  return (
    <div className="h-full bg-white rounded-[2rem] shadow-soft border border-slate-200 flex flex-col">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-[2rem]">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Workspace</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewFolder}
            className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-100/70 active:translate-y-[0.5px] rounded border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
            title="New folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            type="button"
            onClick={onNewStrategy}
            className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-100/70 active:translate-y-[0.5px] rounded border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
            title="New strategy"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="h-7 w-7 flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-300/20"
            title="Import strategy"
          >
            <Upload size={16} />
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".py,.txt"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 pr-1">
        <FileTree
          root={tree}
          expanded={expanded}
          onToggle={onToggle}
          selectedPath={activePath}
          renamingPath={renamingPath}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          onReorder={onReorder}
          onSelect={onSelectNode}
        />
      </div>
    </div>
  );
};

