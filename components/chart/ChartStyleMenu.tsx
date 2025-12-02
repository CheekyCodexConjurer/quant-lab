import React from 'react';
import { ChartAppearance } from '../../types';

type ChartStyleMenuProps = {
  appearance: ChartAppearance;
  onChange: (appearance: Partial<ChartAppearance>) => void;
  onReset: () => void;
  onClose: () => void;
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) => (
  <label className="flex items-center justify-between text-sm text-slate-700">
    <span>{label}</span>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-10 h-8 border border-slate-200 rounded cursor-pointer"
      aria-label={label}
    />
  </label>
);

export const ChartStyleMenu: React.FC<ChartStyleMenuProps> = ({ appearance, onChange, onReset, onClose }) => {
  return (
    <div className="absolute top-14 right-4 w-80 bg-white border border-slate-200 shadow-2xl rounded-sm p-4 z-30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Chart Style</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-xs">Close</button>
      </div>

      <div className="space-y-3">
        <ColorInput
          label="Background"
          value={appearance.backgroundColor}
          onChange={(color) => onChange({ backgroundColor: color })}
        />
        <div className="flex items-center justify-between text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={appearance.gridEnabled}
              onChange={(e) => onChange({ gridEnabled: e.target.checked })}
              className="accent-slate-900"
            />
            Grid lines
          </label>
          <input
            type="color"
            value={appearance.gridColor}
            disabled={!appearance.gridEnabled}
            onChange={(e) => onChange({ gridColor: e.target.value })}
            className="w-10 h-8 border border-slate-200 rounded cursor-pointer disabled:opacity-50"
            aria-label="Grid color"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bullish</p>
              <ColorInput
                label="Body"
                value={appearance.candleUp.body}
                onChange={(color) => onChange({ candleUp: { ...appearance.candleUp, body: color } })}
              />
              <ColorInput
                label="Border"
                value={appearance.candleUp.border}
                onChange={(color) => onChange({ candleUp: { ...appearance.candleUp, border: color } })}
              />
              <ColorInput
                label="Wick"
                value={appearance.candleUp.wick}
                onChange={(color) => onChange({ candleUp: { ...appearance.candleUp, wick: color } })}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bearish</p>
              <ColorInput
                label="Body"
                value={appearance.candleDown.body}
                onChange={(color) => onChange({ candleDown: { ...appearance.candleDown, body: color } })}
              />
              <ColorInput
                label="Border"
                value={appearance.candleDown.border}
                onChange={(color) => onChange({ candleDown: { ...appearance.candleDown, border: color } })}
              />
              <ColorInput
                label="Wick"
                value={appearance.candleDown.wick}
                onChange={(color) => onChange({ candleDown: { ...appearance.candleDown, wick: color } })}
              />
            </div>
          </div>
        </div>

        <div className="pt-1 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Scales</p>
          <ColorInput
            label="Text"
            value={appearance.scaleTextColor}
            onChange={(color) => onChange({ scaleTextColor: color })}
          />
          <label className="flex items-center justify-between text-sm text-slate-700">
            <span>Font size</span>
            <select
              value={appearance.scaleTextSize}
              onChange={(e) => onChange({ scaleTextSize: Number(e.target.value) })}
              className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 bg-white"
            >
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 16].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 border-t border-slate-100 pt-2">
          <input
            type="checkbox"
            checked={appearance.usePrevCloseColoring}
            onChange={(e) => onChange({ usePrevCloseColoring: e.target.checked })}
            className="accent-slate-900"
          />
          Color bars based on previous close
        </label>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-sm hover:bg-slate-800"
        >
          Done
        </button>
      </div>
    </div>
  );
};
