import React from 'react';

type MainContentProps = {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'col';
};

// Shared centered work area for editor-like pages; keeps width compact and consistent.
export const MainContent: React.FC<MainContentProps> = ({ children, className, direction = 'col' }) => {
  const composed = ['w-full', 'h-full', 'max-w-6xl', 'flex', direction === 'row' ? 'flex-row' : 'flex-col', className].filter(Boolean).join(' ');
  return (
    <div className="flex-1 h-full min-h-0 flex justify-center items-stretch">
      <div className={composed}>{children}</div>
    </div>
  );
};
