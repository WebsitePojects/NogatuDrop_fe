import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiAlertTriangle, FiUpload, FiCreditCard, FiX } from 'react-icons/fi';

/**
 * PaymentCountdownTimer
 * Shows countdown to payment deadline + bank details + upload button.
 *
 * Props:
 *   deadline        — ISO string or Date of payment deadline
 *   bankAccount     — { bank_name, account_name, account_number } | null
 *   onUpload        — function(file) called when user confirms the selected proof file
 *   uploading       — boolean
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
  const [previewFile, setPreviewFile] = useState(null); // { file, objectUrl }
  const inputRef = useRef(null);

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

  // Revoke object URL on cleanup to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) {
        URL.revokeObjectURL(previewFile.objectUrl);
      }
    };
  }, [previewFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Revoke previous preview URL.
    if (previewFile?.objectUrl) {
      URL.revokeObjectURL(previewFile.objectUrl);
    }
    const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreviewFile({ file, objectUrl });
    // Reset input value so the same file can be re-selected after clearing.
    e.target.value = '';
  };

  const handleClearPreview = () => {
    if (previewFile?.objectUrl) {
      URL.revokeObjectURL(previewFile.objectUrl);
    }
    setPreviewFile(null);
  };

  const handleConfirmUpload = () => {
    if (!previewFile?.file) return;
    onUpload(previewFile.file);
    setPreviewFile(null);
  };

  const isUrgent = timeLeft && timeLeft.totalMs < 2 * 3_600_000; // < 2h

  // amber-500/600 and red-500 fail 4.5:1 against white button text (same finding
  // documented in src/theme/flowbiteTheme.js for the shared <Button> component) —
  // 700 is the lightest shade of each that clears AA, so both action buttons below
  // share this one class instead of repeating the failing shade twice.
  const actionButtonClass = isUrgent
    ? 'bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700'
    : 'bg-amber-700 hover:bg-amber-800';

  if (expired) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
          <FiAlertTriangle size={16} />
          Payment deadline has passed — this order may be cancelled.
        </div>
      </div>
    );
  }

  if (paymentProofUrl) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
          ✓ Payment proof uploaded — awaiting verification
        </div>
        {/* Inline image preview so the stockist can confirm their upload looks correct */}
        <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="block">
          <img
            src={paymentProofUrl}
            alt="Uploaded payment proof"
            className="w-full max-h-56 object-contain rounded-lg border border-emerald-100 bg-white cursor-zoom-in"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </a>
        <a href={paymentProofUrl} target="_blank" rel="noreferrer"
          className="inline-block text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
          Open full image ↗
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isUrgent ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30'}`}>
      {/* Countdown */}
      <div className="flex items-center gap-2">
        <FiClock size={16} className={isUrgent ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
        <span className={`text-sm font-semibold ${isUrgent ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          Payment due in:
        </span>
        <span className={`font-mono text-lg font-bold tabular-nums ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {timeLeft ? `${String(timeLeft.h).padStart(2, '0')}:${String(timeLeft.m).padStart(2, '0')}:${String(timeLeft.s).padStart(2, '0')}` : '—'}
        </span>
      </div>

      {/* Bank details */}
      {bankAccount && (
        <div className="bg-white/60 rounded-lg p-3 text-sm dark:bg-black/20">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-[var(--dark-muted)] text-xs font-medium mb-2">
            <FiCreditCard size={13} />
            PAYMENT DETAILS
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[var(--dark-muted)]">Bank</span>
              <span className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{bankAccount.bank_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[var(--dark-muted)]">Account Name</span>
              <span className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{bankAccount.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[var(--dark-muted)]">Account Number</span>
              <span className="font-mono font-bold text-gray-900 dark:text-[var(--dark-text)]">{bankAccount.account_number}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview area: shown after a file is selected, before uploading */}
      {previewFile && !uploading && (
        <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-3 dark:border-amber-900/40 dark:bg-[var(--dark-card2)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Selected file</p>
            <button
              type="button"
              onClick={handleClearPreview}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded dark:text-[var(--dark-muted)] dark:hover:text-[var(--dark-text)]"
              title="Remove selected file"
            >
              <FiX size={14} />
            </button>
          </div>
          {previewFile.objectUrl ? (
            <img
              src={previewFile.objectUrl}
              alt="Payment proof preview"
              className="w-full max-h-48 object-contain rounded border border-gray-100 dark:border-[var(--dark-border)]"
            />
          ) : (
            <p className="text-xs text-gray-500 italic dark:text-[var(--dark-muted)]">{previewFile.file.name}</p>
          )}
          <button
            type="button"
            onClick={handleConfirmUpload}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${actionButtonClass}`}
          >
            <FiUpload size={15} />
            Confirm & Upload
          </button>
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-500 dark:text-[var(--dark-muted)]">
          <svg className="animate-spin h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Uploading…
        </div>
      )}

      {/* File-select button — always visible unless uploading */}
      {!uploading && (
        <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors ${actionButtonClass}`}>
          <FiUpload size={15} />
          {previewFile ? 'Choose a different image' : 'Choose Payment Proof Image'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};

export default PaymentCountdownTimer;
