import { useState } from 'react';
import type { IndicatorSettingsValues } from '../../types';
import { loadIndicatorSettings, persistIndicatorSettings } from '../../utils/storage/indicatorStorage';

export type IndicatorSettingsState = Record<string, IndicatorSettingsValues>;

export interface UseIndicatorSettingsStateResult {
  indicatorSettings: IndicatorSettingsState;
  updateIndicatorSettings: (id: string, values: IndicatorSettingsValues) => void;
  resetIndicatorSettings: (id: string) => void;
}

export const useIndicatorSettingsState = (): UseIndicatorSettingsStateResult => {
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettingsState>(loadIndicatorSettings);

  const updateIndicatorSettings = (id: string, values: IndicatorSettingsValues) => {
    setIndicatorSettings((prev) => {
      const next = { ...prev, [id]: values };
      persistIndicatorSettings(next);
      return next;
    });
  };

  const resetIndicatorSettings = (id: string) => {
    setIndicatorSettings((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      persistIndicatorSettings(next);
      return next;
    });
  };

  return {
    indicatorSettings,
    updateIndicatorSettings,
    resetIndicatorSettings,
  };
};

