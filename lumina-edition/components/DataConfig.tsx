import React from 'react';
import { ToggleLeft, ToggleRight, Globe, Clock, Save } from 'lucide-react';

const ConfigSection = ({ title, icon: Icon, children }: any) => (
  <div className="bg-white rounded-[2rem] shadow-soft p-8 mb-6 animate-in slide-in-from-bottom-4 duration-700">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
      <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {children}
    </div>
  </div>
);

const InputField = ({ label, placeholder, defaultValue, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{label}</label>
    <input 
      type={type} 
      defaultValue={defaultValue} 
      placeholder={placeholder}
      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-sky-200 transition-all placeholder:text-slate-400" 
    />
  </div>
);

const ToggleSwitch = ({ label, description, active }: any) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
    <button className={`text-3xl transition-colors ${active ? 'text-emerald-500' : 'text-slate-300'}`}>
      {active ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
    </button>
  </div>
);

export const DataConfig: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
       
       <div className="mb-8">
         <h2 className="text-2xl font-bold text-slate-800">Data Configuration</h2>
         <p className="text-slate-500">Configure how raw tick data is aligned, normalized, and discretized before feeding the engine.</p>
       </div>

       <ConfigSection title="Timezone & Alignment" icon={Globe}>
          <div className="md:col-span-2">
            <InputField label="Timezone Adjustment" defaultValue="(UTC-3) Sao Paulo" />
            <p className="text-xs text-slate-400 mt-2 ml-1">Recommended for aligning futures contracts to local exchange time.</p>
          </div>
       </ConfigSection>

       <ConfigSection title="Gap Handling" icon={Clock}>
         <div className="md:col-span-2 space-y-4">
           <ToggleSwitch 
              label="Gap Quantization" 
              description="Re-open each candle at the previous close to remove visual gaps across the series." 
              active={true} 
           />
           <ToggleSwitch 
              label="Fill Missing Data" 
              description="Forward fill prices when no ticks occur during a time bucket." 
              active={false} 
           />
         </div>
       </ConfigSection>

       <div className="flex justify-end pt-4 pb-12">
          <button className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
             <Save size={18} /> Save Configuration
          </button>
       </div>
    </div>
  );
};
