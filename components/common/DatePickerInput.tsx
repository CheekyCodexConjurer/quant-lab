import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export const DatePickerInput: React.FC<DatePickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isOpen && value && value.includes('-') && value.length === 10) {
      const [day, month, year] = value.split('-').map(Number);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        setCurrentDate(new Date(year, month - 1, 1));
      }
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const dd = day.toString().padStart(2, '0');
    const mm = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = currentDate.getFullYear();
    onChange(`${dd}-${mm}-${yyyy}`);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-6 h-6" />);
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(
        <button
          key={i}
          onClick={() => handleDayClick(i)}
          className="w-6 h-6 flex items-center justify-center text-xs rounded-full hover:bg-slate-900 hover:text-white text-slate-700 transition-colors"
        >
          {i}
        </button>
      );
    }

    return (
      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-sm p-4 z-50 w-56">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          <span className="text-xs font-bold text-slate-900">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight size={14} className="text-slate-500" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <span key={day} className="text-[10px] font-bold text-slate-400">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">{days}</div>
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-400 placeholder:text-slate-400 transition-all"
        />
        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {isOpen && renderCalendar()}
    </div>
  );
};
