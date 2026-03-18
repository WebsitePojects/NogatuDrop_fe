import React from 'react';

const KpiCard = ({ title, value, icon: Icon, color = 'bg-white', textColor = 'text-gray-800', subtitle }) => {
  return (
    <div className={`${color} rounded-xl shadow-md p-5 flex items-center gap-4 border border-gray-100`}>
      {Icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
          <Icon className="text-2xl text-main-active" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className={`text-2xl font-bold ${textColor} mt-1`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
