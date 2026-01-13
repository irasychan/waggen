import type { ReactNode } from 'react';

interface ThreeColumnLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function ThreeColumnLayout({ left, center, right }: ThreeColumnLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel - State tree */}
      <div className="w-56 flex-shrink-0 border-r bg-card overflow-auto">
        {left}
      </div>

      {/* Center panel - Graph */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {center}
      </div>

      {/* Right panel - Actions */}
      <div className="w-80 flex-shrink-0 border-l bg-card overflow-auto">
        {right}
      </div>
    </div>
  );
}
