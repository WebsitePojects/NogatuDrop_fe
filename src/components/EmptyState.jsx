import { Button } from 'flowbite-react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state-shell flex flex-col items-center justify-center px-4 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-amber-900/20">
          <Icon className="w-8 h-8 text-amber-500" />
        </div>
      )}
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-[var(--dark-text)]">{title}</h3>
      {description && <p className="mb-5 max-w-sm text-sm leading-6 text-[#7b5a43] dark:text-[var(--dark-muted)]">{description}</p>}
      {actionLabel && onAction && (
        <Button color="warning" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
