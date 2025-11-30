import { useEffect, useRef, useState } from 'react';
import type ReactType from 'react';

type Position = { x: number; y: number };

export const useChartContextMenu = () => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<Position>({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const onContextMenu = (event: ReactType.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setContextMenuOpen(true);
  };

  const closeContextMenu = () => {
    setContextMenuOpen(false);
  };

  useEffect(() => {
    if (!contextMenuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenuOpen(false);
      }
    };
    const handleScroll = () => setContextMenuOpen(false);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenuOpen]);

  return {
    contextMenuOpen,
    contextMenuPos,
    contextMenuRef,
    onContextMenu,
    closeContextMenu,
  };
};

