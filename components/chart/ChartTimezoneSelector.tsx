import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { TIMEZONE_OPTIONS, getTimezoneById } from '../../constants/timezones';

type ChartTimezoneSelectorProps = {
  timezoneId: string;
  onChange: (timezoneId: string) => void;
};

export const ChartTimezoneSelector: React.FC<ChartTimezoneSelectorProps> = ({ timezoneId, onChange }) => {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', {
          timeZone: timezoneId,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const tz = getTimezoneById(timezoneId);
        // Extract just the offset part e.g. UTC-3 from (UTC-3)
        const offsetShort = tz.offset.replace(/[()]/g, '');
        setCurrentTime(`${timeString} ${offsetShort}`);
      } catch (e) {
        // Fallback if timezone is invalid
        setCurrentTime('--:--:-- UTC');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezoneId]);

  return (
    <div ref={containerRef} className="relative z-50">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 text-xs font-medium border border-slate-200 rounded-sm shadow-sm hover:text-slate-900 hover:border-slate-300 transition-all"
        aria-label="Select chart timezone"
      >
        <span className="tabular-nums">{currentTime}</span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded shadow-xl py-1 max-h-[400px] overflow-y-auto custom-scrollbar z-50">
          {TIMEZONE_OPTIONS.map((tz) => {
            const isActive = tz.id === timezoneId;
            return (
              <button
                key={tz.id}
                onClick={() => {
                  onChange(tz.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-1.5 text-[13px] flex items-center justify-between transition-colors ${isActive ? 'bg-slate-100 text-[#2962FF] font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span>
                  {tz.offset} {tz.label}
                </span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
