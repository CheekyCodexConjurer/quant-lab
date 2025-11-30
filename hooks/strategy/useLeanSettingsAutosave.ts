import { useCallback, useEffect, useRef, useState } from 'react';

type LeanParams = { cash: number; feeBps: number; slippageBps: number };

type UseLeanSettingsAutosaveParams = {
  leanParams: LeanParams;
  onLeanParamsChange: (next: LeanParams) => Promise<void> | void;
  onAutosaveError?: (error: unknown) => void;
};

export const useLeanSettingsAutosave = ({
  leanParams,
  onLeanParamsChange,
  onAutosaveError,
}: UseLeanSettingsAutosaveParams) => {
  const [settingsDraft, setSettingsDraft] = useState<LeanParams>(leanParams);
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (onAutosaveError) {
        onAutosaveError(error);
      }
    }
  }, [settingsDraft, leanParams.cash, leanParams.feeBps, leanParams.slippageBps, onLeanParamsChange]);

  const scheduleSettingsSave = useCallback(() => {
    clearSettingsSaveTimer();
    settingsSaveTimer.current = setTimeout(() => {
      void flushSettingsSave();
    }, 400);
  }, [flushSettingsSave]);

  useEffect(() => {
    setSettingsDraft(leanParams);
  }, [leanParams.cash, leanParams.feeBps, leanParams.slippageBps]);

  useEffect(() => {
    return () => clearSettingsSaveTimer();
  }, []);

  return {
    settingsDraft,
    setSettingsDraft,
    flushSettingsSave,
    scheduleSettingsSave,
    clearSettingsSaveTimer,
  };
};

