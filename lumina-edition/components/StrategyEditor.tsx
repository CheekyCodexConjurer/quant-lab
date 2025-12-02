import React, { useEffect, useMemo, useState } from 'react';
import { Play, Save, Download, Copy, File, Folder, Trash2, Edit2, Plus, ChevronDown, ChevronRight, FileCode, Upload } from 'lucide-react';
import { PythonEditor } from '../../components/editor/PythonEditor';
import { StrategyConsole } from './StrategyConsole';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId?: string;
  active?: boolean;
  indicatorActive?: boolean;
}

export interface StrategyEditorProps {
  files: FileNode[];
  activeFileId: string | null;
  code: string;
  onSelectFile: (id: string) => void;
  onChangeCode: (code: string) => void;
  onSave: () => void;
  onRun: () => void;
  onRenameFile?: (id: string, newName: string) => void;
  onDeleteFile?: (id: string) => void;
  onCreateFile?: () => void;
  onCreateIndicatorFile?: () => void;
  onToggleIndicatorActive?: (id: string, nextActive: boolean) => Promise<void> | void;
  onImportFromFile?: (fileName: string, content: string) => void;
  errorLines?: number[];
  externalLogs?: { type: 'info' | 'success' | 'error'; text: string }[];
  isRunBusy?: boolean;
  activeIndicatorLastUpdateAt?: number | null;
}

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
  files,
  activeFileId,
  code,
  onSelectFile,
  onChangeCode,
  onSave,
  onRun,
  onRenameFile,
  onDeleteFile,
  onCreateFile,
  onCreateIndicatorFile,
  onToggleIndicatorActive,
  onImportFromFile,
  errorLines,
  externalLogs,
  isRunBusy,
  activeIndicatorLastUpdateAt,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '2'])); // Default expanded folders
  const [consoleOutput, setConsoleOutput] = useState<
    { type: 'info' | 'success' | 'error'; text: string }[]
  >(
    externalLogs && externalLogs.length
      ? externalLogs
      : [
          {
            type: 'info',
            text: "> Console attached. Run a Lean backtest to see output.",
          },
        ]
  );

  useEffect(() => {
    if (externalLogs && externalLogs.length) {
      setConsoleOutput(externalLogs);
    }
  }, [externalLogs]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteFile) return;
    const target = files.find((f) => f.id === id);
    const label = target?.name || 'this item';
    // confirmacao leve para evitar deletes acidentais
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete "${label}" from workspace?`);
    if (!ok) return;
    onDeleteFile(id);
  };

  const handleRename = (id: string, currentName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onRenameFile) return;
      const next = window.prompt('Rename item:', currentName);
      if (!next) return;
      const trimmed = next.trim();
      if (!trimmed || trimmed === currentName) return;
      onRenameFile(id, trimmed);
  };

  const handleFileClick = (id: string) => {
      onSelectFile(id);
  };

  const toggleFolder = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(id)) {
          newExpanded.delete(id);
      } else {
          newExpanded.add(id);
      }
      setExpandedFolders(newExpanded);
  };

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId && f.type === 'file'),
    [files, activeFileId]
  );

  const resolveParentFolderName = (file?: FileNode) => {
    if (!file) return 'root';
    if (!file.parentId) return 'root';
    const parent = files.find((f) => f.id === file.parentId);
    if (!parent) return 'root';
    if (parent.type === 'folder') return parent.name;
    if (!parent.parentId) return 'root';
    const grand = files.find((f) => f.id === parent.parentId);
    return grand && grand.type === 'folder' ? grand.name : 'root';
  };

  const isIndicatorFile = (node: FileNode): boolean => {
    if (node.type !== 'file') return false;
    let current: FileNode | undefined = node;
    // walk up until root to see if under "indicators" folder
    while (current && current.parentId) {
      const parent = files.find((f) => f.id === current.parentId);
      if (!parent) break;
      if (!parent.parentId && parent.type === 'folder' && parent.name === 'indicators') {
        return true;
      }
      current = parent;
    }
    return false;
  };

  const activeCode = activeFile ? code : '';
  const activeIsIndicator = activeFile ? isIndicatorFile(activeFile) : false;
  const activeIndicatorOn = !!(activeFile && activeFile.indicatorActive);

  const handleToggleActiveIndicator = async () => {
    if (!activeFile || !activeIsIndicator || !onToggleIndicatorActive) return;
    const nextActive = !activeIndicatorOn;
    try {
      await Promise.resolve(onToggleIndicatorActive(activeFile.id, nextActive));
      setConsoleOutput((prev) => [
        ...prev,
        {
          type: 'success',
          text: `> Indicator ${activeFile.name} is now ${nextActive ? 'active' : 'inactive'} on chart.`,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error && typeof error.message === 'string'
          ? error.message
          : 'Failed to update indicator state.';
      setConsoleOutput((prev) => [
        ...prev,
        {
          type: 'error',
          text: `> Failed to toggle indicator "${activeFile.name}": ${message}`,
        },
      ]);
    }
  };

  const handleSaveActive = () => {
    if (!activeFile) return;
    onSave();
    setConsoleOutput((prev) => [
      ...prev,
      {
        type: 'info',
        text: `> Saved ${activeFile.name} (${activeCode.length} chars)`,
      },
    ]);
  };

  const handleRunActive = () => {
    if (!activeFile) return;
    onRun();
    setConsoleOutput((prev) => [
      ...prev,
      {
        type: 'info',
        text: `> Running ${activeFile.name}...`,
      },
      {
        type: 'success',
        text: '> Mock run completed.',
      },
    ]);
  };

  const handleCopyActive = async () => {
    if (!activeFile || !activeCode) return;
    try {
      await navigator.clipboard.writeText(activeCode);
      setConsoleOutput((prev) => [
        ...prev,
        { type: 'success', text: `> Copied ${activeFile.name} to clipboard.` },
      ]);
    } catch {
      setConsoleOutput((prev) => [
        ...prev,
        { type: 'info', text: `> Failed to copy ${activeFile.name} to clipboard.` },
      ]);
    }
  };

  const handleDownloadActive = () => {
    if (!activeFile || !activeCode) return;
    try {
      const blob = new Blob([activeCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeFile.name || 'strategy.py';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setConsoleOutput((prev) => [
        ...prev,
        { type: 'success', text: `> Downloaded ${activeFile.name}.` },
      ]);
    } catch {
      setConsoleOutput((prev) => [
        ...prev,
        { type: 'info', text: `> Failed to download ${activeFile.name}.` },
      ]);
    }
  };

  const renderTree = (parentId?: string, depth = 0) => {
      const nodes = files.filter(f => f.parentId === parentId);
      
      // Sort: Folders first, then files
      nodes.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
      });

      if (nodes.length === 0) return null;

      return nodes.map(node => {
          const isExpanded = expandedFolders.has(node.id);
          const paddingLeft = depth * 12 + 12;
          const isIndicator = isIndicatorFile(node);

          return (
              <div key={node.id}>
                  <div 
                      onClick={(e) => node.type === 'folder' ? toggleFolder(node.id, e) : handleFileClick(node.id)}
                      className={`
                          group relative flex items-center gap-2 py-1.5 pr-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 select-none
                          ${node.active ? 'bg-sky-50 text-sky-700' : 'hover:bg-slate-50 text-slate-600'}
                      `}
                      style={{ paddingLeft: `${paddingLeft}px` }}
                  >
                      {/* Icon & Arrow */}
                      <span className="shrink-0 flex items-center gap-1.5 min-w-[24px]">
                           {node.type === 'folder' && (
                               <span className="text-slate-400">
                                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                               </span>
                           )}
                           {node.type === 'folder' ? (
                               <Folder size={14} className="text-yellow-400 fill-yellow-400/20" />
                           ) : (
                               <div className={node.active ? 'text-sky-500' : 'text-slate-400'}>
                                   {node.name.endsWith('.json') ? <FileCode size={14} /> : <File size={14} />}
                               </div>
                           )}
                      </span>

                      {/* Name */}
                      <span className="truncate">{node.name}</span>
                      
                      {/* Indicator active dot (workspace-only) */}
                      {isIndicator && node.indicatorActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto mr-1 animate-in zoom-in"></div>
                      )}

                      {/* Hover Actions */}
                      <div className={`absolute right-1 flex items-center gap-1 ${node.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity bg-white/60 backdrop-blur-[2px] rounded-md pl-1`}>
                          <button 
                              onClick={(e) => handleRename(node.id, node.name, e)}
                              className="p-1 hover:bg-white rounded text-slate-400 hover:text-sky-500 transition-colors"
                              title="Rename"
                          >
                              <Edit2 size={10} />
                          </button>
                          <button 
                              onClick={(e) => handleDelete(node.id, e)}
                              className="p-1 hover:bg-white rounded text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                          >
                              <Trash2 size={10} />
                          </button>
                      </div>
                  </div>

                  {/* Recursively render children */}
                  {node.type === 'folder' && isExpanded && (
                      <div className="animate-in slide-in-from-top-1 fade-in duration-200 origin-top">
                          {renderTree(node.id, depth + 1)}
                      </div>
                  )}
              </div>
          );
      });
  };

  return (
    <div className="h-full flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* File Tree / Sidebar */}
      <div className="w-64 bg-white rounded-[2rem] shadow-soft p-6 flex flex-col hidden lg:flex">
         <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="font-bold text-slate-800">Workspace</h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onCreateFile}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-sky-500 transition-colors"
                title="New strategy file"
              >
                <Plus size={16} />
              </button>
              {onCreateIndicatorFile && (
                <button
                  type="button"
                  onClick={onCreateIndicatorFile}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-500 transition-colors"
                  title="New indicator file"
                >
                  <FileCode size={16} />
                </button>
              )}
              {onImportFromFile && (
                <label
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
                  title="Import .py file"
                >
                  <Upload size={16} />
                  <input
                    type="file"
                    accept=".py,.txt"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const content = String(reader.result || '');
                        onImportFromFile(file.name, content);
                      };
                      reader.readAsText(file);
                      // reset para permitir importar o mesmo arquivo de novo
                      // eslint-disable-next-line no-param-reassign
                      event.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -ml-2">
            {renderTree()}
         </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-2xl shadow-soft flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <span className="flex items-center gap-1">
                  <Folder size={12} className="text-yellow-400 fill-yellow-400/20" />
                  {resolveParentFolderName(activeFile || undefined)}
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800 font-bold">{activeFile?.name || 'No file selected'}</span>
              </div>
              {activeFile && activeIsIndicator && (
                <button
                  type="button"
                  onClick={handleToggleActiveIndicator}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors ${
                    activeIndicatorOn
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                  title={activeIndicatorOn ? 'Deactivate indicator on chart' : 'Activate indicator on chart'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeIndicatorOn ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>{activeIndicatorOn ? 'Active' : 'Inactive'}</span>
                </button>
              )}
              {activeFile && activeIsIndicator && activeIndicatorLastUpdateAt && (
                <span
                  className="text-[10px] text-slate-400"
                  title="Updated automatically when you save this indicator or its dependencies."
                >
                  Last update at{' '}
                  {new Date(activeIndicatorLastUpdateAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              )}
           </div>

           <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyActive}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Copy"
                disabled={!activeFile}
              >
                <Copy size={18} />
              </button>
              <button
                type="button"
                onClick={handleDownloadActive}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Download"
                disabled={!activeFile}
              >
                <Download size={18} />
              </button>
              <button
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Save"
                onClick={handleSaveActive}
                disabled={!activeFile}
              >
                <Save size={18} />
              </button>
              <button
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl ml-2 disabled:opacity-50 disabled:hover:bg-slate-900/80"
                onClick={handleRunActive}
                disabled={!activeFile || isRunBusy}
              >
                <Play size={16} fill="white" />
                {isRunBusy ? 'Running...' : 'Run'}
              </button>
           </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-soft p-0 overflow-hidden flex flex-col relative">
          <div className="flex-1 min-h-0">
            <PythonEditor
              value={activeCode}
              onChange={(next) => {
                if (!activeFile) return;
                onChangeCode(next);
              }}
              placeholder="Write your Python strategy or indicator here..."
              errorLines={errorLines}
              className="h-full"
            />
          </div>
           
           {/* Terminal / Console Overlay */}
           <StrategyConsole logs={consoleOutput} onClear={() => setConsoleOutput([])} />
        </div>
      </div>
    </div>
  );
};
