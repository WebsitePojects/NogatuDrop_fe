import React, { useState, useEffect } from 'react';
import { FiClock, FiAlertTriangle, FiUpload, FiCreditCard } from 'react-icons/fi';

/**
 * PaymentCountdownTimer
 * Shows countdown to payment deadline + bank details + upload button.
 *
 * Props:
 *   deadline       — ISO string or Date of payment deadline
 *   bankAccount    — { bank_name, account_name, account_number } | null
 *   onUpload       — function(file) called when user selects a proof file
 *   uploading      — boolean
 *   paymentProofUrl — string | null (if already uploaded)
 */
const PaymentCountdownTimer = ({
  deadline,
  bankAccount,
  onUpload,
  uploading = false,
  paymentProofUrl,
}) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft(null);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft({ h, m, s, totalMs: diff });
    };

    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const isUrgent = timeLeft && timeLeft.totalMs < 2 * 3_600_000; // < 2h

  if (expired) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
          <FiAlertTriangle size={16} />
          Payment deadline has passed — this order may be cancelled.
        </div>
      </div>
    );
  }

  if (paymentProofUrl) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-2">
          ✓ Payment proof uploaded — awaiting verification
        </div>
        <a href={paymentProofUrl} target="_blank" rel="noreferrer"
          className="text-xs text-emerald-600 hover:underline">
          View uploaded proof
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${isUrgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      {/* Countdown */}
      <div className="flex items-center gap-2 mb-3">
        <FiClock size={16} className={isUrgent ? 'text-red-500' : 'text-amber-600'} />
        <span className={`text-sm font-semibold ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
          Payment due in:
        </span>
        <span className={`font-mono text-lg font-bold tabular-nums ${isUrgent ? 'text-red-600 countdown-urgent' : 'text-amber-600'}`}>
          {timeLeft ? `${String(timeLeft.h).padStart(2, '0')}:${String(timeLeft.m).padStart(2, '0')}:${String(timeLeft.s).padStart(2, '0')}` : '—'}
        </span>
      </div>

      {/* Bank details */}
      {bankAccount && (
        <div className="bg-white/60 rounded-lg p-3 mb-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium mb-2">
            <FiCreditCard size={13} />
            PAYMENT DETAILS
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Bank</span>
              <span className="font-semibold text-gray-900">{bankAccount.bank_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Name</span>
              <span className="font-semibold text-gray-900">{bankAccount.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Number</span>
              <span className="font-mono font-bold text-gray-900">{bankAccount.account_number}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload button */}
      <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
        uploading ? 'bg-gray-200 text-gray-400' : isUrgent
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-amber-500 text-white hover:bg-amber-600'
      }`}>
        <FiUpload size={15} />
        {uploading ? 'Uploading…' : 'Upload Payment Proof'}
        {!uploading && (
          <input type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
            disabled={uploading} />
        )}
      </label>
    </div>
  );
};

export default PaymentCountdownTimer;
