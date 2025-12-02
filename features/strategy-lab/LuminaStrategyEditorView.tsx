import React, { useEffect, useMemo, useState } from 'react';
import { StrategyEditor, FileNode } from '../../lumina-edition/components/StrategyEditor';
import { CustomIndicator, StrategyFile } from '../../types';

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
}

export interface LuminaStrategyEditorViewProps {
  strategiesAdapter: StrategiesAdapter;
  indicatorsAdapter?: IndicatorsAdapter;
  onRunLean?: (code: string) => void;
}

const STRATEGIES_ROOT_ID = 'strategies-root';
const INDICATORS_ROOT_ID = 'indicators-root';

export const LuminaStrategyEditorView: React.FC<LuminaStrategyEditorViewProps> = ({
  strategiesAdapter,
  indicatorsAdapter,
  onRunLean,
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

  const files: FileNode[] = useMemo(() => {
    const nodes: FileNode[] = [
      { id: STRATEGIES_ROOT_ID, name: 'strategies', type: 'folder' },
    ];

    strategies.forEach((strategy) => {
      const fileName = (strategy.filePath || '').split('/').pop() || strategy.name || strategy.id;
      nodes.push({
        id: strategy.id,
        name: fileName,
        type: 'file',
        parentId: STRATEGIES_ROOT_ID,
        active: activeKind === 'strategy' && strategy.id === selectedId,
      });
    });

    if (indicatorsAdapter) {
      nodes.push({ id: INDICATORS_ROOT_ID, name: 'indicators', type: 'folder' });
      indicatorsAdapter.indicators.forEach((indicator) => {
        const fileName = (indicator.filePath || '').split('/').pop() || indicator.name || indicator.id;
        nodes.push({
          id: indicator.id,
          name: fileName,
          type: 'file',
          parentId: INDICATORS_ROOT_ID,
          active: activeKind === 'indicator' && indicator.id === indicatorsAdapter.selectedIndicatorId,
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

  const handleToggleIndicatorActive = async (id: string, _nextActive: boolean) => {
    if (!indicatorsAdapter) return;
    await indicatorsAdapter.toggleActiveIndicator(id);
  };

  return (
    <StrategyEditor
      files={files}
      activeFileId={selectedId}
      code={codeDraft}
      onSelectFile={handleSelectFile}
      onChangeCode={setCodeDraft}
      onSave={handleSave}
      onRun={handleRun}
      onRenameFile={handleRenameFile}
      onDeleteFile={handleDeleteFile}
      onToggleIndicatorActive={handleToggleIndicatorActive}
      onCreateFile={handleCreateFile}
    />
  );
};
