import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ConfirmDialog({ title, description, children }: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-describedby="dialog-description"
        aria-labelledby="dialog-title"
        aria-modal="true"
        className="confirm-dialog"
        role="dialog"
      >
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description">{description}</p>
        <div className="dialog-actions">{children}</div>
      </section>
    </div>
  );
}
