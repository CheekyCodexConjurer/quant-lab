import React, { useMemo, useRef, useState } from 'react';
import { Plus, CheckCircle2, FileCode, Upload, Save, RefreshCcw, FolderPlus, FileText, Copy, MoreVertical, Trash, Check } from 'lucide-react';
import { CustomIndicator } from '../types';
import { useToast } from '../components/common/Toast';
import { DEFAULT_INDICATOR_CODE } from '../utils/indicators';
import { MainContent } from '../components/layout/MainContent';
import { FileTree, FileTreeNode } from '../components/files/FileTree';
import { PythonEditor } from '../components/editor/PythonEditor';
import { ensureRootedPath, normalizeSlashes, toRelativePath, truncateMiddle } from '../utils/path';

type IndicatorViewProps = {
  indicators: CustomIndicator[];
  indicatorOrder: string[];
  setIndicatorOrder: (order: string[]) => void;
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  activeIndicator: CustomIndicator | null;
  createIndicator: (folderPath?: string) => void;
  deleteIndicator: (id: string) => void;
  saveIndicator: (id: string, code: string, name?: string, filePathOverride?: string) => Promise<void> | void;
  toggleActiveIndicator: (id: string) => void;
  refreshFromDisk: (id: string) => Promise<void> | void;
  updateIndicatorName: (id: string, name: string) => void;
};

const INDICATOR_ROOT = 'indicators';
const PANEL_WIDTH_CLASS = 'w-[13.5rem] min-w-[13.5rem] max-w-[15rem]';

const derivePath = (indicator: CustomIndicator) => {
  const base = indicator.filePath || `${indicator.name || indicator.id}.py`;
  const rooted = ensureRootedPath(INDICATOR_ROOT, base);
  const rel = toRelativePath(INDICATOR_ROOT, rooted);
  return rel ? `${INDICATOR_ROOT}/${rel}` : INDICATOR_ROOT;
};

const buildTree = (indicators: CustomIndicator[], extraFolders: string[], order: string[]): FileTreeNode => {
  const root: FileTreeNode = { id: INDICATOR_ROOT, name: INDICATOR_ROOT, path: INDICATOR_ROOT, type: 'folder', children: [] };
  const byFolder: Record<string, FileTreeNode> = { [INDICATOR_ROOT]: root };

  const registerFolder = (folderPath: string) => {
    const normalized = ensureRootedPath(INDICATOR_ROOT, folderPath);
    const rel = toRelativePath(INDICATOR_ROOT, normalized);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    let current = root;
    parts.forEach((segment, index) => {
      const currentPath = `${INDICATOR_ROOT}/${parts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = { id: currentPath, name: segment, path: currentPath, type: 'folder', children: [] };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
  };

  extraFolders.forEach(registerFolder);

  indicators.forEach((indicator) => {
    const fullPath = derivePath(indicator);
    const rel = toRelativePath(INDICATOR_ROOT, fullPath);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    const folderParts = parts.slice(0, -1);
    let current = root;
    folderParts.forEach((segment, index) => {
      const currentPath = `${INDICATOR_ROOT}/${folderParts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = { id: currentPath, name: segment, path: currentPath, type: 'folder', children: [] };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
    const fileName = parts[parts.length - 1] || `${indicator.name || indicator.id}.py`;
    current.children?.push({
      id: indicator.id,
      name: fileName,
      path: fullPath,
      type: 'file',
    });
  });

  const sortNodes = (nodes?: FileTreeNode[]) =>
    (nodes || [])
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        const idxA = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a.path));
        const idxB = order.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b.path));
        const weightA = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
        const weightB = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
        if (weightA !== weightB) return weightA - weightB;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortNodes(node.children) }));

  return { ...root, children: sortNodes(root.children) };
};

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

export const IndicatorView: React.FC<IndicatorViewProps> = ({
  indicators,
  indicatorOrder,
  setIndicatorOrder,
  selectedIndicatorId,
  setSelectedIndicatorId,
  activeIndicator,
  createIndicator,
  deleteIndicator,
  saveIndicator,
  toggleActiveIndicator,
  refreshFromDisk,
  updateIndicatorName,
}) => {
  const addToast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [INDICATOR_ROOT]: true });
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [actionMenuPath, setActionMenuPath] = useState<string | null>(null);
  const actionMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codeDraft, setCodeDraft] = useState(activeIndicator?.code || '');
  const [titleDraft, setTitleDraft] = useState(activeIndicator?.name || activeIndicator?.id || '');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const orderedPaths = useMemo(() => {
    const paths = indicators.map((indicator) => derivePath(indicator));
    return paths.sort((a, b) => {
      const idxA = indicatorOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a));
      const idxB = indicatorOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b));
      const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
      const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
      if (wa !== wb) return wa - wb;
      return a.localeCompare(b);
    });
  }, [indicators, indicatorOrder]);

  const tree = useMemo(() => buildTree(indicators, extraFolders, indicatorOrder), [indicators, extraFolders, indicatorOrder]);

  const activePath = activeIndicator ? derivePath(activeIndicator) : null;
  const entryPathDisplay = activePath ? truncateMiddle(toRelativePath(INDICATOR_ROOT, activePath), 42) : 'Select a file...';
  const entryFullPath = activePath ? normalizeSlashes(activePath) : '';

  const handleSave = async () => {
    if (!activeIndicator) return;
    setIsSaving(true);
    try {
      await saveIndicator(activeIndicator.id, codeDraft || DEFAULT_INDICATOR_CODE, activeIndicator.name, activeIndicator.filePath);
      addToast('Indicator saved, applied to chart, and file updated.', 'success');
    } finally {
      setIsSaving(false);
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

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeIndicator) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = String(reader.result || '');
      setCodeDraft(content);
      await saveIndicator(activeIndicator.id, content, activeIndicator.name, activeIndicator.filePath);
      addToast('Indicator imported and saved.', 'success');
    };
    reader.readAsText(file);
  };

  const handleNewIndicator = () => {
    const parent = activePath ? activePath.split('/').slice(0, -1).join('/') : INDICATOR_ROOT;
    createIndicator(parent);
    setExpanded((prev) => ({ ...prev, [parent || INDICATOR_ROOT]: true }));
  };

  const handleRename = (path: string, nextName: string) => {
    const indicator = indicators.find((item) => derivePath(item) === path);
    if (!indicator) return;
    const folder = path.split('/').slice(0, -1).join('/') || INDICATOR_ROOT;
    const sanitizedName = nextName.replace(/\.py$/i, '');
    const newPath = `${folder}/${sanitizedName}.py`;
    saveIndicator(indicator.id, codeDraft || indicator.code || DEFAULT_INDICATOR_CODE, sanitizedName, newPath);
    setRenamingPath(null);
  };

  const handleReorder = (fromPath: string, toPath: string) => {
    const normalizedFrom = normalizeSlashes(fromPath);
    const normalizedTo = normalizeSlashes(toPath);
    if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) return;
    const current = orderedPaths.filter(Boolean);
    const filtered = current.filter((p) => normalizeSlashes(p) !== normalizedFrom);
    const targetIdx = filtered.findIndex((p) => normalizeSlashes(p) === normalizedTo);
    if (targetIdx === -1) return;
    filtered.splice(targetIdx, 0, normalizedFrom);
    setIndicatorOrder(filtered);
  };

  React.useEffect(() => {
    setCodeDraft(activeIndicator?.code || '');
    setTitleDraft(activeIndicator?.name || activeIndicator?.id || '');
  }, [activeIndicator?.code, activeIndicator?.id, activeIndicator?.name]);

  return (
    <MainContent direction="row" className="gap-2 items-stretch h-full bg-transparent">
      <div className={`${PANEL_WIDTH_CLASS} shrink-0 h-full min-h-0 flex flex-col bg-[#fafafb] border border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-md`}>
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-center bg-slate-50/60">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExtraFolders((prev) => [...prev, `${INDICATOR_ROOT}/new_folder_${prev.length + 1}`])}
              className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-100/70 active:translate-y-[0.5px] rounded border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
              title="New folder"
            >
              <FolderPlus size={16} />
            </button>
            <button
              onClick={handleNewIndicator}
              className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-100/70 active:translate-y-[0.5px] rounded border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
              title="New indicator"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={!activeIndicator}
              className="h-7 w-7 flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
              title="Import"
            >
              <Upload size={16} />
            </button>
            <input ref={importInputRef} type="file" accept=".py,.txt" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <FileTree
            root={tree}
            expanded={expanded}
            onToggle={(path, next) => setExpanded((prev) => ({ ...prev, [path]: next }))}
            selectedPath={activePath}
            renamingPath={renamingPath}
            onRenameSubmit={handleRename}
            onRenameCancel={() => setRenamingPath(null)}
            onReorder={handleReorder}
            onSelect={(node) => {
              if (node.type === 'file') {
                const target = indicators.find((item) => derivePath(item) === node.path);
                if (target) {
                  setSelectedIndicatorId(target.id);
                  setCodeDraft(target.code || '');
                }
              }
            }}
            renderActions={(node) =>
              node.type === 'file' ? (
                <div
                  className="relative flex items-center gap-1.5"
                  onMouseEnter={() => {
                    if (actionMenuCloseTimer.current) {
                      clearTimeout(actionMenuCloseTimer.current);
                      actionMenuCloseTimer.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    actionMenuCloseTimer.current = setTimeout(() => {
                      setActionMenuPath((current) => (current === node.path ? null : current));
                    }, 150);
                  }}
                >
                  {indicators.find((item) => derivePath(item) === node.path && item.isActive) ? (
                    <div
                      className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.25)]"
                      title="Active"
                    />
                  ) : null}
                  <button
                    className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionMenuPath((prev) => (prev === node.path ? null : node.path));
                    }}
                    title="File actions"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <div
                    className={`absolute right-0 top-6 w-40 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-[11px] text-slate-700 transition duration-150 ease-out origin-top ${
                      actionMenuPath === node.path
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                    }`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      onClick={() => {
                        setRenamingPath(node.path);
                        setActionMenuPath(null);
                      }}
                    >
                      <FileText size={12} />
                      Rename
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      onClick={async () => {
                        const target = indicators.find((item) => derivePath(item) === node.path);
                        const fullPath = target?.filePath ? normalizeSlashes(target.filePath) : normalizeSlashes(node.path);
                        try {
                          await navigator.clipboard.writeText(fullPath);
                          addToast('Full path copied', 'info');
                        } catch {
                          addToast('Failed to copy path', 'error');
                        } finally {
                          setActionMenuPath(null);
                        }
                      }}
                    >
                      <Copy size={12} />
                      Copy full path
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                      onClick={() => {
                        const target = indicators.find((item) => derivePath(item) === node.path);
                        if (!target) {
                          setActionMenuPath(null);
                          return;
                        }
                        const confirmed = window.confirm(`Delete ${target.name || target.id}?`);
                        if (confirmed) {
                          deleteIndicator(target.id);
                        }
                        setActionMenuPath(null);
                      }}
                    >
                      <Trash size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="bg-white border border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-md flex-1 flex flex-col min-h-0">
            <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 rounded-t-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={activeIndicator ? titleDraft : ''}
                    placeholder="Indicator title..."
                    disabled={!activeIndicator}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={() => {
                      if (!activeIndicator) return;
                      updateIndicatorName(activeIndicator.id, titleDraft);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && activeIndicator) {
                        updateIndicatorName(activeIndicator.id, titleDraft);
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-48 transition-colors py-0.5 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <input ref={importInputRef} type="file" accept=".py,.txt" className="hidden" onChange={handleImportFile} />
              </div>

              <div className="flex items-center gap-1.5">
                {activeIndicator ? (
                  <button
                    onClick={() => toggleActiveIndicator(activeIndicator.id)}
                    className="h-7 px-3 flex items-center gap-2 text-[11px] font-semibold rounded-full border border-slate-200 text-slate-600 bg-white/60 hover:text-slate-900 hover:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300/20 transition-colors duration-150"
                  >
                    <CheckCircle2 size={12} />
                    {activeIndicator.isActive ? 'Active' : 'Inactive'}
                  </button>
                ) : null}
                <button
                  onClick={handleRefreshFromDisk}
                  disabled={!selectedIndicatorId}
                  className="h-7 w-7 flex items-center justify-center text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
                  title="Reload"
                  aria-label="Reload"
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !activeIndicator}
                  className="h-7 w-7 flex items-center justify-center text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
                  title="Save"
                  aria-label="Save"
                >
                  <Save size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 bg-white flex-1 min-h-0 rounded-b-md">
              <div className="relative flex-1 min-h-0 h-full">
                {activeIndicator ? (
                  <PythonEditor
                    className="h-full"
                    value={codeDraft}
                    onChange={setCodeDraft}
                    highlight={highlightPython}
                    placeholder="Write your Python indicator..."
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <FileCode size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
};
