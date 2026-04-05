import { Button } from 'flowbite-react';

export default function PageHeader({ title, subtitle, actions = [], children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 ${className}`}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {(actions.length > 0 || children) && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, i) => (
            <Button
              key={i}
              color={action.color || 'warning'}
              size="sm"
              onClick={action.onClick}
              outline={action.variant === 'outline'}
            >
              {action.icon && <span className="mr-1.5">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
