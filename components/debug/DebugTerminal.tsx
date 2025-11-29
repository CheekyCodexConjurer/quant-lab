import React, { useCallback, useRef, useState } from 'react';
import { apiClient } from '../../services/api/client';
import { ArrowRight } from 'lucide-react';

type HistoryEntry = {
  id: number;
  input: string;
  lines: string[];
  error?: string;
};

export const DebugTerminal: React.FC = () => {
  const [input, setInput] = useState('help');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const nextId = useRef(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const appendEntry = (entry: Omit<HistoryEntry, 'id'>) => {
    const id = nextId.current++;
    setHistory((prev) => [...prev, { id, ...entry }]);
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleExecute = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setBusy(true);
      appendEntry({ input: trimmed, lines: [] });
      try {
        const response = await apiClient.debugTerminal(trimmed);
        const lines: string[] = Array.isArray(response.lines) ? response.lines.map(String) : [];
        setHistory((prev) =>
          prev.map((entry, index) =>
            index === prev.length - 1
              ? {
                  ...entry,
                  lines,
                }
              : entry
          )
        );
      } catch (error) {
        const message = (error as Error)?.message || String(error);
        setHistory((prev) =>
          prev.map((entry, index) =>
            index === prev.length - 1
              ? {
                  ...entry,
                  error: message,
                }
              : entry
          )
        );
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const current = input;
    setInput('');
    setCursor(null);
    await handleExecute(current);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      setCursor((prev) => {
        const next = prev === null ? history.length - 1 : Math.max(0, prev - 1);
        setInput(history[next]?.input || '');
        return next;
      });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!history.length) return;
      setCursor((prev) => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next >= history.length) {
          setInput('');
          return null;
        }
        setInput(history[next]?.input || '');
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-full border border-slate-200 rounded-md bg-black text-slate-100 text-[11px]">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold tracking-wide uppercase text-[10px] text-slate-200">Debug Console</span>
        </div>
        {busy ? <span className="text-[10px] text-slate-400">Running...</span> : null}
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-slate-950/95">
        {history.length === 0 ? (
          <div className="text-slate-500">
            Type <span className="font-mono text-slate-300">help</span> and press Enter to see available commands.
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono">$</span>
                <span className="font-mono text-slate-100">{entry.input}</span>
              </div>
              {entry.error ? (
                <div className="pl-4 text-rose-400 font-mono">{entry.error}</div>
              ) : (
                entry.lines.map((line, idx) => (
                  <div key={idx} className="pl-4 text-slate-300 font-mono">
                    {line}
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-800 px-3 py-2 flex items-center gap-1 bg-slate-900/90">
        <ArrowRight size={11} className="text-emerald-400 flex-shrink-0" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-[11px] text-slate-100 font-mono placeholder:text-slate-500"
          placeholder="help | health | list indicators | run indicator ema_100.py --asset=CL1! --tf=M15 --len=1000"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />
      </form>
    </div>
  );
};

