import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, BarChart2, Code, Database, Sliders, BookOpen, Github, User, ChevronRight, KeyRound, Info } from 'lucide-react';
import { ViewState } from '../../types';
import { useLicense } from '../../hooks/useLicense';

type SidebarProps = {
  activeView: ViewState;
  onChange: (view: ViewState) => void;
};

const SidebarItem = ({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 mb-1 ${
      isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-sm tracking-wide whitespace-nowrap">{label}</span>
    {isActive && <ChevronRight size={14} className="ml-auto text-slate-400" />}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChange }) => {
  const { license, applyKey, clearKey } = useLicense();
  const [openLicense, setOpenLicense] = useState(false);
  const [draft, setDraft] = useState(license.key || '');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>(undefined);

  const updatePopoverPosition = () => {
    if (typeof window === 'undefined') return;
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    const POPOVER_WIDTH = 260;
    const POPOVER_HEIGHT = 160;
    const H_OFFSET = 10;
    const VIEWPORT_PADDING = 8;

    let left = triggerRect.right + H_OFFSET;
    let top = triggerRect.top;

    if (left + POPOVER_WIDTH + VIEWPORT_PADDING > viewportWidth) {
      left = viewportWidth - VIEWPORT_PADDING - POPOVER_WIDTH;
    }

    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }

    if (top + POPOVER_HEIGHT + VIEWPORT_PADDING > viewportHeight) {
      top = Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - POPOVER_HEIGHT);
    }

    setPopoverStyle({
      position: 'fixed',
      left,
      top,
    });
  };

  useEffect(() => {
    if (!openLicense) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenLicense(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenLicense(false);
      }
    };

    const handleResize = () => {
      updatePopoverPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    updatePopoverPosition();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [openLicense]);

  const handleToggleLicense = () => {
    if (!openLicense) {
      setDraft(license.key || '');
    }
    setOpenLicense((prev) => !prev);
  };

  const handleApply = async () => {
    await applyKey(draft);
    setOpenLicense(false);
  };

  const handleClear = () => {
    clearKey();
    setDraft('');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-50">
      <div className="p-8 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-900 rounded-sm" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-lg tracking-tight text-slate-900">The Lab</span>
            <span className="text-xs text-slate-500 tracking-tight">Quantitative Backtesting</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-1 overflow-y-auto custom-scrollbar">
        <SidebarItem
          icon={<LayoutGrid size={18} />}
          label="Overview"
          isActive={activeView === ViewState.ANALYSIS}
          onClick={() => onChange(ViewState.ANALYSIS)}
        />
        <SidebarItem
          icon={<BarChart2 size={18} />}
          label="Chart"
          isActive={activeView === ViewState.CHART}
          onClick={() => onChange(ViewState.CHART)}
        />

        <div className="pt-4 mt-4 border-t border-slate-100">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Coding</p>
          <SidebarItem
            icon={<Code size={18} />}
            label="Lean Strategy"
            isActive={activeView === ViewState.STRATEGY}
            onClick={() => onChange(ViewState.STRATEGY)}
          />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data</p>
          <SidebarItem
            icon={<Database size={18} />}
            label="Data Sources"
            isActive={activeView === ViewState.DATA}
            onClick={() => onChange(ViewState.DATA)}
          />
          <SidebarItem
            icon={<Sliders size={18} />}
            label="Data Settings"
            isActive={activeView === ViewState.DATA_NORMALIZATION}
            onClick={() => onChange(ViewState.DATA_NORMALIZATION)}
          />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">External</p>
          <SidebarItem
            icon={<BookOpen size={18} />}
            label="API Docs"
            isActive={activeView === ViewState.API_DOCS}
            onClick={() => onChange(ViewState.API_DOCS)}
          />
          <SidebarItem
            icon={<Github size={18} />}
            label="Repository"
            isActive={activeView === ViewState.REPOSITORY}
            onClick={() => onChange(ViewState.REPOSITORY)}
          />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal</p>
          <SidebarItem
            icon={<BookOpen size={18} />}
            label="Roadmap"
            isActive={activeView === ViewState.ROADMAP}
            onClick={() => onChange(ViewState.ROADMAP)}
          />
        </div>
      </nav>

      <div className="p-6 mt-auto border-t border-slate-100 relative">
        <div className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-sm">
            <User size={14} className="text-slate-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">trader.matthews</p>
            <p className="text-xs text-slate-500 truncate">Lean Operator</p>
          </div>
          <button
            ref={triggerRef}
            type="button"
            onClick={handleToggleLicense}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Edit license"
          >
            <KeyRound size={16} />
          </button>
        </div>

        {openLicense && (
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="w-[260px] rounded-md border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)] px-3 py-2.5 z-40"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">License</p>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="TLAB-..."
                  className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50/60 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                />
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
                  title="Nesta fase a chave é usada apenas para gating local. O formato final pode mudar."
                >
                  <Info
                    size={13}
                    title="At this stage the key is only used for local gating. The final format may change in future releases."
                  />
                </button>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 h-7 text-[11px] font-medium text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 h-7 text-[11px] font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
