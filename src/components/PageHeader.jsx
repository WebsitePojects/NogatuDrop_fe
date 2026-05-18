export default function PageHeader({ title, subtitle, actions = [], children, className = '' }) {
  return (
    <div className={`page-header-shell mb-6 flex flex-col justify-between gap-4 rounded-[1.8rem] border border-white/60 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end ${className}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b56d1e] dark:text-orange-300/80">Nogatu Workspace</p>
        <h1 className="font-heading mt-2 text-[2rem] leading-[1.05] text-[#2b170a] dark:text-[var(--dark-text)]">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7b5a43] dark:text-[var(--dark-muted)]">{subtitle}</p> : null}
      </div>
      {(actions.length > 0 || children) && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              className={[
                'brand-btn',
                action.color === 'success'
                  ? 'bg-emerald-600 text-white shadow-[0_18px_34px_-22px_rgba(5,150,105,0.55)]'
                  : action.variant === 'outline' || action.color === 'light'
                    ? 'brand-btn--secondary'
                    : 'brand-btn--primary',
              ].join(' ')}
            >
              {action.icon && <span className="mr-1.5">{action.icon}</span>}
              {action.label}
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
