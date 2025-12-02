import React from 'react';
import { Github, Star, GitFork, ExternalLink, Box, Code } from 'lucide-react';

const RepoCard = ({ name, description, tags, stars, language, isPrimary, link }: any) => (
  <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col hover:shadow-lg transition-all duration-300 group">
     <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isPrimary ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
           {isPrimary ? <Box size={24} /> : <Code size={24} />}
        </div>
        <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                <Star size={12} className="text-amber-400 fill-amber-400" /> {stars}
            </span>
            {isPrimary && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wide">
                    Primary
                </span>
            )}
        </div>
     </div>

     <h3 className="text-lg font-bold text-slate-800 mb-2">{name}</h3>
     <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">{description}</p>

     <div className="flex flex-wrap gap-2 mb-6">
        {tags.map((tag: string) => (
            <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium border border-slate-100">
                {tag}
            </span>
        ))}
     </div>

     <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <div className={`w-2 h-2 rounded-full ${language === 'TypeScript' ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
            {language}
        </div>
        <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors"
        >
            View Code <ExternalLink size={14} />
        </a>
     </div>
  </div>
);

export const Repositories: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Repositories</h2>
            <p className="text-slate-500">
                Source code and documentation for the entire ecosystem. 
                The Lab is built on top of open-source engines and custom integration layers.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <RepoCard 
                name="quant-lab"
                description="Main application repository (this project). Contains the React frontend, data visualization layers, and local Python bridge utilities."
                tags={['React', 'Vite', 'Python Bridge', 'Tailwind']}
                stars="12"
                language="TypeScript"
                isPrimary={true}
                link="https://github.com/CheekyCodexConjurer/quant-lab"
             />

             <RepoCard 
                name="QuantConnect Lean"
                description="Open-source algorithmic trading engine. The Lab uses a customized fork of Lean for heavy-duty backtesting and data ingestion."
                tags={['C#', 'Python', 'Finance', 'Quant']}
                stars="8.2k"
                language="C#"
                isPrimary={false}
                link="https://github.com/QuantConnect/Lean"
             />
        </div>

        <div className="mt-8 bg-sky-50 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-sky-100">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sky-500 shadow-sm">
                    <Github size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Contribute to The Lab</h3>
                    <p className="text-sm text-slate-500">Found a bug or have a feature request? Open an issue on GitHub.</p>
                </div>
            </div>
            <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-sky-200 transition-all">
                Open Issue
            </button>
        </div>
    </div>
  );
};