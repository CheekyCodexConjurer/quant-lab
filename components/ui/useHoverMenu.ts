import { useEffect, useRef, useState } from 'react';

type UseHoverMenuOptions = {
  closeDelay?: number;
};

/**
 * Pequeno hook para menus/popers: controla abrir/fechar, hover e click fora.
 * Uso: associe triggerRef/onTrigger... ao botão; menuRef/onMenu... ao menu.
 */
export const useHoverMenu = ({ closeDelay = 120 }: UseHoverMenuOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const close = () => {
    clearTimer();
    setIsOpen(false);
  };

  const open = () => {
    clearTimer();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearTimer();
    timerRef.current = setTimeout(() => setIsOpen(false), closeDelay);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKey);
    }
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    triggerRef,
    menuRef,
    onTriggerClick: () => (isOpen ? close() : open()),
    onTriggerEnter: () => open(),
    onTriggerLeave: () => scheduleClose(),
    onMenuEnter: () => clearTimer(),
    onMenuLeave: () => scheduleClose(),
  };
};
