import { useEffect, useRef, useState } from 'react';
import { Spinner } from 'flowbite-react';
import { FiLock, FiCopy, FiCheck, FiUploadCloud, FiImage, FiClock } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS, TRACKING } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { createCheckoutIntent, createIntentHeaders } from '@/utils/checkoutIntent';
import { extractUploadErrorMessage } from '@/utils/uploadError';
import useSubmitGuard from '@/hooks/useSubmitGuard';

/**
 * Payment part of the public tracking page. The amount and the account to pay stay hidden until the
 * buyer enters the phone number used at checkout (management decision 2026-10-05); the server checks it
 * (POST /tracking/public/:orderNumber/payment-details). The same phone then authorises the receipt upload.
 * When staff raised the delivery fee after the buyer paid (`extraPaymentDue`), the panel opens again for the
 * difference and a second receipt (management, 2026-10-08).
 */
export default function TrackingPaymentPanel({ orderNumber, proofUploadedAt, extraPaymentDue = false, onProofUploaded }) {
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [proofSent, setProofSent] = useState(false);
  const proofIntentRef = useRef(createCheckoutIntent());
  const unlocking = useSubmitGuard();
  const uploading = useSubmitGuard();

  // A different order on the same page starts locked again.
  useEffect(() => {
    setDetails(null);
    setPhone('');
    setError('');
    setProofFile(null);
    setProofSent(false);
    proofIntentRef.current = createCheckoutIntent();
  }, [orderNumber]);

  useEffect(() => {
    if (!proofFile || !proofFile.type.startsWith('image/')) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(proofFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const unlock = (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Enter the mobile number you used when you ordered.'); return; }
    unlocking.run(async () => {
      try {
        const { data } = await api.post(TRACKING.PUBLIC_PAYMENT_DETAILS(orderNumber), { customer_phone: phone.trim() });
        setDetails(data.data);
      } catch (err) {
        setError(err?.response?.status === 404
          ? 'That mobile number does not match this order. Use the number you entered at checkout.'
          : err?.response?.data?.message || 'We could not load your payment details. Please try again.');
      }
    });
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
    } catch {
      setCopied('');
    }
  };

  const uploadProof = () => {
    if (proofSent) return;
    if (!proofFile) { setError('Choose your payment screenshot or photo first.'); return; }
    uploading.run(async () => {
      setError('');
      try {
        const formData = new FormData();
        formData.append('order_number', orderNumber);
        formData.append('customer_phone', phone.trim());
        formData.append('proof', proofFile);
        await api.post(ORDERS.PUBLIC_PAYMENT_PROOF, formData, {
          headers: { 'Content-Type': 'multipart/form-data', ...createIntentHeaders(proofIntentRef.current) },
        });
        setProofSent(true);
        setProofFile(null);
        onProofUploaded?.();
      } catch (err) {
        setError(extractUploadErrorMessage(err));
      }
    });
  };

  const receiptReceived = proofSent || (Boolean(proofUploadedAt) && !extraPaymentDue);
  const owed = Number(details?.amount_still_owed || 0);
  const isExtra = owed > 0;

  if (!details) {
    return (
      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm" aria-labelledby="pay-lock-title">
        <h2 id="pay-lock-title" className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <FiLock aria-hidden="true" /> Payment details
        </h2>
        <p className="mt-1 text-sm text-amber-900/80">
          {receiptReceived
            ? 'We received your receipt and are checking your payment.'
            : extraPaymentDue
              ? 'Your delivery fee was updated. Enter the mobile number you used when you ordered to see the extra amount and send a second receipt.'
              : 'To see the amount and where to pay, enter the mobile number you used when you ordered.'}
        </p>
        {!receiptReceived && (
          <form onSubmit={unlock} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="payPhone" className="sr-only">Mobile number used at checkout</label>
            <input
              id="payPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none sm:flex-1"
            />
            <button
              type="submit"
              disabled={unlocking.submitting}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:bg-gray-200 disabled:text-gray-600"
            >
              {unlocking.submitting ? <><Spinner size="sm" light /> Checking…</> : 'Show payment details'}
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
      </section>
    );
  }

  const account = details.bank_account;
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-[1.05fr_0.95fr]" aria-label="Payment">
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-amber-900">Payment instructions</h2>
        {!details.payment_due ? (
          <p className="text-sm text-amber-900">
            {details.payment_status === 'paid' ? 'Your payment is confirmed. Thank you!' : 'This order no longer needs payment.'}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-amber-800">{isExtra ? 'Extra amount due' : 'Amount due'}</p>
                <p className="text-2xl font-extrabold text-amber-950">{formatCurrency(isExtra ? owed : details.total_amount || 0)}</p>
                {isExtra ? (
                  <p className="mt-1 text-xs text-amber-900">
                    The delivery fee was updated, so the new total is {formatCurrency(details.total_amount)}. Please send the difference.
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => copy((isExtra ? owed : Number(details.total_amount)).toFixed(2), 'amount')} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900">
                {copied === 'amount' ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />} Copy
              </button>
            </div>
            {details.payment_deadline && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <FiClock aria-hidden="true" /> Pay by {formatDate(details.payment_deadline, true)}, or the order is cancelled.
              </p>
            )}
            {account && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{account.bank_name}</p>
                  <p className="text-gray-700">{account.account_name}</p>
                  <p className="mt-1 break-all font-mono text-base font-bold text-gray-900">{account.account_number}</p>
                </div>
                <button type="button" onClick={() => copy(account.account_number, 'number')} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800">
                  {copied === 'number' ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />} Copy
                </button>
              </div>
            )}
            <p className="text-xs text-amber-900">
              Use <span className="font-mono font-semibold">#{orderNumber}</span> as the payment reference when you can.
            </p>
          </div>
        )}
      </div>

      {details.payment_due && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-900">{isExtra ? 'Upload the receipt for the extra amount' : 'Upload your receipt'}</h2>
          {receiptReceived ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800" role="status">
              Receipt received{proofUploadedAt ? ` on ${formatDate(proofUploadedAt, true)}` : ''}. We will confirm your payment shortly.
            </p>
          ) : (
            <div className="space-y-3">
              <label htmlFor="proofFile" className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-amber-200 p-3 transition hover:border-amber-400">
                {previewUrl
                  ? <img src={previewUrl} alt="Chosen receipt" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-amber-50 text-xl text-amber-700">{proofFile ? <FiImage aria-hidden="true" /> : <FiUploadCloud aria-hidden="true" />}</span>}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{proofFile ? proofFile.name : 'Tap to choose a screenshot or photo'}</span>
                  <span className="block text-xs text-gray-600">{proofFile ? 'Tap to change' : 'JPG, PNG, HEIC or PDF'}</span>
                </span>
                <input
                  id="proofFile"
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  disabled={uploading.submitting}
                  onChange={(e) => { setProofFile(e.target.files?.[0] || null); setError(''); }}
                />
              </label>
              <button
                type="button"
                onClick={uploadProof}
                disabled={uploading.submitting || !proofFile}
                className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:bg-gray-200 disabled:text-gray-600"
              >
                {uploading.submitting ? <><Spinner size="sm" light /> Uploading…</> : 'Submit payment proof'}
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
