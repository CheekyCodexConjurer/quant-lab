import React from 'react';
import { RotateCcw } from 'lucide-react';

type ChartContextMenuProps = {
  x: number;
  y: number;
  onReset: () => void;
  onMoveToIndicator?: () => void;
  onClose: () => void;
};

export const ChartContextMenu: React.FC<ChartContextMenuProps> = ({ x, y, onReset, onMoveToIndicator, onClose }) => {
  return (
    <div
      className="absolute z-30 w-44 py-0.5 rounded-md shadow-[0_8px_18px_rgba(15,23,42,0.08)] bg-white border border-slate-200 text-slate-800"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => {
          onReset();
          onClose();
        }}
        className="w-full px-2.5 py-0.5 flex items-center gap-0.5 text-sm font-semibold hover:bg-slate-50 transition-colors text-left"
      >
        <RotateCcw size={14} className="text-slate-500" />
        <span>Reset chart view</span>
      </button>
      {onMoveToIndicator && (
        <button
          onClick={() => {
            onMoveToIndicator();
            onClose();
          }}
          className="w-full px-2.5 py-0.5 flex items-center gap-0.5 text-sm font-semibold hover:bg-slate-50 transition-colors text-left"
        >
          <span className="text-slate-500 text-xs">⤵</span>
          <span>Move to indicator plot</span>
        </button>
      )}
    </div>
  );
};
