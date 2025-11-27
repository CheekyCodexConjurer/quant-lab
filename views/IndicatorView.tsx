import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  FileCode,
  Upload,
  Save,
  Code,
  RefreshCcw,
  Folder,
  FileText,
  MoreHorizontal,
  Copy,
} from 'lucide-react';
import { CustomIndicator } from '../types';
import { useToast } from '../components/common/Toast';
import { DEFAULT_INDICATOR_CODE } from '../utils/indicators';
import { apiClient } from '../services/api/client';
import { MainContent } from '../components/layout/MainContent';

type IndicatorViewProps = {
  indicators: CustomIndicator[];
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  activeIndicator: CustomIndicator | null;
  createIndicator: (folderPath?: string) => void;
  deleteIndicator: (id: string) => void;
  saveIndicator: (id: string, code: string, name?: string, filePathOverride?: string) => Promise<void> | void;
  toggleActiveIndicator: (id: string) => void;
  refreshFromDisk: (id: string) => Promise<void> | void;
};

export const IndicatorView: React.FC<IndicatorViewProps> = ({
  indicators,
  selectedIndicatorId,
  setSelectedIndicatorId,
  activeIndicator,
  createIndicator,
  deleteIndicator,
  saveIndicator,
  toggleActiveIndicator,
  refreshFromDisk,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });
  const [pathOverrides, setPathOverrides] = useState<Record<string, string>>({});
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [newFolderDraft, setNewFolderDraft] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('indicators');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const codeOverlayRef = useRef<HTMLPreElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  const addToast = useToast();

  const highlightPython = (code: string) => {
    const safe = code || '';
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const keywords = new Set([
      'def',
      'return',
      'if',
      'elif',
      'else',
      'for',
      'while',
      'import',
      'from',
      'as',
      'pass',
      'break',
      'continue',
      'class',
      'with',
      'yield',
      'try',
      'except',
      'finally',
      'raise',
      'in',
      'is',
      'None',
      'True',
      'False',
    ]);

    const pattern =
      /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/gm;

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(safe)) !== null) {
      const [token] = match;
      result += escape(safe.slice(lastIndex, match.index));

      if (token.startsWith('#')) {
        result += `<span style="color:#334155">${escape(token)}</span>`;
      } else if (token.startsWith('"') || token.startsWith("'")) {
        result += `<span style="color:#0b3b82">${escape(token)}</span>`;
      } else if (/^\d/.test(token)) {
        result += `<span style="color:#0b2a4a">${escape(token)}</span>`;
      } else if (keywords.has(token)) {
        result += `<span style="color:#0f172a;font-weight:700">${escape(token)}</span>`;
      } else {
        result += escape(token);
      }

      lastIndex = match.index + token.length;
    }

    result += escape(safe.slice(lastIndex));
    return result;
  };

  const syncScroll = () => {
    if (codeOverlayRef.current && codeInputRef.current) {
      codeOverlayRef.current.scrollTop = codeInputRef.current.scrollTop;
      codeOverlayRef.current.scrollLeft = codeInputRef.current.scrollLeft;
    }
  };

  const handleRefreshFromDisk = async () => {
    if (!selectedIndicatorId) return;
    try {
      await refreshFromDisk(selectedIndicatorId);
      addToast('Indicator reloaded from disk.', 'success');
    } catch (error) {
      addToast('Failed to reload indicator from disk.', 'error');
      console.warn('[indicator] refreshFromDisk failed', error);
    }
  };

  const handleSave = async () => {
    if (!selectedIndicatorId || !activeIndicator) return;
    setIsSaving(true);
    try {
      await saveIndicator(selectedIndicatorId, activeIndicator.code || DEFAULT_INDICATOR_CODE, activeIndicator.name);
      addToast('Indicator saved, applied to chart, and file updated.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  type TreeNode = {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'folder';
    indicatorId?: string;
    children?: TreeNode[];
    depth: number;
  };

  const normalizedPath = (value: string | null | undefined = '') =>
    String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

  const toRepoRelative = (value: string | null | undefined) => {
    const clean = normalizedPath(value).replace(/^[a-zA-Z]:/, '');
    const segments = clean.split('/').filter(Boolean);
    const roots = ['indicators', 'strategies', 'config'];
    const rootIndex = segments.findIndex((seg) => roots.includes(seg.toLowerCase()));
    const relativeSegments =
      rootIndex >= 0 ? segments.slice(rootIndex) : segments.length ? segments.slice(Math.max(segments.length - 2, 0)) : [];
    return relativeSegments.join('/');
  };

  const normalizeFolder = (folder?: string) => {
    const rel = toRepoRelative(folder || 'indicators');
    if (!rel) return 'indicators';
    return rel.toLowerCase().startsWith('indicators') ? rel : `indicators/${rel}`;
  };

  const deriveFilePath = (indicator: CustomIndicator) => {
    const base = pathOverrides[indicator.id] || indicator.filePath || `${indicator.name || indicator.id}.py`;
    const rel = toRepoRelative(base || `${indicator.id}.py`);
    return rel || `${indicator.id}.py`;
  };

  const absolutePathFor = (indicator: CustomIndicator) => indicator.filePath || deriveFilePath(indicator);

  const truncateMiddle = (value: string, max = 40) => {
    if (!value) return '';
    if (value.length <= max) return value;
    const head = value.slice(0, Math.floor(max / 2) - 2);
    const tail = value.slice(value.length - Math.ceil(max / 2) + 2);
    return `${head}...${tail}`;
  };

  const buildTree = useMemo(() => {
    const folders = new Set<string>(['']);
    extraFolders.forEach((f) => folders.add(normalizedPath(f)));

    const files = indicators.map((indicator) => {
      const fullPath = deriveFilePath(indicator);
      const segments = fullPath.split('/').filter(Boolean);
      // register parent folders
      segments.slice(0, -1).forEach((_, idx) => {
        const folderPath = segments.slice(0, idx + 1).join('/');
        folders.add(folderPath);
      });
      return { indicator, path: fullPath };
    });

    const nodeMap = new Map<string, TreeNode>();
    const ensureFolder = (path: string): TreeNode => {
      const clean = normalizedPath(path);
      if (nodeMap.has(clean)) return nodeMap.get(clean)!;
      const segments = clean ? clean.split('/') : [];
      const name = segments.length ? segments[segments.length - 1] : 'root';
      const depth = segments.length;
      const node: TreeNode = { id: clean || 'root', name, path: clean, type: 'folder', children: [], depth };
      nodeMap.set(clean, node);
      if (clean !== '') {
        const parentPath = segments.slice(0, -1).join('/');
        const parent = ensureFolder(parentPath);
        parent.children = parent.children || [];
        parent.children.push(node);
      }
      return node;
    };

    folders.forEach((f) => ensureFolder(f));

    files.forEach(({ indicator, path }) => {
      const segments = path.split('/').filter(Boolean);
      const name = segments[segments.length - 1] || indicator.name || indicator.id;
      const parentPath = segments.slice(0, -1).join('/');
      const parent = ensureFolder(parentPath);
      parent.children = parent.children || [];
      parent.children.push({
        id: indicator.id,
        name,
        path,
        type: 'file',
        indicatorId: indicator.id,
        depth: parent.depth + 1,
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

    const root = nodeMap.get('root') || nodeMap.get('') || { id: 'root', name: 'root', path: '', type: 'folder', depth: 0, children: [] };
    return { root: { ...root, children: sortNodes(root.children || []) } };
  }, [indicators, pathOverrides, extraFolders]);

  const toggleExpand = (path: string) => {
    const key = path || 'root';
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNewFolderConfirm = () => {
    if (!newFolderDraft || !newFolderDraft.trim()) {
      setNewFolderDraft(null);
      return;
    }
    const clean = normalizedPath(newFolderDraft.trim());
    if (clean && !extraFolders.includes(clean)) {
      setExtraFolders((prev) => [...prev, clean]);
    }
    setNewFolderDraft(null);
  };

  const handleRename = (targetPath: string, nextName: string) => {
    if (!nextName.trim()) {
      setRenaming(null);
      return;
    }
    const cleanName = normalizedPath(nextName.trim());
    const segments = targetPath.split('/').filter(Boolean);
    if (segments.length === 0) {
      setRenaming(null);
      return;
    }
    const parentPath = segments.slice(0, -1).join('/');
    const isFolder = extraFolders.includes(targetPath);
    const newPath = normalizedPath(parentPath ? `${parentPath}/${cleanName}` : cleanName);
    if (isFolder) {
      setExtraFolders((prev) => prev.map((f) => (f === targetPath ? newPath : f)));
      setPathOverrides((prev) => {
        const updated: Record<string, string> = {};
        Object.entries(prev).forEach(([id, p]) => {
          if (p.startsWith(`${targetPath}/`)) {
            updated[id] = p.replace(targetPath, newPath);
          } else {
            updated[id] = p;
          }
        });
        return updated;
      });
    } else {
      const indicator = indicators.find((i) => deriveFilePath(i) === targetPath);
      if (indicator) {
        const filename = cleanName.endsWith('.py') ? cleanName : `${cleanName}.py`;
        setPathOverrides((prev) => ({ ...prev, [indicator.id]: normalizedPath(parentPath ? `${parentPath}/${filename}` : filename) }));
      }
    }
    setRenaming(null);
  };

  const handleDragStart = (event: React.DragEvent, node: TreeNode) => {
    if (node.type !== 'file') return;
    event.dataTransfer.setData('text/plain', node.path);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent, target: TreeNode) => {
    event.preventDefault();
    if (target.type !== 'folder') return;
    const fromPath = event.dataTransfer.getData('text/plain');
    if (!fromPath) return;
    const indicator = indicators.find((i) => deriveFilePath(i) === fromPath);
    if (!indicator) return;
    const filename = fromPath.split('/').pop() || fromPath;
    const destPath = normalizedPath(target.path ? `${target.path}/${filename}` : filename);
    if (destPath === fromPath) return;
    setPathOverrides((prev) => ({ ...prev, [indicator.id]: destPath }));
    if (target.path && !extraFolders.includes(target.path)) {
      setExtraFolders((prev) => [...prev, target.path]);
    }
    setExpanded((prev) => ({ ...prev, [target.path || 'root']: true }));
  };

  const renderTree = (nodes: TreeNode[], depth = 0) =>
    nodes.map((node) => {
      const isFile = node.type === 'file';
      const isOpen = expanded[node.path || 'root'] ?? true;
      const isActive = isFile && selectedIndicatorId === node.indicatorId;
      const indent = depth * 12;
      const indicatorForNode = isFile && node.indicatorId ? indicators.find((i) => i.id === node.indicatorId) : null;
      const fullPathForNode = indicatorForNode ? absolutePathFor(indicatorForNode) : node.path;
          const onRowKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (isFile && node.indicatorId) {
            setSelectedIndicatorId(node.indicatorId);
          } else if (!isFile) {
            toggleExpand(node.path);
            setSelectedFolder(node.path || 'indicators');
          }
        }
        if (event.key === 'F2') {
          event.preventDefault();
          setRenaming(node.path);
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const rows = Array.from(document.querySelectorAll('[data-file-row="true"]')) as HTMLElement[];
          const currentIndex = rows.findIndex((el) => el === event.currentTarget);
          const nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
          const next = rows[nextIndex];
          if (next) {
            event.preventDefault();
            next.focus();
          }
        }
      };

      return (
        <div key={node.path || node.id} className="space-y-1">
          <div
            data-file-row="true"
            tabIndex={0}
            onKeyDown={onRowKeyDown}
            draggable={isFile}
            onDragStart={(e) => handleDragStart(e, node)}
            onDragOver={(e) => {
              if (!isFile) {
                e.preventDefault();
                setDragOverPath(node.path);
              }
            }}
            onDragLeave={() => {
              if (!isFile) setDragOverPath(null);
            }}
            onDrop={(e) => {
              handleDrop(e, node);
              setDragOverPath(null);
            }}
            className={`group flex items-center justify-between cursor-pointer px-3 py-1.5 text-sm ${
              isActive ? 'bg-slate-50 border-l-2 border-l-slate-900' : 'hover:bg-slate-50/70 border-l-2 border-l-transparent'
            } ${dragOverPath === node.path ? 'ring-1 ring-slate-300' : ''}`}
            style={{ paddingLeft: 12 + indent }}
            onClick={() => {
              if (isFile && node.indicatorId) {
                setSelectedIndicatorId(node.indicatorId);
              } else if (!isFile) {
                toggleExpand(node.path);
                setSelectedFolder(node.path || 'indicators');
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {node.type === 'folder' ? (
                <Folder size={14} className="text-slate-500" />
              ) : (
                <FileText size={14} className="text-slate-500" />
              )}
              {renaming === node.path ? (
                <input
                  autoFocus
                  defaultValue={node.name.replace('.py', '')}
                  onBlur={(e) => handleRename(node.path, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename(node.path, (e.target as HTMLInputElement).value);
                    }
                    if (e.key === 'Escape') {
                      setRenaming(null);
                    }
                  }}
                  className="text-sm bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
                />
              ) : (
                <span className={`truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{node.name}</span>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {isFile && node.indicatorId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleActiveIndicator(node.indicatorId!);
                }}
                className={`h-7 w-7 flex items-center justify-center rounded ${
                  indicators.find((i) => i.id === node.indicatorId && i.isActive)
                    ? 'text-emerald-500'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
                title="Toggle active"
              >
                  <CheckCircle2 size={14} />
                </button>
              ) : null}
              <div className="relative" ref={menuPath === node.path ? menuRef : undefined}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuPath((prev) => (prev === node.path ? null : node.path));
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  title="More"
                  aria-haspopup="true"
                  aria-expanded={menuPath === node.path}
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuPath === node.path && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-sm shadow-sm z-20 text-xs text-slate-700">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming(node.path);
                        setMenuPath(null);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={(e) => {
                        e.stopPropagation();
                    if (fullPathForNode) {
                      navigator.clipboard.writeText(fullPathForNode);
                      addToast('Full path copied', 'info');
                    }
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
                        if (node.indicatorId && window.confirm('Delete this file?')) {
                          deleteIndicator(node.indicatorId);
                          if (selectedIndicatorId === node.indicatorId) {
                            setSelectedIndicatorId(null);
                          }
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
          </div>
          {node.type === 'folder' && isOpen && node.children?.length ? (
            <div className="flex flex-col">{renderTree(node.children, depth + 1)}</div>
          ) : null}
          {node.type === 'folder' && isOpen && newFolderDraft !== null && depth === 0 && node.path === '' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm" style={{ paddingLeft: 12 + 12 }}>
              <Folder size={14} className="text-slate-500" />
              <input
                autoFocus
                value={newFolderDraft}
                onChange={(e) => setNewFolderDraft(e.target.value)}
                onBlur={handleNewFolderConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewFolderConfirm();
                  if (e.key === 'Escape') setNewFolderDraft(null);
                }}
                className="text-sm bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-800"
                placeholder="folder-name"
              />
            </div>
          ) : null}
        </div>
      );
    });

  const hasActiveIndicator = Boolean(selectedIndicatorId && activeIndicator);

  const displayFilePath = hasActiveIndicator && activeIndicator
    ? activeIndicator.filePath || deriveFilePath(activeIndicator)
    : '';
  const entryPathDisplay = displayFilePath ? truncateMiddle(displayFilePath, 42) : 'Select a file...';
  const isIndicatorActive = hasActiveIndicator && activeIndicator ? activeIndicator.isActive : false;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPath(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string) || '';
      const baseName = file.name.endsWith('.py') ? file.name : `${file.name}.py`;
      const folder = selectedFolder && selectedFolder.trim().length ? selectedFolder : 'indicators';
      let destPath = `${folder.replace(/\\/g, '/').replace(/\/+$/, '')}/${baseName}`;
      const exists = indicators.some((ind) => toRepoRelative(ind.filePath).toLowerCase() === destPath.toLowerCase());
      if (exists) {
        const overwrite = window.confirm('File exists. Overwrite? Cancel to save with suffix.');
        if (!overwrite) {
          const suffix = `_${Math.floor(Date.now() / 1000)}`;
          destPath = destPath.replace(/\.py$/, `${suffix}.py`);
        }
      }
      try {
        const response = await apiClient.uploadIndicator({ code: content, filePath: destPath });
        const item = response.item;
        const newId = item?.id || destPath;
        setExpanded((prev) => ({ ...prev, [folder || 'root']: true }));
        setSelectedIndicatorId(newId);
        await refreshFromDisk(newId);
      } catch (err) {
        addToast('Failed to import file', 'error');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <MainContent direction="row" className="gap-6 items-stretch h-full">
      <div className="w-72 h-full min-h-0 flex flex-col bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-sm font-semibold text-slate-900">Repository</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewFolderDraft('')}
              className="h-8 w-8 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-600 transition-colors"
              title="New folder"
            >
              <Folder size={14} />
            </button>
            <button
              onClick={() => createIndicator(selectedFolder)}
              className="h-8 w-8 flex items-center justify-center bg-white hover:bg-slate-50 rounded border border-slate-200 text-slate-600 transition-colors"
              title="New file"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {buildTree.root.children && buildTree.root.children.length ? (
            renderTree(buildTree.root.children)
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">No files yet.</div>
          )}
          {newFolderDraft !== null && buildTree.root.children && buildTree.root.children.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-1.5 text-sm">
              <Folder size={14} className="text-slate-500" />
              <input
                autoFocus
                value={newFolderDraft}
                onChange={(e) => setNewFolderDraft(e.target.value)}
                onBlur={handleNewFolderConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewFolderConfirm();
                  if (e.key === 'Escape') setNewFolderDraft(null);
                }}
                className="text-sm bg-white border border-slate-300 rounded px-2 py-1 text-slate-800"
                placeholder="folder-name"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="w-full h-full bg-white border border-slate-200 flex flex-col shadow-sm flex-1 relative min-h-0">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-slate-400" />
                <input
                  type="text"
                  value={hasActiveIndicator && activeIndicator ? activeIndicator.name : ''}
                  placeholder="Select a file..."
                  disabled={!hasActiveIndicator}
                  onChange={(event) => {
                    if (hasActiveIndicator && selectedIndicatorId && activeIndicator) {
                      saveIndicator(selectedIndicatorId, activeIndicator.code, event.target.value);
                    }
                  }}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-48 transition-colors py-0.5 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <span
                className="px-2.5 py-1 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded-sm flex items-center gap-1"
                title={displayFilePath || undefined}
              >
                <span className={`${displayFilePath ? '' : 'text-slate-400'}`}>{entryPathDisplay}</span>
                <button
                  onClick={() => {
                    if (displayFilePath) {
                      navigator.clipboard.writeText(displayFilePath);
                      addToast('Path copied', 'info');
                    }
                  }}
                  disabled={!displayFilePath}
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
              {hasActiveIndicator && activeIndicator?.hasUpdate && (
                <button
                  onClick={handleRefreshFromDisk}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                >
                  <RefreshCcw size={12} /> Update Available
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (hasActiveIndicator && selectedIndicatorId) {
                    toggleActiveIndicator(selectedIndicatorId);
                  }
                }}
                disabled={!hasActiveIndicator}
                className={`h-9 px-3 flex items-center gap-2 rounded-full text-[10px] font-semibold border transition-colors ${
                  isIndicatorActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                } disabled:opacity-60`}
              >
                {isIndicatorActive ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                {isIndicatorActive ? 'Active' : 'Add to Chart'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasActiveIndicator}
                className="h-9 px-3 flex items-center gap-2 text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                <Save size={12} /> {isSaving ? 'Saving...' : 'Save & Apply'}
              </button>
            </div>
          </div>

          <div className="flex-1 relative min-h-0">
            {hasActiveIndicator && activeIndicator ? (
              (() => {
                const displayCode = activeIndicator.code || DEFAULT_INDICATOR_CODE;
                return (
                  <>
                    <pre
                      ref={codeOverlayRef}
                      aria-hidden
                      className="absolute inset-0 m-0 p-6 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap overflow-auto pointer-events-none z-10"
                      dangerouslySetInnerHTML={{ __html: highlightPython(displayCode) }}
                    />
                    <textarea
                      ref={codeInputRef}
                      value={displayCode}
                      onChange={(event) => saveIndicator(selectedIndicatorId!, event.target.value)}
                      onScroll={syncScroll}
                      className="absolute inset-0 w-full h-full p-6 font-mono text-sm leading-relaxed text-transparent caret-slate-900 bg-transparent outline-none resize-none overflow-auto selection:bg-slate-200 z-0"
                      spellCheck={false}
                    />
                  </>
                );
              })()
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Code size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainContent>
  );
};
