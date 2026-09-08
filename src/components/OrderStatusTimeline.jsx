/**
 * OrderStatusTimeline
 *
 * Horizontal (stacked to vertical on mobile) stepped progress timeline.
 * Mirrors Shopee/Lazada-style order tracking with smooth CSS animations.
 *
 * Props:
 *   status        – order.status  (pending | approved | delivering | delivered | cancelled | rejected)
 *   paymentStatus – order.payment_status  (unpaid | paid | verified …)
 *   className     – optional extra wrapper class
 */

import React, { useMemo } from 'react';

const STEPS = [
  { key: 'placed',      label: 'Placed' },
  { key: 'approved',    label: 'Approved' },
  { key: 'paid',        label: 'Paid' },
  { key: 'preparing',   label: 'Preparing' },
  { key: 'in_transit',  label: 'In Transit' },
  { key: 'delivered',   label: 'Delivered' },
];

/**
 * Map backend status + paymentStatus to a step index (0-based).
 * Returns -1 for cancelled/rejected.
 */
function resolveActiveStep(status, paymentStatus) {
  const s = String(status || '').trim().toLowerCase();
  const p = String(paymentStatus || '').trim().toLowerCase();

  if (s === 'cancelled' || s === 'rejected') return -1;

  // Delivered = the whole journey is complete. Return one past the last step so
  // EVERY node (including "Delivered") renders as done/filled, with none left
  // pulsing as the "current" step.
  if (s === 'delivered') return STEPS.length;

  if (s === 'delivering' || s === 'out_for_delivery' || s === 'in_transit') return 4;

  // Paid but not yet delivering — "Preparing" step
  if (p === 'paid' || p === 'verified') return 3;

  if (s === 'approved') return 1;

  // default: pending
  return 0;
}

// Check icon SVG
function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-3.5 h-3.5">
      <path
        d="M3 8.5L6.5 12 13 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OrderStatusTimeline({ status, paymentStatus, className = '' }) {
  const activeStep = useMemo(
    () => resolveActiveStep(status, paymentStatus),
    [status, paymentStatus]
  );

  const isCancelled = activeStep === -1;
  const rawStatus = String(status || '').trim().toLowerCase();
  const isRejected = rawStatus === 'rejected';

  if (isCancelled) {
    return (
      <div className={`flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30 ${className}`}
        role="status"
        aria-label={isRejected ? 'Order rejected' : 'Order cancelled'}
      >
        {/* X circle */}
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-red-700 dark:text-red-400">
            {isRejected ? 'Order Rejected' : 'Order Cancelled'}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400">
            {isRejected
              ? 'This order was rejected. Reserved stock has been released.'
              : 'This order was cancelled. Reserved stock has been released.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}
      role="status"
      aria-label={`Order status: ${STEPS[activeStep]?.label || 'Unknown'}`}
    >
      {/* ── Desktop: horizontal ──────────────────────────────────────────── */}
      <ol className="hidden sm:flex items-start justify-between" aria-label="Order progress">
        {STEPS.map((step, idx) => {
          const isDone    = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isFuture  = idx > activeStep;
          const isLast    = idx === STEPS.length - 1;

          return (
            <li key={step.key} className="relative flex flex-1 flex-col items-center">
              {/* Connector line (left half → right half) */}
              {!isLast && (
                <div className="absolute left-1/2 top-[18px] h-0.5 w-full -translate-y-1/2">
                  {/* track background */}
                  <div className="absolute inset-0 bg-gray-200 dark:bg-[var(--dark-border)]" />
                  {/* filled portion — covers right-half of current connector */}
                  <div
                    className="absolute inset-0 bg-amber-400 transition-all duration-700 ease-in-out origin-left"
                    style={{ transform: isDone ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </div>
              )}

              {/* Step node */}
              <div className="relative z-10 flex flex-col items-center">
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500',
                    isDone
                      ? 'border-amber-400 bg-amber-400 text-white shadow-md shadow-amber-200'
                      : isCurrent
                        ? 'border-amber-400 bg-white text-amber-500 shadow-md shadow-amber-100 dark:bg-[var(--dark-card)]'
                        : 'border-gray-200 bg-gray-50 text-gray-300 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-muted)]',
                  ].join(' ')}
                >
                  {isDone ? (
                    <CheckIcon />
                  ) : isCurrent ? (
                    /* Pulsing dot for current step */
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-[var(--dark-border)]" />
                  )}
                </span>

                {/* Label */}
                <span
                  className={[
                    'mt-2 text-center text-[11px] font-semibold leading-tight transition-colors duration-300',
                    isDone    ? 'text-amber-500'  : '',
                    isCurrent ? 'text-amber-600'  : '',
                    isFuture  ? 'text-gray-300 dark:text-[var(--dark-muted)]' : '',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── Mobile: vertical ─────────────────────────────────────────────── */}
      <ol className="flex sm:hidden flex-col gap-0" aria-label="Order progress">
        {STEPS.map((step, idx) => {
          const isDone    = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isFuture  = idx > activeStep;
          const isLast    = idx === STEPS.length - 1;

          return (
            <li key={step.key} className="relative flex gap-3">
              {/* Vertical connector column */}
              <div className="flex flex-col items-center">
                {/* Node */}
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500',
                    isDone
                      ? 'border-amber-400 bg-amber-400 text-white'
                      : isCurrent
                        ? 'border-amber-400 bg-white text-amber-500 dark:bg-[var(--dark-card)]'
                        : 'border-gray-200 bg-gray-50 text-gray-300 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-muted)]',
                  ].join(' ')}
                >
                  {isDone ? (
                    <CheckIcon />
                  ) : isCurrent ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200 dark:bg-[var(--dark-border)]" />
                  )}
                </span>

                {/* Vertical line below node */}
                {!isLast && (
                  <div className="relative mt-0.5 w-0.5 flex-1" style={{ minHeight: '1.5rem' }}>
                    <div className="absolute inset-0 bg-gray-100 dark:bg-[var(--dark-border)]" />
                    <div
                      className="absolute inset-0 bg-amber-400 transition-all duration-700 ease-in-out origin-top"
                      style={{ transform: isDone ? 'scaleY(1)' : 'scaleY(0)' }}
                    />
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="pb-4 pt-0.5">
                <span
                  className={[
                    'text-sm font-semibold leading-tight transition-colors duration-300',
                    isDone    ? 'text-amber-500'  : '',
                    isCurrent ? 'text-amber-600'  : '',
                    isFuture  ? 'text-gray-300 dark:text-[var(--dark-muted)]' : '',
                  ].join(' ')}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    Current
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
