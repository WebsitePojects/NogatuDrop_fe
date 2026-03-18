import React from 'react';
import { ROLE_SLUGS } from '@/utils/constants';

const WelcomePopup = ({ isOpen, user, onProceed }) => {
  if (!isOpen || !user) return null;

  const isSuperAdmin = user.role_slug === ROLE_SLUGS.SUPER_ADMIN;

  // Super admin: warm amber/gold background. Partner: light green background.
  const bgColor = isSuperAdmin ? '#FFCC66' : '#AAFFAA';
  const greeting = isSuperAdmin ? 'WELCOME, USER!' : 'WELCOME, PARTNER!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative rounded-3xl shadow-2xl max-w-lg w-full mx-4 px-12 py-14 text-center z-10"
        style={{ background: bgColor }}
      >
        <h2 className="text-4xl font-black mb-3" style={{ color: '#1a1a1a' }}>
          {greeting}
        </h2>
        <p className="text-base text-gray-700 mb-10">Be productive today.</p>
        <button
          onClick={onProceed}
          className="px-12 py-3 text-white font-bold text-sm rounded-xl tracking-widest uppercase transition-all hover:brightness-110 shadow-md"
          style={{ background: '#FF8C00' }}
        >
          PROCEED
        </button>
      </div>
    </div>
  );
};

export default WelcomePopup;
