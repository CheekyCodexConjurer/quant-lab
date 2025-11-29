import React, { useEffect, useMemo, useRef } from 'react';

type PythonEditorProps = {
  value: string;
  onChange?: (next: string) => void;
  highlight?: (code: string) => string;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  overlayClassName?: string;
  textareaClassName?: string;
  errorLines?: number[];
};

const defaultHighlight = (code: string) =>
  (code || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildHighlightedWithErrors = (code: string, renderer: (code: string) => string, errorLines: number[]) => {
  if (!errorLines || !errorLines.length) {
    return renderer(code);
  }
  const normalized = Array.from(new Set(errorLines.filter((n) => Number.isFinite(n) && n > 0))).sort((a, b) => a - b);
  if (!normalized.length) return renderer(code);
  const rawLines = (code || '').split('\n');
  const highlightedLines = rawLines.map((line) => renderer(line || ''));
  const set = new Set(normalized);
  const wrapped = highlightedLines.map((html, index) => {
    const lineNumber = index + 1;
    if (!set.has(lineNumber)) return html;
    return `<span class="bg-rose-50/80 border-l-2 border-rose-400 -mx-4 px-4">${html}</span>`;
  });
  return wrapped.join('\n');
};

export const PythonEditor: React.FC<PythonEditorProps> = ({
  value,
  onChange,
  highlight,
  placeholder,
  readOnly = false,
  className = '',
  overlayClassName = '',
  textareaClassName = '',
  errorLines = [],
}) => {
  const overlayRef = useRef<HTMLPreElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const rendered = useMemo(() => {
    const renderer = highlight || defaultHighlight;
    if (!errorLines || !errorLines.length) {
      return renderer(value || '');
    }
    return buildHighlightedWithErrors(value || '', renderer, errorLines);
  }, [value, highlight, errorLines]);

  useEffect(() => {
    if (!overlayRef.current || !inputRef.current) return;
    overlayRef.current.scrollTop = inputRef.current.scrollTop;
    overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
  }, [value]);

  const syncScroll = () => {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollTop = inputRef.current.scrollTop;
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <pre
        ref={overlayRef}
        aria-hidden
        className={`absolute inset-0 m-0 p-6 font-mono text-base leading-relaxed text-slate-800 whitespace-pre-wrap overflow-auto pointer-events-none border-b border-slate-100 z-10 ${overlayClassName}`}
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
      <textarea
        ref={inputRef}
        value={value || ''}
        placeholder={placeholder}
        onChange={(event) => onChange && onChange(event.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        readOnly={readOnly}
        className={`absolute inset-0 w-full h-full p-6 font-mono text-base leading-relaxed ${
          readOnly ? 'text-slate-500' : 'text-transparent caret-slate-900'
        } bg-transparent outline-none border-b border-slate-100 resize-none overflow-auto selection:bg-slate-200 z-0 ${textareaClassName}`}
      />
    </div>
  );
};
