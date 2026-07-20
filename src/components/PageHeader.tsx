import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">NW道場</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions}
    </header>
  );
}
