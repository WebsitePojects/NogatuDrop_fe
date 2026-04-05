import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

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
  return (
    <div className="kpi-card">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
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
            {trendLabel && <span className="text-xs text-gray-400">{trendLabel}</span>}
          </div>
        )}
      </div>
      {Icon && (
        <div className={`kpi-icon-box ${iconBg}`}>
          <Icon className="w-5 h-5 text-gray-700" />
        </div>
      )}
    </div>
  );
}
