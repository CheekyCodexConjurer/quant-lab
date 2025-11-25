import { useEffect, useMemo, useState } from 'react';
import { Candle, CustomIndicator } from '../types';
import { calculateEMA, DEFAULT_INDICATOR_CODE, NEW_INDICATOR_TEMPLATE } from '../utils/indicators';

export const useIndicators = (data: Candle[]) => {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([
    {
      id: '1',
      name: 'EMA 200',
      code: DEFAULT_INDICATOR_CODE,
      isActive: true,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>('1');
  const [indicatorData, setIndicatorData] = useState<{ time: string | number; value: number }[]>([]);

  useEffect(() => {
    const active = indicators.find((item) => item.isActive);
    if (data.length > 0 && active) {
      const period = active.name.includes('50') ? 50 : 200;
      setIndicatorData(calculateEMA(data, period));
    } else {
      setIndicatorData([]);
    }
  }, [data, indicators]);

  const createIndicator = () => {
    const newIndicator: CustomIndicator = {
      id: Date.now().toString(),
      name: 'New Indicator',
      code: NEW_INDICATOR_TEMPLATE,
      isActive: false,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setIndicators((prev) => [...prev, newIndicator]);
    setSelectedIndicatorId(newIndicator.id);
  };

  const deleteIndicator = (id: string) => {
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id));
    setSelectedIndicatorId((current) => (current === id ? null : current));
  };

  const saveIndicator = (id: string, code: string, name?: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id
          ? {
              ...indicator,
              code,
              name: name ?? indicator.name,
              updatedAt: Date.now(),
            }
          : indicator
      )
    );
  };

  const toggleActiveIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id ? { ...indicator, isActive: !indicator.isActive } : indicator
      )
    );
  };

  const toggleVisibility = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id ? { ...indicator, isVisible: !indicator.isVisible } : indicator
      )
    );
  };

  const activeIndicator = useMemo(
    () => indicators.find((indicator) => indicator.id === selectedIndicatorId) ?? null,
    [indicators, selectedIndicatorId]
  );

  return {
    indicators,
    indicatorData,
    selectedIndicatorId,
    setSelectedIndicatorId,
    activeIndicator,
    createIndicator,
    deleteIndicator,
    saveIndicator,
    toggleActiveIndicator,
    toggleVisibility,
  };
};
