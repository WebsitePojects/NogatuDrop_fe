import React from 'react';

const PageHeader = ({ title, subtitle, actions, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
};

export default PageHeader;
