import React from 'react';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

const PageHeader = ({ title, subtitle, actions, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 ${className}`}>
      <div className="flex items-start gap-3">
        <img
          src={BRAND_LOGO}
          alt="Nogatu logo"
          className="w-12 h-12 rounded-xl object-cover border-2 border-amber-200 shadow-[0_0_0_3px_rgba(255,140,0,0.14)]"
        />
        <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
};

export default PageHeader;
