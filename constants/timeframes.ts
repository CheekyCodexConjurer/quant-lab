export type TimeframeOption = {
  code: string;
  label: string;
  description?: string;
};

export type TimeframeCategory = {
  id: string;
  label: string;
  options: TimeframeOption[];
};

export const TIMEFRAME_LIBRARY: TimeframeCategory[] = [
  {
    id: 'ticks',
    label: 'Ticks',
    options: [
      { code: 'TICK', label: '1 tick' },
      { code: '10T', label: '10 ticks' },
      { code: '100T', label: '100 ticks' },
      { code: '1000T', label: '1000 ticks' },
    ],
  },
  {
    id: 'seconds',
    label: 'Seconds',
    options: [
      { code: 'S1', label: '1 second' },
      { code: 'S5', label: '5 seconds' },
      { code: 'S10', label: '10 seconds' },
      { code: 'S30', label: '30 seconds' },
    ],
  },
  {
    id: 'minutes',
    label: 'Minutes',
    options: [
      { code: 'M1', label: '1 minute' },
      { code: 'M2', label: '2 minutes' },
      { code: 'M5', label: '5 minutes' },
      { code: 'M10', label: '10 minutes' },
      { code: 'M15', label: '15 minutes' },
      { code: 'M30', label: '30 minutes' },
      { code: 'M45', label: '45 minutes' },
    ],
  },
  {
    id: 'hours',
    label: 'Hours',
    options: [
      { code: 'H1', label: '1 hour' },
      { code: 'H2', label: '2 hours' },
      { code: 'H3', label: '3 hours' },
      { code: 'H4', label: '4 hours' },
      { code: 'H8', label: '8 hours' },
      { code: 'H12', label: '12 hours' },
    ],
  },
  {
    id: 'days',
    label: 'Days',
    options: [
      { code: 'D1', label: '1 day' },
      { code: 'D7', label: '1 week' },
      { code: 'D30', label: '1 month' },
      { code: 'D90', label: '3 months' },
      { code: 'D180', label: '6 months' },
      { code: 'D365', label: '12 months' },
    ],
  },
];
