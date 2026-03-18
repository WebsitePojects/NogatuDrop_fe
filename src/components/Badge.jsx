import React from 'react';

const Badge = ({ bg, text, label, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text} ${className}`}
    >
      {label}
    </span>
  );
};

export default Badge;
