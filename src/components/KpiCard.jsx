import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

// Maps light-mode bg class → [dark bg class, light icon color, dark icon color]
const ICON_COLOR_MAP = {
  'bg-amber-100':  ['dark:bg-amber-900/30',  'text-amber-600',  'dark:text-amber-300'],
  'bg-blue-100':   ['dark:bg-blue-900/30',   'text-blue-600',   'dark:text-blue-300'],
  'bg-green-100':  ['dark:bg-green-900/30',  'text-green-600',  'dark:text-green-300'],
  'bg-orange-100': ['dark:bg-orange-900/30', 'text-orange-600', 'dark:text-orange-300'],
  'bg-purple-100': ['dark:bg-purple-900/30', 'text-purple-600', 'dark:text-purple-300'],
  'bg-violet-100': ['dark:bg-violet-900/30', 'text-violet-600', 'dark:text-violet-300'],
  'bg-red-100':    ['dark:bg-red-900/30',    'text-red-600',    'dark:text-red-300'],
  'bg-pink-100':   ['dark:bg-pink-900/30',   'text-pink-600',   'dark:text-pink-300'],
  'bg-teal-100':   ['dark:bg-teal-900/30',   'text-teal-600',   'dark:text-teal-300'],
  'bg-cyan-100':   ['dark:bg-cyan-900/30',   'text-cyan-600',   'dark:text-cyan-300'],
  'bg-indigo-100': ['dark:bg-indigo-900/30', 'text-indigo-600', 'dark:text-indigo-300'],
};

export default function KpiCard({
  title,
  value,
  icon: Icon,
  iconBg = 'bg-amber-100',
  trend,
  trendLabel,
  prefix = '',
  suffix = '',
}) {
  const [darkBg, iconLight, iconDark] = ICON_COLOR_MAP[iconBg] ?? [
    'dark:bg-gray-700/40', 'text-gray-600', 'dark:text-gray-300',
  ];

  return (
    <div className="kpi-card">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#d89245] via-[#f4c989] to-transparent opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6b51] dark:text-[var(--dark-muted)]">{title}</p>
        <p className="kpi-value">
          {prefix}
          {value}
          {suffix}
        </p>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {trend >= 0 ? (
              <HiTrendingUp className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <HiTrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
            {trendLabel && <span className="text-xs text-[#a0846d] dark:text-[var(--dark-muted)]">{trendLabel}</span>}
          </div>
        )}
      </div>
      {Icon && (
        <div className={`kpi-icon-box ${iconBg} ${darkBg} shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]`}>
          <Icon className={`w-5 h-5 ${iconLight} ${iconDark}`} />
        </div>
      )}
    </div>
  );
}
