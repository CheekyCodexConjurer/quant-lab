import React, { useEffect, useMemo, useState } from 'react';
import { StrategyEditor, FileNode } from '../../lumina-edition/components/StrategyEditor';
import { CustomIndicator, StrategyFile, StrategyLabError } from '../../types';

interface StrategiesAdapter {
  strategies: StrategyFile[];
  activeStrategy: StrategyFile | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  saveStrategy: (id: string, code: string) => Promise<void> | void;
  createStrategy: (folderPath?: string, nameOverride?: string, code?: string) => Promise<void> | void;
  importStrategy: (filePath: string, code: string) => Promise<void> | void;
  deleteStrategy: (id: string) => Promise<void> | void;
  updateStrategyPath: (id: string, nextPath: string) => Promise<void> | void;
}

interface IndicatorsAdapter {
  indicators: CustomIndicator[];
  activeIndicator: CustomIndicator | null;
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  createIndicator: (folderPath?: string) => void;
  deleteIndicator: (id: string) => Promise<void> | void;
  saveIndicator: (
    id: string,
    code: string,
    name?: string,
    filePathOverride?: string
  ) => Promise<void> | void;
  renameIndicator: (id: string, nextWorkspacePath: string, name: string) => Promise<void> | void;
  toggleActiveIndicator: (id: string) => Promise<void> | void;
  setIndicatorActive?: (id: string, active: boolean) => Promise<void> | void;
  refreshFromDisk?: (id: string) => Promise<void> | void;
}

export interface LuminaStrategyEditorViewProps {
  strategiesAdapter: StrategiesAdapter;
  indicatorsAdapter?: IndicatorsAdapter;
  onRunLean?: (code: string) => void;
  leanStatus?: 'idle' | 'queued' | 'running' | 'completed' | 'error';
  leanLogs?: string[];
  leanErrorMeta?: StrategyLabError | null;
  onWorkspaceDirtyChange?: (dirty: boolean) => void;
}

const STRATEGIES_ROOT_ID = 'strategies-root';
const INDICATORS_ROOT_ID = 'indicators-root';

const normalizeFsPath = (value?: string | null) =>
  String(value || '').replace(/\\/g, '/');

const getRelativePath = (fullPath: string, rootToken: string) => {
  const normalized = normalizeFsPath(fullPath);
  const lower = normalized.toLowerCase();
  const token = `${rootToken.toLowerCase()}/`;
  const idx = lower.lastIndexOf(token);
  if (idx >= 0) {
    return normalized.slice(idx + token.length);
  }
  // Fallback: use only last segment
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
};

export const LuminaStrategyEditorView: React.FC<LuminaStrategyEditorViewProps> = ({
  strategiesAdapter,
  indicatorsAdapter,
  onRunLean,
  leanStatus,
  leanLogs,
  leanErrorMeta,
  onWorkspaceDirtyChange,
}) => {
  const {
    strategies,
    activeStrategy,
    selectedId,
    setSelectedId,
    saveStrategy,
    createStrategy,
    importStrategy,
    deleteStrategy,
    updateStrategyPath,
  } = strategiesAdapter;

  const [codeDraft, setCodeDraft] = useState<string>('');
  const [activeKind, setActiveKind] = useState<'strategy' | 'indicator'>('strategy');
  const [editorErrorLines, setEditorErrorLines] = useState<number[]>([]);
  const [mergedLogs, setMergedLogs] = useState<
    { type: 'info' | 'success' | 'error'; text: string }[]
  >([]);

  useEffect(() => {
    const next: { type: 'info' | 'success' | 'error'; text: string }[] = [];
    if (leanLogs && leanLogs.length) {
      leanLogs.forEach((line) => {
        next.push({ type: 'info', text: line });
      });
    }
    if (leanErrorMeta) {
      next.push({
        type: 'error',
        text: `[LeanError] ${leanErrorMeta.message}`,
      });
      if (typeof leanErrorMeta.line === 'number') {
        setEditorErrorLines([leanErrorMeta.line]);
      }
    } else {
      setEditorErrorLines([]);
    }

    if (!next.length) {
      setMergedLogs([
        {
          type: 'info',
          text: '> Console attached to Lean backtest. Run a job to see output.',
        },
      ]);
    } else {
      setMergedLogs(next);
    }
  }, [leanLogs, leanErrorMeta]);

  useEffect(() => {
    if (activeKind === 'strategy' && activeStrategy) {
      setCodeDraft(activeStrategy.code || '');
      return;
    }
    if (activeKind === 'indicator' && indicatorsAdapter?.activeIndicator) {
      setCodeDraft(indicatorsAdapter.activeIndicator.code || '');
      return;
    }
    setCodeDraft('');
  }, [
    activeKind,
    activeStrategy?.id,
    activeStrategy?.code,
    indicatorsAdapter?.activeIndicator?.id,
    indicatorsAdapter?.activeIndicator?.code,
  ]);

  useEffect(() => {
    if (!onWorkspaceDirtyChange) return;
    const strategyDirty =
      activeKind === 'strategy' && !!activeStrategy && (codeDraft || '') !== (activeStrategy.code || '');
    const indicatorDirty =
      activeKind === 'indicator' &&
      !!indicatorsAdapter?.activeIndicator &&
      (codeDraft || '') !== (indicatorsAdapter.activeIndicator.code || '');
    const dirty = strategyDirty || indicatorDirty;
    onWorkspaceDirtyChange(dirty);
    return () => {
      onWorkspaceDirtyChange(false);
    };
  }, [activeKind, activeStrategy, indicatorsAdapter?.activeIndicator, codeDraft, onWorkspaceDirtyChange]);

  const activeFileId: string | null = useMemo(() => {
    if (activeKind === 'indicator' && indicatorsAdapter) {
      return indicatorsAdapter.selectedIndicatorId;
    }
    return selectedId;
  }, [activeKind, selectedId, indicatorsAdapter?.selectedIndicatorId]);

  const activeIndicatorLastUpdateAt =
    indicatorsAdapter?.activeIndicator?.appliedVersion ||
    indicatorsAdapter?.activeIndicator?.lastModified ||
    null;

  const files: FileNode[] = useMemo(() => {
    const nodes: FileNode[] = [
      { id: STRATEGIES_ROOT_ID, name: 'strategies', type: 'folder' },
    ];
    const folderIndex = new Map<string, string>();

    const ensureFolder = (rootId: string, rootName: string, segments: string[]): string => {
      let parentId = rootId;
      let accumulated = '';

      segments.forEach((segment) => {
        accumulated = accumulated ? `${accumulated}/${segment}` : segment;
        const folderKey = `${rootName}/${accumulated}`;
        if (!folderIndex.has(folderKey)) {
          const id = `${rootId}:${accumulated}`;
          folderIndex.set(folderKey, id);
          nodes.push({
            id,
            name: segment,
            type: 'folder',
            parentId,
          });
        }
        parentId = folderIndex.get(folderKey)!;
      });

      return parentId;
    };

    // Strategies tree
    strategies.forEach((strategy) => {
      const relative = getRelativePath(strategy.filePath || '', 'strategies');
      const segments = relative.split('/').filter(Boolean);
      const folderSegments = segments.slice(0, -1);
      const fileName = segments[segments.length - 1] || strategy.name || strategy.id;
      const parentId =
        folderSegments.length > 0
          ? ensureFolder(STRATEGIES_ROOT_ID, 'strategies', folderSegments)
          : STRATEGIES_ROOT_ID;

      nodes.push({
        id: strategy.id,
        name: fileName,
        type: 'file',
        parentId,
        active: activeKind === 'strategy' && strategy.id === selectedId,
      });
    });

    // Indicators tree
    if (indicatorsAdapter) {
      nodes.push({ id: INDICATORS_ROOT_ID, name: 'indicators', type: 'folder' });

      indicatorsAdapter.indicators.forEach((indicator) => {
        const relative = getRelativePath(indicator.filePath || '', 'indicators');
        const segments = relative.split('/').filter(Boolean);
        const folderSegments = segments.slice(0, -1);
        const fileName = segments[segments.length - 1] || indicator.name || indicator.id;
        const parentId =
          folderSegments.length > 0
            ? ensureFolder(INDICATORS_ROOT_ID, 'indicators', folderSegments)
            : INDICATORS_ROOT_ID;

        nodes.push({
          id: indicator.id,
          name: fileName,
          type: 'file',
          parentId,
          active:
            activeKind === 'indicator' &&
            indicator.id === indicatorsAdapter.selectedIndicatorId,
          indicatorActive: indicator.isActive,
        });
      });
    }

    return nodes;
  }, [strategies, selectedId, indicatorsAdapter, activeKind]);

  const handleSelectFile = (id: string) => {
    const isStrategy = strategies.some((s) => s.id === id);
    if (isStrategy) {
      setActiveKind('strategy');
      setSelectedId(id);
      return;
    }
    if (indicatorsAdapter) {
      const isIndicator = indicatorsAdapter.indicators.some((ind) => ind.id === id);
      if (isIndicator) {
        setActiveKind('indicator');
        indicatorsAdapter.setSelectedIndicatorId(id);
      }
    }
  };

  const handleSave = async () => {
    if (activeKind === 'strategy') {
      if (!activeStrategy) return;
      await saveStrategy(activeStrategy.id, codeDraft);
    } else if (activeKind === 'indicator' && indicatorsAdapter?.activeIndicator) {
      const { activeIndicator } = indicatorsAdapter;
      await indicatorsAdapter.saveIndicator(
        activeIndicator.id,
        codeDraft,
        activeIndicator.name,
        activeIndicator.filePath
      );
    }
  };

  const handleRun = () => {
    if (activeKind !== 'strategy' || !onRunLean) return;
    if (!activeStrategy) return;
    if (leanStatus === 'running' || leanStatus === 'queued') return;
    if (onRunLean) {
      void handleSave().then(() => {
        onRunLean(codeDraft);
      });
    }
  };

  const handleRenameFile = async (id: string, newName: string) => {
    const strategy = strategies.find((s) => s.id === id);
    if (strategy && strategy.filePath) {
      const parts = strategy.filePath.split('/');
      parts[parts.length - 1] = newName.endsWith('.py') ? newName : `${newName}.py`;
      const nextPath = parts.join('/');
      await updateStrategyPath(id, nextPath);
      return;
    }

    if (indicatorsAdapter) {
      const indicator = indicatorsAdapter.indicators.find((ind) => ind.id === id);
      if (!indicator || !indicator.filePath) return;
      const parts = indicator.filePath.split('/');
      parts[parts.length - 1] = newName.endsWith('.py') ? newName : `${newName}.py`;
      const nextPath = parts.join('/');
      await indicatorsAdapter.renameIndicator(id, nextPath, indicator.name || newName);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const strategy = strategies.find((s) => s.id === id);
    if (strategy) {
      await deleteStrategy(id);
      return;
    }
    if (indicatorsAdapter) {
      const indicator = indicatorsAdapter.indicators.find((ind) => ind.id === id);
      if (indicator) {
        await indicatorsAdapter.deleteIndicator(id);
      }
    }
  };

  const handleCreateFile = async () => {
    await createStrategy('strategies');
  };

  const handleToggleIndicatorActive = async (id: string, nextActive: boolean) => {
    if (!indicatorsAdapter) return;
    if (indicatorsAdapter.setIndicatorActive) {
      await indicatorsAdapter.setIndicatorActive(id, nextActive);
      return;
    }
    await indicatorsAdapter.toggleActiveIndicator(id);
  };

  return (
    <StrategyEditor
      files={files}
      activeFileId={activeFileId}
      code={codeDraft}
      onSelectFile={handleSelectFile}
      onChangeCode={setCodeDraft}
      onSave={handleSave}
      onRun={handleRun}
      onRenameFile={handleRenameFile}
      onDeleteFile={handleDeleteFile}
      onToggleIndicatorActive={handleToggleIndicatorActive}
      onCreateFile={handleCreateFile}
      onCreateIndicatorFile={
        indicatorsAdapter
          ? () => {
              indicatorsAdapter.createIndicator('indicators');
            }
          : undefined
      }
      onImportFromFile={(fileName, content) => {
        const baseName = fileName.replace(/\.[^.]+$/, '') || 'imported_strategy';
        const filePath = `strategies/${baseName}.py`;
        void importStrategy(filePath, content);
      }}
      errorLines={editorErrorLines}
      externalLogs={mergedLogs}
      isRunBusy={leanStatus === 'running' || leanStatus === 'queued'}
      activeIndicatorLastUpdateAt={activeIndicatorLastUpdateAt}
    />
  );
};
