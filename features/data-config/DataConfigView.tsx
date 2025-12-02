import React, { useEffect, useRef, useState } from 'react';
import { ToggleLeft, ToggleRight, Globe, Clock, Save, ChevronDown, Check } from 'lucide-react';
import { TIMEZONE_OPTIONS, getTimezoneById } from '../../constants/timezones';

export interface DataConfigViewProps {
  normTimezone: string;
  setNormTimezone: (value: string) => void;
  gapQuantEnabled: boolean;
  setGapQuantEnabled: (value: boolean) => void;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
}

interface ConfigSectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-[2rem] shadow-soft p-8 mb-6">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
      <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>
  </div>
);

interface InputFieldProps {
  label: string;
  placeholder?: string;
  value: string | number;
  type?: string;
  onChange: (value: string) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  type = 'text',
  onChange,
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-sky-200 transition-all placeholder:text-slate-400"
    />
  </div>
);

interface TimezoneSelectProps {
  value: string;
  onChange: (timezoneId: string) => void;
}

const TimezoneSelect: React.FC<TimezoneSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const current = getTimezoneById(value || 'America/Sao_Paulo');

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleClick);
    }

    return () => {
      window.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
        Timezone
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-700 font-medium flex items-center justify-between focus:ring-2 focus:ring-sky-200 transition-all"
      >
        <span className="text-sm">
          {current.offset} {current.label}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl custom-scrollbar">
          {TIMEZONE_OPTIONS.map((tz) => {
            const isActive = tz.id === current.id;
            return (
              <button
                key={tz.id}
                type="button"
                onClick={() => {
                  onChange(tz.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors ${
                  isActive ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>
                  {tz.offset} {tz.label}
                </span>
                {isActive && <Check size={14} className="text-sky-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ToggleSwitchProps {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, active, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 w-full text-left"
  >
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
    <span className={`text-3xl transition-colors ${active ? 'text-emerald-500' : 'text-slate-300'}`}>
      {active ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
    </span>
  </button>
);

export const DataConfigView: React.FC<DataConfigViewProps> = ({
  normTimezone,
  setNormTimezone,
  gapQuantEnabled,
  setGapQuantEnabled,
  onSave,
  isSaving,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Data Configuration</h2>
        <p className="text-slate-500">
          Configure how raw tick data is aligned, normalized, and discretized before feeding the
          engine.
        </p>
      </div>

      <ConfigSection title="Timezone & Alignment" icon={Globe}>
        <div className="md:col-span-2 space-y-4">
          <TimezoneSelect value={normTimezone} onChange={setNormTimezone} />
          <p className="text-xs text-slate-400 ml-1">
            Recommended: align futures contracts to the local exchange time.
          </p>
        </div>
      </ConfigSection>

      <ConfigSection title="Gap Handling" icon={Clock}>
        <div className="md:col-span-2 space-y-4">
          <ToggleSwitch
            label="Gap Quantization"
            description="Re-open each candle at the previous close to remove visual gaps across the series."
            active={gapQuantEnabled}
            onToggle={() => setGapQuantEnabled(!gapQuantEnabled)}
          />
          <ToggleSwitch
            label="Fill Missing Data"
            description="Forward fill prices when no ticks occur during a time bucket. (visual only for now)"
            active={false}
            onToggle={() => undefined}
          />
        </div>
      </ConfigSection>

      <div className="flex justify-end pt-4 pb-12">
        <button
          type="button"
          onClick={() => onSave()}
          disabled={isSaving}
          className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-xl"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
