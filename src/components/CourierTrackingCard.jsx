import { useState } from 'react';
import { HiOutlineExternalLink, HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineTruck } from 'react-icons/hi';

/**
 * Buyer's tracking page, for an order shipped through a courier (J&T, LBC, Flash): the waybill with a
 * copy button and, when the courier has a tracking link, "Track with <courier>". Our page does not show
 * the courier's own status; the buyer follows it on the courier's site.
 */
export default function CourierTrackingCard({ courier, waybill, url }) {
  const [copied, setCopied] = useState(false);
  if (!waybill) return null;
  const name = courier || 'the courier';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(waybill);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="courier-tracking-title" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <HiOutlineTruck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="courier-tracking-title" className="text-sm font-bold text-gray-900">Shipped with {name}</h2>
          <p className="mt-1 text-xs text-gray-600">Waybill number</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-semibold text-gray-900 [overflow-wrap:anywhere]">{waybill}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-gray-300 px-3 text-xs font-semibold text-gray-800"
            >
              {copied ? <HiOutlineCheck className="h-4 w-4" /> : <HiOutlineClipboardCopy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 sm:w-auto"
            >
              Track with {name} <HiOutlineExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
          <p className="mt-2 text-xs text-gray-600">
            The courier&apos;s page shows where your parcel is. If it asks, paste the waybill number.
          </p>
        </div>
      </div>
    </section>
  );
}
