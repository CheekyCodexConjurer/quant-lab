import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, Code, RefreshCcw, Save, Play, CheckCircle2, FileText, Upload, Plus, Copy, MoreVertical, Trash } from 'lucide-react';
import { CustomIndicator, StrategyFile } from '../types';
import { useToast } from '../components/common/Toast';
import { MainContent } from '../components/layout/MainContent';
import { FileTree, FileTreeNode } from '../components/files/FileTree';
import { PythonEditor } from '../components/editor/PythonEditor';
import { LeanLogPanel } from '../components/lean/LeanLogPanel';
import { LeanSettingsPanel } from '../components/lean/LeanSettingsPanel';
import { ensureRootedPath, normalizeSlashes, toRelativePath, truncateMiddle } from '../utils/path';
import { useHoverMenu } from '../components/ui/useHoverMenu';
import { MenuSurface } from '../components/ui/MenuSurface';
import { apiClient } from '../services/api/client';

type StrategyViewProps = {
  onRunLeanBacktest: () => void;
  onNavigateToChart: () => void;
  strategies: StrategyFile[];
  strategyOrder: string[];
  setStrategyOrder: (order: string[]) => void;
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
  indicators: CustomIndicator[];
  indicatorOrder: string[];
  setIndicatorOrder: (order: string[]) => void;
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  activeIndicator: CustomIndicator | null;
  createIndicator: (folderPath?: string) => void;
  deleteIndicator: (id: string) => void;
  saveIndicator: (id: string, code: string, name?: string, filePathOverride?: string) => Promise<void> | void;
  toggleActiveIndicator: (id: string) => Promise<void> | void;
  refreshIndicatorFromDisk: (id: string) => Promise<void> | void;
  renameIndicator: (id: string, nextWorkspacePath: string, name: string) => Promise<void> | void;
  updateIndicatorName: (id: string, name: string) => void;
  indicatorFolders: string[];
  addIndicatorFolder: (folder: string) => void;
  removeIndicatorFolder: (folder: string) => void;
};

const STRATEGY_ROOT = 'strategies';
const INDICATOR_ROOT = 'indicators';
const PANEL_WIDTH_CLASS = 'w-[13.5rem] min-w-[13.5rem] max-w-[15rem]';
const WORKSPACE_FOLDERS_KEY = 'thelab.workspaceFolders';

const derivePath = (strategy: StrategyFile) => {
  const base = strategy.filePath || `${strategy.name || strategy.id}.py`;
  const rooted = ensureRootedPath(STRATEGY_ROOT, base);
  const rel = toRelativePath(STRATEGY_ROOT, rooted);
  return rel ? `${STRATEGY_ROOT}/${rel}` : STRATEGY_ROOT;
};

const deriveIndicatorPath = (indicator: CustomIndicator) => {
  const base = indicator.filePath || `${indicator.name || indicator.id}.py`;
  const rooted = ensureRootedPath(INDICATOR_ROOT, base);
  const rel = toRelativePath(INDICATOR_ROOT, rooted);
  return rel ? `${INDICATOR_ROOT}/${rel}` : INDICATOR_ROOT;
};

const buildTree = (strategies: StrategyFile[], extraFolders: string[], order: string[]): FileTreeNode => {
  const root: FileTreeNode = { id: STRATEGY_ROOT, name: STRATEGY_ROOT, path: STRATEGY_ROOT, type: 'folder', children: [] };
  const byFolder: Record<string, FileTreeNode> = { [STRATEGY_ROOT]: root };

  const registerFolder = (folderPath: string) => {
    const normalized = ensureRootedPath(STRATEGY_ROOT, folderPath);
    const rel = toRelativePath(STRATEGY_ROOT, normalized);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    let current = root;
    parts.forEach((segment, index) => {
      const currentPath = `${STRATEGY_ROOT}/${parts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = { id: currentPath, name: segment, path: currentPath, type: 'folder', children: [] };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
  };

  extraFolders.forEach(registerFolder);

  strategies.forEach((strategy) => {
    const fullPath = derivePath(strategy);
    const rel = toRelativePath(STRATEGY_ROOT, fullPath);
    const parts = rel ? rel.split('/').filter(Boolean) : [];
    const folderParts = parts.slice(0, -1);
    let current = root;
    folderParts.forEach((segment, index) => {
      const currentPath = `${STRATEGY_ROOT}/${folderParts.slice(0, index + 1).join('/')}`;
      if (!byFolder[currentPath]) {
        const node: FileTreeNode = { id: currentPath, name: segment, path: currentPath, type: 'folder', children: [] };
        byFolder[currentPath] = node;
        current.children?.push(node);
      }
      current = byFolder[currentPath];
    });
    const fileName = parts[parts.length - 1] || `${strategy.name || strategy.id}.py`;
    current.children?.push({
      id: strategy.id,
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
        const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
        const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortNodes(node.children) }));

  return { ...root, children: sortNodes(root.children) };
};

const buildIndicatorTree = (indicators: CustomIndicator[], order: string[], folders: string[]): FileTreeNode => {
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

  indicators.forEach((indicator) => {
    if (indicator.filePath) {
      const folder = indicator.filePath.split('/').slice(0, -1).join('/');
      if (folder && folder !== INDICATOR_ROOT) {
        registerFolder(folder);
      }
    }
  });
  (folders || []).forEach((folderPath) => registerFolder(folderPath));

  indicators.forEach((indicator) => {
    const fullPath = deriveIndicatorPath(indicator);
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
        const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
        const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortNodes(node.children) }));

  return { ...root, children: sortNodes(root.children) };
};

const buildWorkspaceFolders = (folders: string[]): FileTreeNode[] =>
  (folders || [])
    .map((folder) => ({
      id: folder,
      name: folder.split('/').pop() || folder,
      path: folder,
      type: 'folder' as const,
      children: [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const StrategyView: React.FC<StrategyViewProps> = ({
  onRunLeanBacktest,
  onNavigateToChart,
  strategies,
  strategyOrder,
  setStrategyOrder,
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
  refreshIndicatorFromDisk,
  renameIndicator,
  updateIndicatorName,
  indicatorFolders,
  addIndicatorFolder,
  removeIndicatorFolder,
}) => {
  const addToast = useToast();
  const [codeDraft, setCodeDraft] = useState(activeStrategy?.code ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [STRATEGY_ROOT]: true, [INDICATOR_ROOT]: true });
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [actionMenuPath, setActionMenuPath] = useState<string | null>(null);
  const actionMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<{ cash: number; feeBps: number; slippageBps: number }>(leanParams);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [activeKind, setActiveKind] = useState<'strategy' | 'indicator'>('strategy');
  const [indicatorLogs, setIndicatorLogs] = useState<string[]>([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<string[]>([]);
  const settingsMenu = useHoverMenu({ closeDelay: 150 });
  const createMenu = useHoverMenu({ closeDelay: 150 });
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderCreateMenu, setRenderCreateMenu] = useState(false);
  const clearActionTimer = () => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
  };
  const scheduleActionClose = () => {
    clearActionTimer();
    actionMenuCloseTimer.current = setTimeout(() => setActionMenuPath(null), 150);
  };
  const clearSettingsSaveTimer = () => {
    if (settingsSaveTimer.current) {
      clearTimeout(settingsSaveTimer.current);
      settingsSaveTimer.current = null;
    }
  };
  const flushSettingsSave = useCallback(async () => {
    clearSettingsSaveTimer();
    const hasChanged =
      settingsDraft.cash !== leanParams.cash ||
      settingsDraft.feeBps !== leanParams.feeBps ||
      settingsDraft.slippageBps !== leanParams.slippageBps;
    if (!hasChanged) return;
    try {
      await Promise.resolve(onLeanParamsChange(settingsDraft));
    } catch (error) {
      console.error('[settings] autosave failed', error);
      addToast('Failed to save Lean settings', 'error');
    }
  }, [settingsDraft, leanParams.cash, leanParams.feeBps, leanParams.slippageBps, onLeanParamsChange, addToast]);
  const scheduleSettingsSave = useCallback(() => {
    clearSettingsSaveTimer();
    settingsSaveTimer.current = setTimeout(() => {
      void flushSettingsSave();
    }, 400);
  }, [flushSettingsSave]);
  const [folderMenuPath, setFolderMenuPath] = useState<string | null>(null);

  const orderedPaths = useMemo(() => {
    const paths = strategies.map((strategy) => derivePath(strategy));
    return paths.sort((a, b) => {
      const idxA = strategyOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a));
      const idxB = strategyOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b));
      const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
      const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
      if (wa !== wb) return wa - wb;
      return a.localeCompare(b);
    });
  }, [strategies, strategyOrder]);

  const strategyTree = useMemo(() => buildTree(strategies, extraFolders, strategyOrder), [strategies, extraFolders, strategyOrder]);
  const indicatorTree = useMemo(
    () => buildIndicatorTree(indicators, indicatorOrder, indicatorFolders),
    [indicators, indicatorOrder, indicatorFolders]
  );
  const workspaceNodes = useMemo(() => buildWorkspaceFolders(workspaceFolders), [workspaceFolders]);
  const tree: FileTreeNode = useMemo(
    () => ({
      id: 'workspace',
      name: 'workspace',
      path: 'workspace',
      type: 'folder',
      children: [...workspaceNodes, strategyTree, indicatorTree],
    }),
    [strategyTree, indicatorTree, workspaceNodes]
  );

  const activePath =
    activeKind === 'indicator'
      ? activeIndicator
        ? deriveIndicatorPath(activeIndicator)
        : null
      : activeStrategy
        ? derivePath(activeStrategy)
        : null;
  const entryPathDisplay =
    activeKind === 'indicator'
      ? activeIndicator
        ? truncateMiddle(toRelativePath(INDICATOR_ROOT, deriveIndicatorPath(activeIndicator)), 42)
        : 'Select a file...'
      : activeStrategy
        ? truncateMiddle(toRelativePath(STRATEGY_ROOT, derivePath(activeStrategy)), 42)
        : 'Select a file...';
  const entryFullPath = activePath ? normalizeSlashes(activePath) : '';
  const currentFolder = activePath
    ? activePath.split('/').slice(0, -1).join('/') || (activeKind === 'indicator' ? INDICATOR_ROOT : STRATEGY_ROOT)
    : activeKind === 'indicator'
      ? INDICATOR_ROOT
      : STRATEGY_ROOT;
  useEffect(() => {
    setCodeDraft(activeKind === 'indicator' ? activeIndicator?.code ?? '' : activeStrategy?.code ?? '');
  }, [activeIndicator?.code, activeIndicator?.id, activeStrategy?.code, activeStrategy?.id, activeKind]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(WORKSPACE_FOLDERS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setWorkspaceFolders(parsed.map((f: string) => normalizeSlashes(f)).filter(Boolean));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(WORKSPACE_FOLDERS_KEY, JSON.stringify(workspaceFolders));
    } catch {
      /* ignore */
    }
  }, [workspaceFolders]);

  useEffect(() => {
    if (createMenu.isOpen) {
      setRenderCreateMenu(true);
    } else if (renderCreateMenu) {
      const timer = setTimeout(() => setRenderCreateMenu(false), 150);
      return () => clearTimeout(timer);
    }
  }, [createMenu.isOpen, renderCreateMenu]);

  useEffect(() => {
    if (activeIndicator && activeKind !== 'indicator') {
      setActiveKind('indicator');
    } else if (activeStrategy && activeKind !== 'strategy' && !activeIndicator) {
      setActiveKind('strategy');
    }
  }, [activeIndicator?.id, activeStrategy?.id]);

  useEffect(() => {
    setSettingsDraft(leanParams);
  }, [leanParams.cash, leanParams.feeBps, leanParams.slippageBps]);

  useEffect(() => {
    if (!settingsMenu.isOpen) return;
    scheduleSettingsSave();
    return () => clearSettingsSaveTimer();
  }, [settingsDraft, settingsMenu.isOpen, scheduleSettingsSave]);

  useEffect(() => {
    if (!settingsMenu.isOpen) {
      void flushSettingsSave();
      clearSettingsSaveTimer();
    }
  }, [settingsMenu.isOpen, flushSettingsSave]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeKind === 'indicator') {
        if (!activeIndicator) return;
        await saveIndicator(activeIndicator.id, codeDraft || activeIndicator.code || '');
        addToast('Indicator saved, applied to chart, and file updated.', 'success');
        setIndicatorLogs((prev) => [...prev, `[indicator: ${activeIndicator.name || activeIndicator.id}] saved`]);
      } else {
        if (!activeStrategy) return;
        await onSave(codeDraft);
        addToast('Strategy saved, applied, and file updated.', 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshFromDisk = async () => {
    if (activeKind === 'indicator') {
      if (!selectedIndicatorId) return;
      try {
        await refreshIndicatorFromDisk(selectedIndicatorId);
        addToast('Indicator reloaded from disk.', 'success');
        setIndicatorLogs((prev) => [...prev, `[indicator: ${activeIndicator?.name || activeIndicator?.id || selectedIndicatorId}] reloaded`]);
      } catch (error) {
        addToast('Failed to reload indicator from disk.', 'error');
        console.warn('[indicator] refreshFromDisk failed', error);
      }
      return;
    }
    if (!activeStrategy) return;
    try {
      await refreshFromDisk(activeStrategy.id);
      addToast('Strategy reloaded from disk.', 'success');
    } catch (error) {
      addToast('Failed to reload strategy from disk.', 'error');
      console.warn('[strategy] refreshFromDisk failed', error);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = String(reader.result || '');
      if (activeKind === 'indicator' && activeIndicator) {
        await saveIndicator(activeIndicator.id, content, activeIndicator.name, activeIndicator.filePath);
        setCodeDraft(content);
        setIndicatorLogs((prev) => [...prev, `[indicator: ${activeIndicator.name || activeIndicator.id}] imported`]);
        addToast('Indicator imported and saved.', 'success');
      } else {
        const cleanName = file.name.replace(/\.py$/i, '').replace(/[^A-Za-z0-9_-]/g, '_') || 'ImportedStrategy';
        const folder = activePath ? activePath.split('/').slice(0, -1).join('/') : STRATEGY_ROOT;
        const destPath = `${folder}/${cleanName}.py`;
        await importStrategy(destPath, content);
        setCodeDraft(content);
        addToast('Strategy imported', 'success');
      }
    };
    reader.readAsText(file);
  };

  const handleMove = async (fromPath: string, toFolder: string) => {
    if (fromPath.startsWith(INDICATOR_ROOT) || toFolder.startsWith(INDICATOR_ROOT)) return;
    const strategy = strategies.find((item) => derivePath(item) === fromPath);
    if (!strategy) return;
    const fileName = fromPath.split('/').pop() || `${strategy.name || strategy.id}.py`;
    const target = `${toFolder}/${fileName}`;
    if (target === fromPath) return;
    await updateStrategyPath(strategy.id, target);
    setExpanded((prev) => ({ ...prev, [toFolder]: true }));
  };

  const handleReorder = (fromPath: string, toPath: string) => {
    if (fromPath.startsWith(INDICATOR_ROOT) || toPath.startsWith(INDICATOR_ROOT)) return;
    const normalizedFrom = normalizeSlashes(fromPath);
    const normalizedTo = normalizeSlashes(toPath);
    if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) return;
    const current = orderedPaths.filter(Boolean);
    const filtered = current.filter((p) => normalizeSlashes(p) !== normalizedFrom);
    const targetIdx = filtered.findIndex((p) => normalizeSlashes(p) === normalizedTo);
    if (targetIdx === -1) return;
    filtered.splice(targetIdx, 0, normalizedFrom);
    setStrategyOrder(filtered);
  };

  const handleRename = (path: string, nextName: string) => {
    const isFolderRename = !path.endsWith('.py');
    if (isFolderRename) {
      const sanitized = nextName.replace(/\/+/g, '').trim();
      if (!sanitized) {
        setRenamingPath(null);
        return;
      }
      if (path.startsWith('workspace/')) {
        if (!workspaceFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path))) {
          setRenamingPath(null);
          return;
        }
        if (hasChildrenInFolder(path)) {
          addToast('Folder not empty.', 'error');
          setRenamingPath(null);
          return;
        }
        const parent = 'workspace';
        const nextPath = `${parent}/${sanitized}`;
        setWorkspaceFolders((prev) =>
          Array.from(
            new Set(
              prev.map((f) => (normalizeSlashes(f) === normalizeSlashes(path) ? nextPath : f))
            )
          )
        );
        setRenamingPath(null);
        return;
      }
      if (path.startsWith(INDICATOR_ROOT)) {
        if (!indicatorFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path))) {
          setRenamingPath(null);
          return;
        }
        if (hasChildrenInFolder(path)) {
          addToast('Folder not empty.', 'error');
          setRenamingPath(null);
          return;
        }
        const parent = path.split('/').slice(0, -1).join('/') || INDICATOR_ROOT;
        const nextPath = `${parent}/${sanitized}`;
        removeIndicatorFolder(path);
        addIndicatorFolder(nextPath);
        setRenamingPath(null);
        return;
      } else {
        if (!extraFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path))) {
          setRenamingPath(null);
          return;
        }
        if (hasChildrenInFolder(path)) {
          addToast('Folder not empty.', 'error');
          setRenamingPath(null);
          return;
        }
        const parent = path.split('/').slice(0, -1).join('/') || STRATEGY_ROOT;
        const nextPath = `${parent}/${sanitized}`;
        setExtraFolders((prev) =>
          Array.from(
            new Set(
              prev.map((f) => (normalizeSlashes(f) === normalizeSlashes(path) ? nextPath : f))
            )
          )
        );
        setRenamingPath(null);
        return;
      }
    }
    if (path.startsWith(INDICATOR_ROOT)) {
      const indicator = indicators.find((item) => deriveIndicatorPath(item) === path);
      if (!indicator) return;
      const safeName = nextName.replace(/\.py$/i, '').trim();
      if (!safeName) {
        setRenamingPath(null);
        return;
      }
      const folder = path.split('/').slice(0, -1).join('/') || INDICATOR_ROOT;
      const nextPath = `${folder}/${safeName}.py`;
      renameIndicator(indicator.id, nextPath, safeName);
      setRenamingPath(null);
      return;
    }
    const strategy = strategies.find((item) => derivePath(item) === path);
    if (!strategy) return;
    const folder = path.split('/').slice(0, -1).join('/') || STRATEGY_ROOT;
    const sanitizedName = nextName.replace(/\.py$/i, '');
    const nextPath = `${folder}/${sanitizedName}.py`;
    updateStrategyPath(strategy.id, nextPath);
    setRenamingPath(null);
  };

  const canManageFolder = (path: string) => {
    if (path === STRATEGY_ROOT || path === INDICATOR_ROOT || path === 'workspace') return false;
    if (path.startsWith('workspace/')) return workspaceFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path));
    if (path.startsWith(INDICATOR_ROOT)) return indicatorFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path));
    return extraFolders.some((f) => normalizeSlashes(f) === normalizeSlashes(path));
  };

  const hasChildrenInFolder = (path: string) => {
    if (path.startsWith('workspace/')) return false;
    if (path.startsWith(INDICATOR_ROOT)) {
      return indicators.some((ind) => normalizeSlashes(deriveIndicatorPath(ind)).startsWith(`${normalizeSlashes(path)}/`));
    }
    return strategies.some((st) => normalizeSlashes(derivePath(st)).startsWith(`${normalizeSlashes(path)}/`));
  };

  return (
    <MainContent direction="row" className="gap-2 items-stretch h-full bg-transparent p-6 rounded-lg">
        <div className={`${PANEL_WIDTH_CLASS} shrink-0 h-full min-h-0 flex flex-col bg-[#fafafb] border border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-md`}>
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-center bg-slate-50/60">
            <div className="flex items-center gap-1.5 relative">
              <div
                className="relative"
                ref={createMenu.triggerRef as any}
                onMouseEnter={createMenu.onMenuEnter}
                onMouseLeave={createMenu.onMenuLeave}
              >
                <button
                  onClick={createMenu.onTriggerClick}
                  className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-100/70 active:translate-y-[0.5px] rounded border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                  title="Create"
                >
                  <Plus size={16} />
                </button>
                {renderCreateMenu && (
                  <div
                    ref={createMenu.menuRef as any}
                    onMouseEnter={createMenu.onMenuEnter}
                    onMouseLeave={createMenu.onMenuLeave}
                    className={`absolute top-full left-0 mt-2 z-40 transition duration-150 ease-out origin-top ${
                      createMenu.isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                    }`}
                  >
                    <MenuSurface className="w-44 text-xs divide-y divide-slate-100">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">File</p>
                        <button
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                          onClick={async () => {
                            await createStrategy(STRATEGY_ROOT);
                            setActiveKind('strategy');
                            setExpanded((prev) => ({ ...prev, [STRATEGY_ROOT]: true }));
                            createMenu.close();
                          }}
                        >
                          New file in Strategies
                        </button>
                        <button
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                          onClick={() => {
                            createIndicator(INDICATOR_ROOT);
                            setActiveKind('indicator');
                            setExpanded((prev) => ({ ...prev, [INDICATOR_ROOT]: true }));
                            createMenu.close();
                          }}
                        >
                          New file in Indicators
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">Folder</p>
                        <button
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                          onClick={() => {
                            const name = `new_folder_${Date.now()}`;
                            const newPath = `${STRATEGY_ROOT}/${name}`;
                            setExtraFolders((prev) => Array.from(new Set([...prev, newPath])));
                            setExpanded((prev) => ({ ...prev, [newPath]: true, [STRATEGY_ROOT]: true }));
                            setRenamingPath(newPath);
                            createMenu.close();
                          }}
                        >
                          New folder in Strategies
                        </button>
                        <button
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                          onClick={() => {
                            const name = `new_folder_${Date.now()}`;
                            const newPath = `${INDICATOR_ROOT}/${name}`;
                            addIndicatorFolder(newPath);
                            setExpanded((prev) => ({ ...prev, [newPath]: true, [INDICATOR_ROOT]: true }));
                            setRenamingPath(newPath);
                            createMenu.close();
                          }}
                        >
                          New folder in Indicators
                        </button>
                      </div>
                    </MenuSurface>
                  </div>
                )}
              </div>
              <button
                onClick={() => importInputRef.current?.click()}
                className="h-7 w-7 flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-300/20"
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
            selectedPath={activePath || undefined}
            renamingPath={renamingPath}
            onRenameSubmit={handleRename}
            onRenameCancel={() => setRenamingPath(null)}
            onMove={handleMove}
            onReorder={handleReorder}
            onFolderContextMenu={(node) => {
              setActionMenuPath(null);
              setFolderMenuPath(node.path);
            }}
            isStructuralFolder={(path) =>
              path === 'workspace' || path === STRATEGY_ROOT || path === INDICATOR_ROOT
            }
            onSelect={(node) => {
              if (node.type === 'file') {
                if (node.path.startsWith(INDICATOR_ROOT)) {
                  const target = indicators.find((item) => deriveIndicatorPath(item) === node.path);
                  if (target) {
                    setActiveKind('indicator');
                    setSelectedIndicatorId(target.id);
                    setSelectedStrategyId(null);
                    setCodeDraft(target.code || '');
                  }
                } else {
                  const target = strategies.find((item) => derivePath(item) === node.path);
                  if (target) {
                    setActiveKind('strategy');
                    setSelectedStrategyId(target.id);
                    setSelectedIndicatorId(null);
                    setCodeDraft(target.code || '');
                  }
                }
              }
            }}
            renderFolderActions={(node) => {
              const manageable = canManageFolder(node.path);
              return (
                <div className="relative">
                  <button
                    className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionMenuPath(null);
                      setFolderMenuPath((prev) => (prev === node.path ? null : node.path));
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setActionMenuPath(null);
                      setFolderMenuPath(node.path);
                    }}
                    title="Folder actions"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {folderMenuPath === node.path ? (
                    <div className="absolute right-0 top-6 w-40 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-[11px] text-slate-700 transition duration-150 ease-out origin-top z-30">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!manageable) return;
                          setRenamingPath(node.path);
                          setFolderMenuPath(null);
                        }}
                        disabled={!manageable}
                      >
                        <FileText size={12} />
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!manageable) return;
                          if (hasChildrenInFolder(node.path)) {
                            addToast('Folder not empty.', 'error');
                            setFolderMenuPath(null);
                            return;
                          }
                          if (node.path.startsWith('workspace/')) {
                            setWorkspaceFolders((prev) =>
                              prev.filter((f) => normalizeSlashes(f) !== normalizeSlashes(node.path))
                            );
                          } else if (node.path.startsWith(INDICATOR_ROOT)) {
                            removeIndicatorFolder(node.path);
                          } else {
                            setExtraFolders((prev) => prev.filter((f) => normalizeSlashes(f) !== normalizeSlashes(node.path)));
                          }
                          setFolderMenuPath(null);
                        }}
                        disabled={!manageable}
                      >
                        <Trash size={12} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }}
            renderActions={(node) =>
              node.type === 'file' ? (
                <div
                  className="relative group"
                  onMouseEnter={() => {
                    clearActionTimer();
                    setActionMenuPath((prev) => (prev === node.path ? prev : prev));
                  }}
                  onMouseLeave={() => {
                    scheduleActionClose();
                  }}
                >
                  <div className="flex items-center gap-1 pr-2">
                    {node.path.startsWith(INDICATOR_ROOT) &&
                    indicators.find((item) => deriveIndicatorPath(item) === node.path && item.isActive) ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.25)]" title="Active" />
                    ) : null}
                    <button
                      className="p-1 rounded text-slate-500 hover:text-slate-800 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionMenuPath((prev) => (prev === node.path ? null : node.path));
                      }}
                      title="File actions"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  <div
                    className={`absolute right-0 top-6 w-40 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-[11px] text-slate-700 transition duration-150 ease-out origin-top ${
                      actionMenuPath === node.path
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                    }`}
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={clearActionTimer}
                    onMouseLeave={scheduleActionClose}
                  >
                    {node.path.startsWith(INDICATOR_ROOT) ? (
                      <>
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
                            const fullPath = normalizeSlashes(node.path);
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
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          onClick={async () => {
                            const indicator = indicators.find((item) => deriveIndicatorPath(item) === node.path);
                            if (!indicator || !indicator.filePath) {
                              addToast('File path not available.', 'error');
                              setActionMenuPath(null);
                              return;
                            }
                            try {
                              await apiClient.openFileFolder(indicator.filePath);
                            } catch (error) {
                              console.warn('[indicator] open folder failed', error);
                              addToast('Failed to open folder.', 'error');
                            } finally {
                              setActionMenuPath(null);
                            }
                          }}
                        >
                          <FileText size={12} />
                          Open Windows Folder
                        </button>
                        <button
                          className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                          onClick={() => {
                            const target = indicators.find((item) => deriveIndicatorPath(item) === node.path);
                            if (!target) {
                              setActionMenuPath(null);
                              return;
                            }
                            const confirmed = window.confirm(`Delete ${target.name || target.id}?`);
                            if (confirmed) {
                              deleteIndicator(target.id);
                              setIndicatorLogs((prev) => [...prev, `[indicator: ${target.name || target.id}] deleted`]);
                              setSelectedIndicatorId((current) => (current === target.id ? null : current));
                              if (selectedIndicatorId === target.id) {
                                setActiveKind('strategy');
                              }
                              setIndicatorOrder(indicatorOrder.filter((path) => normalizeSlashes(path) !== normalizeSlashes(node.path)));
                            }
                            setActionMenuPath(null);
                          }}
                        >
                          <Trash size={12} />
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
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
                            const fullPath = normalizeSlashes(node.path);
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
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          onClick={async () => {
                            const strategy = strategies.find((item) => derivePath(item) === node.path);
                            if (!strategy || !strategy.filePath) {
                              addToast('File path not available.', 'error');
                              setActionMenuPath(null);
                              return;
                            }
                            try {
                              await apiClient.openFileFolder(strategy.filePath);
                            } catch (error) {
                              console.warn('[strategy] open folder failed', error);
                              addToast('Failed to open folder.', 'error');
                            } finally {
                              setActionMenuPath(null);
                            }
                          }}
                        >
                          <FileText size={12} />
                          Open Windows Folder
                        </button>
                        <button
                          className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                          onClick={() => {
                            const target = strategies.find((item) => derivePath(item) === node.path);
                            if (!target) {
                              setActionMenuPath(null);
                              return;
                            }
                            const confirmed = window.confirm(`Delete ${target.name || target.id}?`);
                            if (confirmed) {
                              deleteStrategy(target.id);
                            }
                            setActionMenuPath(null);
                          }}
                        >
                          <Trash size={12} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      <div className="w-px bg-slate-200 self-stretch" />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="bg-white border border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)] rounded-md flex-1 flex flex-col min-h-0 relative">
            <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 rounded-t-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={
                      activeKind === 'indicator'
                        ? activeIndicator
                          ? activeIndicator.name || activeIndicator.id
                          : ''
                        : activeStrategy
                          ? activeStrategy.name || activeStrategy.id
                          : ''
                    }
                    placeholder="Select a file..."
                    disabled={activeKind === 'indicator' ? !activeIndicator : !activeStrategy}
                    onChange={() => {}}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-56 h-8 leading-none transition-colors py-0.5 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <input ref={importInputRef} type="file" accept=".py,.txt" className="hidden" onChange={handleImportFile} />
              </div>

              <div className="flex items-center gap-1">
                {activeKind === 'indicator' && activeIndicator ? (
                  <button
                    onClick={async () => {
                      const nextActive = !activeIndicator.isActive;
                      await toggleActiveIndicator(activeIndicator.id);
                      setIndicatorLogs((prev) => [
                        ...prev,
                        `[indicator: ${activeIndicator.name || activeIndicator.id}] ${nextActive ? 'activated' : 'deactivated'}`,
                      ]);
                    }}
                    className="h-7 px-3 flex items-center gap-2 text-[11px] font-semibold rounded-full border border-slate-200 text-slate-600 bg-white/60 hover:text-slate-900 hover:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300/20 transition-colors duration-150"
                    title="Toggle active"
                  >
                    <CheckCircle2 size={12} className={activeIndicator.isActive ? 'text-emerald-500' : 'text-slate-400'} />
                    {activeIndicator.isActive ? 'Active' : 'Inactive'}
                  </button>
                ) : null}
                {activeKind === 'strategy' ? (
                  <button
                    onClick={onRunLeanBacktest}
                    disabled={!activeStrategy || leanStatus === 'running' || leanStatus === 'queued'}
                    className={`h-7 w-7 flex items-center justify-center rounded-sm text-[11px] font-semibold border transition-colors duration-150 hover:bg-slate-100/70 hover:text-slate-800 active:translate-y-[0.5px] focus:outline-none focus:ring-1 focus:ring-slate-300/20 ${
                      !activeStrategy || leanStatus === 'running' || leanStatus === 'queued'
                        ? 'bg-white text-slate-400 border-slate-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    } disabled:opacity-60`}
                    title="Run"
                    aria-label="Run"
                  >
                    <Play size={16} />
                  </button>
                ) : null}
                <button
                  onClick={handleRefreshFromDisk}
                  disabled={activeKind === 'indicator' ? !activeIndicator : !activeStrategy}
                  className="h-7 w-7 flex items-center justify-center text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
                  title="Reload"
                  aria-label="Reload"
                >
                  <RefreshCcw size={16} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || (activeKind === 'indicator' ? !activeIndicator : !activeStrategy)}
                  className="h-7 w-7 flex items-center justify-center rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
                  title="Save"
                  aria-label="Save"
                >
                  <Save size={16} />
                </button>
                <div
                  className="relative"
                  ref={settingsMenu.triggerRef as any}
                  onMouseEnter={settingsMenu.onMenuEnter}
                  onMouseLeave={settingsMenu.onMenuLeave}
                >
                  <button
                    onClick={settingsMenu.onTriggerClick}
                    className="h-7 w-7 flex items-center justify-center rounded-sm border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20"
                    aria-haspopup="true"
                    aria-expanded={settingsMenu.isOpen}
                    title="Settings"
                  >
                    <Settings size={16} />
                  </button>
                  <LeanSettingsPanel
                    open={settingsMenu.isOpen}
                    params={settingsDraft}
                    onChange={setSettingsDraft}
                    menuRef={settingsMenu.menuRef}
                    onMenuEnter={settingsMenu.onMenuEnter}
                    onMenuLeave={settingsMenu.onMenuLeave}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex-1 min-h-0 rounded-b-md">
              <div className="relative flex-1 min-h-0 h-full">
                {activeKind === 'indicator' ? (
                  activeIndicator ? (
                    <PythonEditor
                      className="h-full"
                      value={codeDraft}
                      onChange={setCodeDraft}
                      placeholder="Edit your Python indicator..."
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <Code size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
                    </div>
                  )
                ) : activeStrategy ? (
                  <PythonEditor
                    className="h-full"
                    value={codeDraft}
                    onChange={setCodeDraft}
                    placeholder="Write your Python strategy..."
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Code size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select a strategy to edit or create a new one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200" />
          <LeanLogPanel status={leanStatus} jobId={leanJobId} logs={[...indicatorLogs, ...leanLogs]} />
        </div>
      </div>
    </MainContent>
  );
};

