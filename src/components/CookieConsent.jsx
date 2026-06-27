import { useState, useEffect } from 'react';
import { FiShield, FiX } from 'react-icons/fi';

const STORAGE_KEY = 'nogatu_consent_v1';

/**
 * Site-wide privacy / cookie + location consent banner.
 * Shows once on first visit until the visitor makes a choice. The choice is
 * stored in localStorage. "location" consent gates the checkout live-GPS pin —
 * we never read precise coordinates before the visitor opts in, which keeps the
 * storefront compliant with data-privacy rules (RA 10173 in PH).
 */
export function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function hasLocationConsent() {
  const c = getConsent();
  return !!(c && c.location);
}

export default function CookieConsent() {
  const [choice, setChoice] = useState(() => getConsent());

  // Re-check on mount in case another tab set it.
  useEffect(() => {
    if (!choice) setChoice(getConsent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (value) => {
    const payload = { ...value, ts: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage blocked — banner just won't persist */
    }
    setChoice(payload);
  };

  if (choice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-orange-100/30 bg-[#23150b] p-4 text-orange-50 shadow-2xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300">
            <FiShield className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-orange-50">We value your privacy</p>
            <p className="mt-0.5 text-xs leading-relaxed text-orange-100/75">
              We use cookies to run the store and, with your permission, your delivery
              location to route orders accurately and show live tracking. Your
              coordinates are stored securely and never shared publicly. You can
              decline location and still order by typing your address.
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => save({ cookies: true, location: false })}
            className="rounded-xl border border-orange-100/25 px-4 py-2 text-xs font-semibold text-orange-100 transition hover:bg-white/10"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={() => save({ cookies: true, location: true })}
            className="rounded-xl bg-gradient-to-r from-[#f7a340] to-[#de7a26] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
          >
            Accept all
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => save({ cookies: true, location: false })}
            className="rounded-lg p-1.5 text-orange-100/60 transition hover:bg-white/10 hover:text-orange-100"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
