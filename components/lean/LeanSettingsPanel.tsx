import React from 'react';

type LeanParams = { cash: number; feeBps: number; slippageBps: number };

type LeanSettingsPanelProps = {
  open: boolean;
  params: LeanParams;
  onChange: (next: LeanParams) => void;
  menuRef?: React.RefObject<HTMLDivElement>;
  onMenuEnter?: () => void;
  onMenuLeave?: () => void;
};

export const LeanSettingsPanel: React.FC<LeanSettingsPanelProps> = ({
  open,
  params,
  onChange,
  menuRef,
  onMenuEnter,
  onMenuLeave,
}) => {
  return (
    <div
      ref={menuRef as any}
      onMouseEnter={onMenuEnter}
      onMouseLeave={onMenuLeave}
      className={`absolute top-full right-0 mt-2 w-[210px] max-w-[224px] min-w-[182px] bg-white border border-slate-200 shadow-[0_10px_22px_rgba(15,23,42,0.06)] rounded-md z-40 transition duration-150 ease-out origin-top ${
        open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Lean Engine Settings"
    >
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-md">
        <span className="text-sm font-semibold text-slate-700 leading-none">Lean Engine Settings</span>
      </div>
      <div className="px-3 py-2 space-y-2 text-sm text-slate-700">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 leading-none">Cash</span>
          <input
            type="text"
            inputMode="decimal"
            value={params.cash}
            onChange={(event) => onChange({ ...params, cash: Number(event.target.value) })}
            className="h-8 px-2.5 rounded-md border border-slate-200 focus:border-slate-400 outline-none bg-white text-right font-mono text-xs text-slate-800 appearance-none [-moz-appearance:textfield]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 leading-none">Fee (bps)</span>
          <input
            type="text"
            inputMode="decimal"
            value={params.feeBps}
            onChange={(event) => onChange({ ...params, feeBps: Number(event.target.value) })}
            className="h-8 px-2.5 rounded-md border border-slate-200 focus:border-slate-400 outline-none bg-white text-right font-mono text-xs text-slate-800 appearance-none [-moz-appearance:textfield]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500 leading-none">Slippage (bps)</span>
          <input
            type="text"
            inputMode="decimal"
            value={params.slippageBps}
            onChange={(event) => onChange({ ...params, slippageBps: Number(event.target.value) })}
            className="h-8 px-2.5 rounded-md border border-slate-200 focus:border-slate-400 outline-none bg-white text-right font-mono text-xs text-slate-800 appearance-none [-moz-appearance:textfield]"
          />
        </label>
      </div>
    </div>
  );
};
