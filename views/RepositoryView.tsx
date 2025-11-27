import React from 'react';
import { Github } from 'lucide-react';
import { MainContent } from '../components/layout/MainContent';

const RepoCard: React.FC<{
  title: string;
  description: string;
  url: string;
  badge?: string;
}> = ({ title, description, url, badge }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="block border border-slate-200 rounded-sm p-6 hover:border-slate-300 hover:shadow-sm transition-all bg-white"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-slate-900 flex items-center justify-center rounded-sm">
        <Github size={18} className="text-white" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
        {badge && <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{badge}</span>}
      </div>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed mb-4">{description}</p>
    <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
      <span className="text-emerald-500">&#x2022;</span>
      <span>{url}</span>
    </div>
  </a>
);

export const RepositoryView: React.FC = () => {
  return (
    <MainContent className="bg-white border border-slate-200 p-10 shadow-sm min-h-[560px] h-auto min-h-full">
      <div className="border-b border-slate-100 pb-6 mb-8">
        <h1 className="text-3xl font-light text-slate-900 mb-2">Repository References</h1>
        <p className="text-slate-500 text-sm">
          Canonical repositories powering this workspace. Links open in a new tab.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RepoCard
          title="quant-lab"
          description="Main application repository (this project). Contains frontend, backend, and data import tooling."
          url="https://github.com/CheekyCodexConjurer/quant-lab"
          badge="Primary"
        />
        <RepoCard
          title="dukascopy-node"
          description="Data source wrapper used for Dukascopy imports. Pulled as an external dependency."
          url="https://github.com/Leo4815162342/dukascopy-node"
          badge="Data provider"
        />
        <RepoCard
          title="QuantConnect Lean"
          description="Open-source Lean engine for research/backtesting. Referenced by the local Lean integration and docs."
          url="https://github.com/QuantConnect/Lean"
          badge="Engine"
        />
      </div>

      <div className="mt-10 bg-slate-50 border border-slate-200 rounded p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Usage notes</h3>
        <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
          <li>Both links are public GitHub repositories; use them for cloning, issues, or inspecting the source.</li>
          <li>The application UI mirrors this list (no redirects to unavailable repos).</li>
          <li>Dukascopy imports rely on <code className="font-mono">dukascopy-node</code>; keep it pinned/updated as needed.</li>
        </ul>
      </div>
    </MainContent>
  );
};
