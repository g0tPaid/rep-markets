import type { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[428px] overflow-hidden bg-white text-black shadow-[0_0_0_1px_rgba(17,17,17,0.04)]">
      {children}
    </div>
  );
}
