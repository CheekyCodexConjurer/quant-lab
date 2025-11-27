
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  Code,
  RefreshCcw,
  Save,
  Play,
  Activity,
  Folder,
  FileText,
  Upload,
  Plus,
  Copy,
  MoreHorizontal,
  FilePlus2,
} from 'lucide-react';
import { StrategyFile } from '../types';
import { useToast } from '../components/common/Toast';
import { MainContent } from '../components/layout/MainContent';

type StrategyViewProps = {
  onRunLeanBacktest: () => void;
  onNavigateToChart: () => void;
  strategies: StrategyFile[];
  selectedStrategyId: string | null;
  setSelectedStrategyId: (id: string | null) => void;
  activeStrategy: StrategyFile | null;
  createStrategy: (folderPath?: string, nameOverride?: string, code?: string) => Promise<void> | void;
  importStrategy: (filePath: string, code: string) => Promise<void> | void;
  deleteStrategy: (id: string) => Promise<void> | void;
  refreshFromDisk: (id: string) => Promise<void> | void;
  saveStrategy: (id: string, code: string) => Promise<void> | void;
  updateStrategyPath: (id: string, nextPath: string) => Promise<void> | void;
  onSave: (code: string) => Promise<void> | void;
  leanStatus: 'idle' | 'queued' | 'running' | 'completed' | 'error';
  leanLogs: string[];
  leanJobId: string | null;
  leanError?: string | null;
  leanParams: { cash: number; feeBps: number; slippageBps: number };
  onLeanParamsChange: (next: { cash: number; feeBps: number; slippageBps: number }) => void;
};

type TreeNode = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  absolutePath?: string;
  children?: TreeNode[];
  depth: number;
};

const truncateMiddle = (value: string, max = 42) => {
  if (!value) return '';
  if (value.length <= max) return value;
  const head = value.slice(0, Math.floor(max / 2) - 2);
  const tail = value.slice(value.length - Math.ceil(max / 2) + 2);
  return `${head}...${tail}`;
};

const normalizePath = (value: string) =>
  String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

const toStrategyRelative = (value: string) => {
  const normalized = normalizePath(value);
  const parts = normalized.split('/').filter(Boolean);
  const strategiesIndex = parts.lastIndexOf('strategies');
  if (strategiesIndex >= 0) {
    return ['strategies', ...parts.slice(strategiesIndex + 1)].join('/');
  }
  if (!normalized) return 'strategies';
  return `strategies/${normalized}`;
};

const ensureStrategyFolder = (value?: string) => {
  const normalized = normalizePath(value || 'strategies');
  if (!normalized || normalized === 'strategies') return 'strategies';
  return toStrategyRelative(normalized);
};

const sanitizeName = (value: string, fallback = 'NewStrategy') => {
  const trimmed = value.trim().replace(/\.py$/i, '');
  const cleaned = trimmed.replace(/[^A-Za-z0-9_-]/g, '_');
  return cleaned || fallback;
};
export const StrategyView: React.FC<StrategyViewProps> = ({
  onRunLeanBacktest,
  onNavigateToChart,
  strategies,
  selectedStrategyId,
  setSelectedStrategyId,
  activeStrategy,
  createStrategy,
  importStrategy,
  deleteStrategy,
  refreshFromDisk,
  saveStrategy,
  updateStrategyPath,
  onSave,
  leanStatus,
  leanLogs,
  leanJobId,
  leanError,
  leanParams,
  onLeanParamsChange,
}) => {
  const [codeDraft, setCodeDraft] = useState(activeStrategy?.code ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ strategies: true });
  const [selectedFolder, setSelectedFolder] = useState<string>('strategies');
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [newFolderDraft, setNewFolderDraft] = useState<string | null>(null);
  const [newFolderParent, setNewFolderParent] = useState<string>('strategies');
  const [newFileDraft, setNewFileDraft] = useState<string | null>(null);
  const [newFileParent, setNewFileParent] = useState<string>('strategies');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const codeOverlayRef = useRef<HTMLPreElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsToggleRef = useRef<HTMLButtonElement | null>(null);
  const addToast = useToast();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<{ cash: number; feeBps: number; slippageBps: number }>({
    cash: leanParams.cash,
    feeBps: leanParams.feeBps,
    slippageBps: leanParams.slippageBps,
  });

  useEffect(() => {
    setCodeDraft(activeStrategy?.code ?? '');
  }, [activeStrategy?.code, activeStrategy?.id]);

  useEffect(() => {
    if (!menuPath) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPath(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuPath]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsOpen) return;
      const target = event.target as Node;
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        settingsToggleRef.current &&
        !settingsToggleRef.current.contains(target)
      ) {
        setSettingsOpen(false);
        setSettingsDraft({ cash: leanParams.cash, feeBps: leanParams.feeBps, slippageBps: leanParams.slippageBps });
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
        setSettingsDraft({ cash: leanParams.cash, feeBps: leanParams.feeBps, slippageBps: leanParams.slippageBps });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [settingsOpen, leanParams.cash, leanParams.feeBps, leanParams.slippageBps]);

  const handleSave = async () => {
    if (!activeStrategy) return;
    setIsSaving(true);
    try {
      await onSave(codeDraft);
      addToast('Strategy saved, applied, and file updated.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshFromDisk = async () => {
    if (!activeStrategy) return;
    try {
      await refreshFromDisk(activeStrategy.id);
      addToast('Strategy reloaded from disk.', 'success');
    } catch (error) {
      addToast('Failed to reload strategy from disk.', 'error');
      console.warn('[strategy] refreshFromDisk failed', error);
    }
  };

  const leanStatusTone =
    leanStatus === 'running' || leanStatus === 'queued'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
      : leanStatus === 'completed'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : leanStatus === 'error'
          ? 'bg-rose-50 text-rose-700 border-rose-100'
          : 'bg-slate-50 text-slate-600 border-slate-200';
  const leanStatusLabel =
    leanStatus === 'running'
      ? 'Running backtest...'
      : leanStatus === 'queued'
        ? 'Queued in Lean...'
        : leanStatus === 'completed'
          ? 'Completed'
          : leanStatus === 'error'
            ? 'Error'
            : 'Idle';
  const leanDotColor =
    leanStatus === 'running' || leanStatus === 'queued'
      ? 'bg-indigo-500'
      : leanStatus === 'completed'
        ? 'bg-emerald-500'
        : leanStatus === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-400';

  const activeStrategyId = activeStrategy?.id || null;
  const hasActiveStrategy = Boolean(selectedStrategyId && activeStrategy);
  const hasUpdate =
    activeStrategy && typeof activeStrategy.appliedVersion === 'number'
      ? activeStrategy.lastModified > activeStrategy.appliedVersion
      : false;

  const strategiesWithPaths = useMemo(
    () =>
      strategies.map((strategy) => {
        const absolutePath = normalizePath(strategy.filePath || '');
        const relativePath = toStrategyRelative(absolutePath || `${strategy.name || strategy.id}.py`);
        return { ...strategy, absolutePath: absolutePath || relativePath, relativePath };
      }),
    [strategies]
  );
  const tree = useMemo(() => {
    const root: TreeNode = { id: 'strategies', name: 'strategies', path: 'strategies', type: 'folder', children: [], depth: 0 };
    const byFolder: Record<string, TreeNode> = { strategies: root };

    const registerFolder = (folderPath: string) => {
      const rel = ensureStrategyFolder(folderPath);
      if (!rel) return;
      const parts = rel.split('/').filter(Boolean);
      let current = root;
      parts.forEach((seg, idx) => {
        const path = parts.slice(0, idx + 1).join('/');
        if (!byFolder[path]) {
          const node: TreeNode = {
            id: path,
            name: seg,
            path,
            type: 'folder',
            children: [],
            depth: idx + 1,
          };
          byFolder[path] = node;
          current.children = current.children || [];
          current.children.push(node);
        }
        current = byFolder[path];
      });
    };

    extraFolders.forEach((f) => registerFolder(f));

    strategiesWithPaths.forEach((strategy) => {
      const rel = ensureStrategyFolder(strategy.relativePath);
      const segments = rel.split('/').filter(Boolean);
      let current = root;
      segments.slice(0, -1).forEach((seg, idx) => {
        const folderPath = segments.slice(0, idx + 1).join('/');
        registerFolder(folderPath);
        current = byFolder[folderPath];
      });
      const fileName = segments[segments.length - 1];
      current.children = current.children || [];
      current.children.push({
        id: strategy.id,
        name: fileName,
        path: rel,
        absolutePath: strategy.absolutePath,
        type: 'file',
        depth: current.depth + 1,
      });
    });

    const sortNodes = (nodes: TreeNode[]) =>
      nodes
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((node) => ({
          ...node,
          children: node.children ? sortNodes(node.children) : undefined,
        }));

    return { root: { ...root, children: sortNodes(root.children || []) } };
  }, [strategiesWithPaths, extraFolders]);
  const renderTree = (nodes: TreeNode[], depth = 0) =>
    nodes.map((node) => {
      const isFile = node.type === 'file';
      const isOpen = expanded[node.path] ?? true;
      const isActive = isFile && node.id === activeStrategyId;
      const indent = depth * 12;
      const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (node.type !== 'folder') return;
        const fromPathRaw = e.dataTransfer.getData('text/plain');
        if (!fromPathRaw) return;
        const fromPath = ensureStrategyFolder(fromPathRaw);
        const dragStrategy = strategiesWithPaths.find((s) => ensureStrategyFolder(s.relativePath) === fromPath);
        if (!dragStrategy) return;
        const fileName = fromPath.split('/').pop() || fromPath;
        const targetBase = node.path === 'strategies' ? 'strategies' : ensureStrategyFolder(node.path);
        const targetPath = ensureStrategyFolder(`${targetBase}/${fileName}`);
        if (targetPath === fromPath || targetPath.startsWith(`${fromPath}/`)) return;
        await updateStrategyPath(dragStrategy.id, targetPath);
        setExpanded((prev) => ({ ...prev, [node.path]: true }));
        setSelectedFolder(node.path);
        setDragOverPath(null);
      };

      const onDragOver = (e: React.DragEvent) => {
        if (node.type === 'folder') {
          e.preventDefault();
          setDragOverPath(node.path);
        }
      };

      const onDragLeave = () => {
        if (node.type === 'folder') setDragOverPath(null);
      };

      const onDragStart = (e: React.DragEvent) => {
        if (isFile) {
          e.dataTransfer.setData('text/plain', node.path);
          e.dataTransfer.effectAllowed = 'move';
        }
      };

      const startRename = () => {
        if (isFile) {
          setRenamingPath(node.path);
        }
      };

      return (
        <div key={node.path} className="space-y-1">
          <div
            className={`group flex items-center justify-between cursor-pointer px-3 py-1.5 text-sm ${
              isActive ? 'bg-slate-50 border-l-2 border-l-slate-900' : 'hover:bg-slate-50/70 border-l-2 border-l-transparent'
            } ${dragOverPath === node.path ? 'ring-1 ring-slate-300 ring-offset-0' : ''}`}
            style={{ paddingLeft: 12 + indent }}
            draggable={isFile}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => {
              if (isFile) {
                setSelectedStrategyId(node.id);
              } else {
                setExpanded((prev) => ({ ...prev, [node.path]: !isOpen }));
                setSelectedFolder(node.path);
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {node.type === 'folder' ? <Folder size={14} className="text-slate-500" /> : <FileText size={14} className="text-slate-500" />}
              {renamingPath === node.path ? (
                <input
                  autoFocus
                  defaultValue={node.name.replace(/\.py$/, '')}
                  onBlur={(e) => {
                    const nextName = sanitizeName((e.target as HTMLInputElement).value);
                    setRenamingPath(null);
                    if (!nextName) return;
                    const parent = node.path.split('/').slice(0, -1).join('/') || 'strategies';
                    const nextPath = ensureStrategyFolder(`${parent}/${nextName}.py`);
                    if (nextPath !== node.path) {
                      updateStrategyPath(node.id, nextPath);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setRenamingPath(null);
                    }
                  }}
                  className="text-sm bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
                />
              ) : (
                <span className={`truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{node.name}</span>
              )}
            </div>
            {isFile ? (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <div className="relative" ref={menuPath === node.path ? menuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuPath((prev) => (prev === node.path ? null : node.path));
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                    title="More"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuPath === node.path && (
                    <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-sm shadow-sm z-20 text-xs text-slate-700">
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename();
                          setMenuPath(null);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          const toCopy = node.absolutePath || node.path;
                          navigator.clipboard.writeText(toCopy);
                          addToast('Full path copied', 'info');
                          setMenuPath(null);
                        }}
                      >
                        Copy full path
                      </button>
                      <div className="h-px bg-slate-100" />
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-rose-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this file?')) {
                            const wasActive = node.id === activeStrategyId;
                            Promise.resolve(deleteStrategy(node.id)).finally(() => {
                              if (wasActive) {
                                addToast('Strategy deleted. Moved to the next file.', 'info');
                              }
                            });
                          }
                          setMenuPath(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {node.type === 'folder' && isOpen ? (
            <div className="flex flex-col">
              {newFolderDraft !== null && newFolderParent === node.path ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm" style={{ paddingLeft: 24 + indent }}>
                  <Folder size={14} className="text-slate-500" />
                  <input
                    autoFocus
                    value={newFolderDraft}
                    onChange={(e) => setNewFolderDraft(e.target.value)}
                    onBlur={() => {
                      const relName = sanitizeName(newFolderDraft || '');
                      if (!relName) {
                        setNewFolderDraft(null);
                        return;
                      }
                      const rel = ensureStrategyFolder(`${node.path}/${relName}`);
                      setExtraFolders((prev) => (prev.includes(rel) ? prev : [...prev, rel]));
                      setExpanded((prev) => ({ ...prev, [rel]: true }));
                      setSelectedFolder(rel);
                      setNewFolderDraft(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                      if (e.key === 'Escape') {
                        setNewFolderDraft(null);
                      }
                    }}
                    className="text-sm bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                    placeholder="folder-name"
                  />
                </div>
              ) : null}
              {newFileDraft !== null && newFileParent === node.path ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm" style={{ paddingLeft: 24 + indent }}>
                  <FileText size={14} className="text-slate-500" />
                  <input
                    autoFocus
                    value={newFileDraft}
                    onChange={(e) => setNewFileDraft(e.target.value)}
                    onBlur={async (e) => {
                      const baseName = sanitizeName(e.target.value || '');
                      if (!baseName) {
                        setNewFileDraft(null);
                        return;
                      }
                      const folder = ensureStrategyFolder(node.path);
                      let targetName = baseName;
                      let targetPath = ensureStrategyFolder(`${folder}/${targetName}.py`);
                      const existingPaths = strategiesWithPaths.map((s) => ensureStrategyFolder(s.relativePath));
                      let suffix = 1;
                      while (existingPaths.includes(targetPath)) {
                        suffix += 1;
                        targetName = `${baseName}_${suffix}`;
                        targetPath = ensureStrategyFolder(`${folder}/${targetName}.py`);
                      }
                      await createStrategy(folder, targetName);
                      setExpanded((prev) => ({ ...prev, [folder]: true }));
                      setSelectedFolder(folder);
                      setNewFileDraft(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                      if (e.key === 'Escape') {
                        setNewFileDraft(null);
                      }
                    }}
                    className="text-sm bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                    placeholder="new-file.py"
                  />
                </div>
              ) : null}
              {node.children?.length ? renderTree(node.children, depth + 1) : null}
            </div>
          ) : null}
        </div>
      );
    });
  const handleNewFile = () => {
    const folder = ensureStrategyFolder(selectedFolder || 'strategies');
    setNewFileParent(folder);
    setNewFileDraft('');
    setExpanded((prev) => ({ ...prev, [folder]: true }));
    setSelectedFolder(folder);
  };

  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string) || '';
      const cleanName = sanitizeName(file.name.replace(/\.py$/i, ''), 'imported_strategy');
      const baseName = `${cleanName}.py`;
      const folder = ensureStrategyFolder(selectedFolder && selectedFolder.trim().length ? selectedFolder : 'strategies');
      let destPath = ensureStrategyFolder(`${folder}/${baseName}`);
      const existing = strategiesWithPaths.map((s) => ensureStrategyFolder(s.relativePath));
      if (existing.includes(destPath)) {
        const overwrite = window.confirm('A file with this name exists. Overwrite? Click Cancel to save with a suffix.');
        if (!overwrite) {
          let suffix = 1;
          while (existing.includes(destPath)) {
            destPath = ensureStrategyFolder(`${folder}/${cleanName}_${suffix}.py`);
            suffix += 1;
          }
        }
      }
      await importStrategy(destPath, content);
      addToast('Strategy imported', 'success');
      setExpanded((prev) => ({ ...prev, [folder]: true }));
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const entryRelativePath =
    hasActiveStrategy && activeStrategy ? toStrategyRelative(activeStrategy.filePath || `${activeStrategy.name || activeStrategy.id}.py`) : '';
  const entryFullPath = hasActiveStrategy && activeStrategy ? normalizePath(activeStrategy.filePath || entryRelativePath) : '';
  const entryPathDisplay = hasActiveStrategy && activeStrategy ? truncateMiddle(entryRelativePath, 42) : 'Select a file...';

  return (
    <MainContent direction="row" className="gap-6 items-stretch h-full">
      {/* Sidebar */}
      <div className="w-72 h-full min-h-0 flex flex-col bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-sm font-semibold text-slate-900">Strategies</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const folder = ensureStrategyFolder(selectedFolder || 'strategies');
                setNewFolderParent(folder);
                setNewFolderDraft('');
                setExpanded((prev) => ({ ...prev, [folder]: true }));
              }}
              className="h-8 w-8 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-600 transition-colors"
              title="New folder"
            >
              <Folder size={14} />
            </button>
            <button
              onClick={handleNewFile}
              className="h-8 w-8 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-600 transition-colors"
              title="New file"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {tree.root ? renderTree([tree.root]) : <div className="px-4 py-3 text-sm text-slate-500">No files yet.</div>}
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="bg-white border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={hasActiveStrategy && activeStrategy ? activeStrategy.name || activeStrategy.id : ''}
                    placeholder="Select a file..."
                    disabled={!hasActiveStrategy}
                    onChange={() => {}}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-48 transition-colors py-0.5 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <span
                  className="px-2.5 py-1 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded-sm flex items-center gap-1"
                  title={entryFullPath || undefined}
                >
                  <span className={`${entryFullPath ? '' : 'text-slate-400'}`}>{entryPathDisplay}</span>
                  <button
                    onClick={() => {
                      if (entryFullPath) {
                        navigator.clipboard.writeText(entryFullPath);
                        addToast('Full path copied', 'info');
                      }
                    }}
                    disabled={!entryFullPath}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-40"
                    title="Copy full path"
                  >
                    <Copy size={12} />
                  </button>
                </span>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={handleImport}
                  className="h-8 px-3 flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors rounded-sm border border-slate-200 bg-white"
                >
                  <Upload size={12} />
                  Import
                </button>
                <input ref={importInputRef} type="file" accept=".py,.txt" className="hidden" onChange={handleImportFile} />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onRunLeanBacktest}
                  disabled={!hasActiveStrategy || leanStatus === 'running' || leanStatus === 'queued'}
                  className={`h-9 px-3 flex items-center gap-2 rounded-full text-[10px] font-semibold border transition-colors ${
                    !hasActiveStrategy || leanStatus === 'running' || leanStatus === 'queued'
                      ? 'bg-white text-slate-400 border-slate-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  } disabled:opacity-60`}
                >
                  <Play size={12} />
                  {leanStatus === 'running' || leanStatus === 'queued' ? 'Running on Lean...' : 'Run on Lean'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasActiveStrategy}
                  className="h-9 px-3 flex items-center gap-2 text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Save size={12} /> {isSaving ? 'Saving...' : 'Save & Apply'}
                </button>
                <button
                  ref={settingsToggleRef}
                  onClick={() => {
                    if (settingsOpen) {
                      setSettingsDraft({ cash: leanParams.cash, feeBps: leanParams.feeBps, slippageBps: leanParams.slippageBps });
                      setSettingsOpen(false);
                    } else {
                      setSettingsDraft({ cash: leanParams.cash, feeBps: leanParams.feeBps, slippageBps: leanParams.slippageBps });
                      setSettingsOpen(true);
                    }
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-sm border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 bg-white transition-colors"
                  aria-haspopup="true"
                  aria-expanded={settingsOpen}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex-1 min-h-0">
              <div className="relative flex-1 min-h-[1100px]">
                {hasActiveStrategy ? (
                  <>
                    <pre
                      ref={codeOverlayRef}
                      aria-hidden
                      className="absolute inset-0 m-0 p-6 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap overflow-auto pointer-events-none border-b border-slate-100 z-10"
                      dangerouslySetInnerHTML={{ __html: (codeDraft || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') }}
                    />
                    <textarea
                      ref={codeInputRef}
                      value={codeDraft || ''}
                      onChange={(event) => setCodeDraft(event.target.value)}
                      onScroll={() => {
                        if (codeOverlayRef.current && codeInputRef.current) {
                          codeOverlayRef.current.scrollTop = codeInputRef.current.scrollTop;
                          codeOverlayRef.current.scrollLeft = codeInputRef.current.scrollLeft;
                        }
                      }}
                      className="absolute inset-0 w-full h-full p-6 font-mono text-sm leading-relaxed text-transparent caret-slate-900 bg-transparent outline-none border-b border-slate-100 resize-none overflow-auto selection:bg-slate-200 z-0"
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Code size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm flex flex-col">
            <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Lean Logs</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span>{leanStatusLabel}</span>
                {leanJobId ? <span className="text-slate-400">|</span> : null}
                {leanJobId ? <span className="font-mono text-slate-500">{leanJobId}</span> : null}
              </div>
            </div>
            <pre className="h-40 overflow-y-auto custom-scrollbar text-xs text-slate-700 bg-slate-50 px-6 py-3 border-t border-slate-100">
              {leanLogs && leanLogs.length ? leanLogs.slice(-200).join('\n') : 'No Lean logs yet. Start a Lean run to stream output.'}
            </pre>
          </div>

        </div>
      </div>
    </MainContent>
  );
};
