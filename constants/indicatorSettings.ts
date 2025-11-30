import { IndicatorSettingsDefinition, IndicatorSettingsValues } from '../types';

export const INDICATOR_SETTINGS_DEFINITIONS: Record<string, IndicatorSettingsDefinition> = {
  'ema_100.py': {
    id: 'ema_100.py',
    title: 'EMA 100',
    tabs: ['Inputs'],
    fields: [
      {
        id: 'length',
        label: 'Length',
        type: 'number',
        tab: 'Inputs',
        defaultValue: 100,
        min: 1,
        max: 500,
        step: 1,
        description: 'Number of bars used to compute the EMA.',
      },
      {
        id: 'source',
        label: 'Source',
        type: 'select',
        tab: 'Inputs',
        defaultValue: 'close',
        options: [
          { value: 'close', label: 'Close' },
          { value: 'open', label: 'Open' },
          { value: 'high', label: 'High' },
          { value: 'low', label: 'Low' },
        ],
        description: 'Price series used as input for the EMA.',
      },
    ],
  },
  'market-structure.py': {
    id: 'market-structure.py',
    title: 'Market Structure',
    tabs: ['Visibility'],
    fields: [
      {
        id: 'visibilityMode',
        label: 'Visible elements',
        type: 'select',
        tab: 'Visibility',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All levels & markers' },
          { value: 'protected-only', label: 'Protected levels only' },
          { value: 'levels-only', label: 'Levels only' },
          { value: 'markers-only', label: 'Markers only' },
        ],
        description: 'Controls which structures are drawn on the chart.',
      },
    ],
  },
};

export const getIndicatorSettingsDefinition = (id: string | null | undefined): IndicatorSettingsDefinition | null => {
  if (!id) return null;
  return INDICATOR_SETTINGS_DEFINITIONS[id] || null;
};

export const buildDefaultIndicatorSettings = (definition: IndicatorSettingsDefinition): IndicatorSettingsValues => {
  const values: IndicatorSettingsValues = {};
  definition.fields.forEach((field) => {
    values[field.id] = field.defaultValue;
  });
  return values;
};
