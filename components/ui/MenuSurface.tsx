import React from 'react';

type MenuSurfaceProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Superfície padrão para menus/popers pequenos (mesmo look do Reset menu).
 */
export const MenuSurface: React.FC<MenuSurfaceProps> = ({ className, children }) => (
  <div
    className={`bg-white border border-slate-200 rounded-md shadow-[0_8px_18px_rgba(15,23,42,0.08)] p-3 text-sm ${className || ''}`}
  >
    {children}
  </div>
);
