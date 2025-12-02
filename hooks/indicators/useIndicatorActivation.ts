import { useCallback } from 'react';
import type { CustomIndicator } from '../../types';
import { apiClient } from '../../services/api/client';

export interface UseIndicatorActivationArgs {
  indicators: CustomIndicator[];
  setIndicators: React.Dispatch<React.SetStateAction<CustomIndicator[]>>;
}

export interface UseIndicatorActivationResult {
  setIndicatorActive: (id: string, active: boolean) => Promise<void>;
  toggleActiveIndicator: (id: string) => Promise<void>;
}

export const useIndicatorActivation = ({
  indicators,
  setIndicators,
}: UseIndicatorActivationArgs): UseIndicatorActivationResult => {
  const setIndicatorActive = useCallback(
    async (id: string, active: boolean) => {
      const current = indicators.find((indicator) => indicator.id === id);
      if (!current || current.isActive === active) return;

      await apiClient.setIndicatorActive(id, active);
      setIndicators((prev) =>
        prev.map((indicator) =>
          indicator.id === id ? { ...indicator, isActive: active } : indicator
        )
      );
    },
    [indicators, setIndicators]
  );

  const toggleActiveIndicator = useCallback(
    async (id: string) => {
      const current = indicators.find((indicator) => indicator.id === id);
      const nextValue = !current?.isActive;
      try {
        await setIndicatorActive(id, nextValue);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[useIndicatorActivation] toggleActive failed', error);
      }
    },
    [indicators, setIndicatorActive]
  );

  return {
    setIndicatorActive,
    toggleActiveIndicator,
  };
};

