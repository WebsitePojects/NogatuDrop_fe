import React from 'react';

const StatusProgressBar = ({
  value = 0,
  max = 100,
  label,
  showPercentage = true,
  color = 'bg-main-active',
  height = 'h-2.5',
  className = '',
}) => {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  const barColor =
    percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : color;

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-600">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-semibold text-gray-700">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${barColor} ${height} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default StatusProgressBar;
