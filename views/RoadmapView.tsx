import React, { useEffect, useMemo, useState } from 'react';
import { MainContent } from '../components/layout/MainContent';
import { Flag, Rocket, Calendar, ShieldCheck, Target, Loader2 } from 'lucide-react';

type ListItem = { text: string; checked?: boolean };
type Block =
  | { type: 'heading'; level: number; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: ListItem[] }
  | { type: 'table'; header: string[]; rows: string[][] };

const normalizeText = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const slugify = (value: string) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

const parseTableRow = (line: string) => line.split('|').slice(1, -1).map((cell) => cell.trim());

const parseMarkdown = (markdown: string): Block[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  let paragraph: string[] = [];
  let list: ListItem[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list && list.length) {
      blocks.push({ type: 'list', items: list });
    }
    list = null;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      blocks.push({ type: 'heading', level, text, id: slugify(text) });
      i += 1;
      continue;
    }

    const isTableStart = line.startsWith('|') && lines[i + 1]?.match(/^\s*\|?\s*-+/);
    if (isTableStart) {
      flushParagraph();
      flushList();
      const header = parseTableRow(line);
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const listMatch = line.match(/^-\s+(.*)$/);
    if (listMatch) {
      const itemText = listMatch[1].trim();
      const checkboxMatch = itemText.match(/^\[( |x|X)\]\s*(.*)$/);
      const isChecked = checkboxMatch ? checkboxMatch[1].toLowerCase() === 'x' : undefined;
      const text = checkboxMatch ? checkboxMatch[2].trim() : itemText;
      list = list || [];
      list.push({ text, checked: isChecked });
      i += 1;
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph();
  flushList();
  return blocks;
};

const renderInline = (text: string) => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${match.index}-b`} className="text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('~~')) {
      nodes.push(
        <span key={`${match.index}-s`} className="line-through text-slate-500">
          {token.slice(2, -2)}
        </span>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${match.index}-c`}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[12px] font-mono border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
};

const iconForHeading = (text: string) => {
  const lowered = text.toLowerCase();
  if (lowered.includes('fase 0')) return <Target size={16} className="text-slate-700" />;
  if (lowered.includes('fase 1')) return <Rocket size={16} className="text-slate-700" />;
  if (lowered.includes('fase 2')) return <Rocket size={16} className="text-slate-700" />;
  if (lowered.includes('fase 3')) return <Rocket size={16} className="text-slate-700" />;
  if (lowered.includes('princip')) return <ShieldCheck size={16} className="text-slate-700" />;
  if (lowered.includes('timeline')) return <Calendar size={16} className="text-slate-700" />;
  if (lowered.includes('estrategia') || lowered.includes('overview')) return <Flag size={16} className="text-slate-700" />;
  return null;
};

export const RoadmapView: React.FC = () => {
  const [rawMd, setRawMd] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const res = await fetch(`${base}ROADMAP.md`);
        const text = await res.text();
        setRawMd(text);
      } catch (error) {
        console.warn('[roadmap] failed to load ROADMAP.md', error);
      }
    };
    load();
  }, []);

  const blocks = useMemo(() => parseMarkdown(rawMd), [rawMd]);

  return (
    <MainContent className="bg-white border border-slate-200 p-8 shadow-sm min-h-[600px] h-auto min-h-full">
      <div className="border-b border-slate-100 pb-3 mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-slate-900 mb-2">Internal Roadmap</h1>
          <p className="text-slate-500">Renderizado direto de ROADMAP.md. Edite o arquivo e as mudancas aparecem aqui.</p>
        </div>
      </div>

      {!rawMd ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando roadmap...</span>
        </div>
      ) : (
        <div className="space-y-5 pb-10">
          {blocks.map((block, index) => {
            if (block.type === 'heading') {
              const icon = iconForHeading(block.text);
              const HeadingTag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
              const textSize =
                block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : block.level === 3 ? 'text-lg' : 'text-base';
              return (
                <section key={block.id} id={block.id} className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <HeadingTag className={`${textSize} font-medium text-slate-900`}>{block.text}</HeadingTag>
                  </div>
                </section>
              );
            }

            if (block.type === 'paragraph') {
              return (
                <p key={`p-${index}`} className="text-sm text-slate-700 leading-relaxed">
                  {renderInline(block.text)}
                </p>
              );
            }

            if (block.type === 'list') {
              return (
                <ul key={`l-${index}`} className="space-y-1 text-sm text-slate-700">
                  {block.items.map((item, idx) => (
                    <li key={`li-${index}-${idx}`} className="flex items-start gap-2">
                      {typeof item.checked === 'boolean' ? (
                        <input type="checkbox" checked={item.checked} readOnly className="mt-1 h-3.5 w-3.5 accent-slate-700" />
                      ) : (
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                      )}
                      <span className={`${item.checked ? 'line-through text-slate-500' : 'text-slate-700'}`}>{renderInline(item.text)}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            if (block.type === 'table') {
              return (
                <div key={`t-${index}`} className="overflow-x-auto border border-slate-200 rounded">
                  <table className="min-w-full text-sm text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-900 font-semibold">
                      <tr>
                        {block.header.map((cell, idx) => (
                          <th key={`th-${index}-${idx}`} className="px-3 py-2 border-b border-slate-200">
                            {renderInline(cell)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, rIdx) => (
                        <tr key={`tr-${index}-${rIdx}`} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          {row.map((cell, cIdx) => (
                            <td key={`td-${index}-${rIdx}-${cIdx}`} className="px-3 py-2 border-b border-slate-100">
                              {renderInline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </MainContent>
  );
};
