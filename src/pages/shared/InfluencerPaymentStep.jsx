import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { FiCheck, FiCopy, FiUploadCloud, FiArrowRight, FiClock, FiMapPin, FiImage } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import { createCheckoutIntent, createIntentHeaders } from '@/utils/checkoutIntent';
import { formatCurrency } from '@/utils/formatCurrency';
import { extractUploadErrorMessage } from '@/utils/uploadError';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { CheckoutHeader, CheckoutFooter } from './InfluencerCheckoutChrome';

// How to send money, per provider. Wording follows each app's own menu names.
const HOW_TO_PAY = {
  GCASH: ['Open GCash and tap Send, then Express Send.', 'Enter the number below and the exact amount.', 'Screenshot the receipt and upload it here.'],
  BDO: ['Open BDO Online or the app and choose Send Money.', 'Send to the account below; use your order number as the reference.', 'Screenshot the confirmation and upload it here.'],
  PSBANK: ['Open PSBank Online and choose Fund Transfer.', 'Send to the account below; use your order number as the reference.', 'Screenshot the confirmation and upload it here.'],
};
const DEFAULT_HOW_TO_PAY = ['Send the exact amount to the account below.', 'Use your order number as the reference.', 'Upload a photo or screenshot of your receipt here.'];

function formatDeadline(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
}

function CopyButton({ value, label, copied, onCopy }) {
  return (
    <button type="button" className="ck-btn ck-btn-ghost ck-btn-sm shrink-0" onClick={() => onCopy(value, label)} aria-label={`Copy ${label}`}>
      {copied === label ? <><FiCheck aria-hidden="true" /> Copied</> : <><FiCopy aria-hidden="true" /> Copy</>}
    </button>
  );
}

/**
 * The page a buyer sees right after placing an order: what to pay, where, by when, and the receipt
 * upload. `order` is { number, payment, provider, quantity, deliverTo: { name, address, phone } }.
 */
export default function InfluencerPaymentStep({ slugLabel, product, order, fallbackTotal }) {
  const account = order.payment?.bank_account || null;
  const totalDue = order.payment?.total_amount ?? fallbackTotal;
  const deadline = formatDeadline(order.payment?.payment_deadline);
  const steps = HOW_TO_PAY[order.provider] || DEFAULT_HOW_TO_PAY;

  const [proofFile, setProofFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [proofSent, setProofSent] = useState(false);
  const [copied, setCopied] = useState('');
  const proofIntentRef = useRef(createCheckoutIntent());
  const uploading = useSubmitGuard();

  useEffect(() => {
    if (!proofFile || !proofFile.type.startsWith('image/')) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(proofFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
    } catch {
      setCopied('');
    }
  };

  const handleUploadProof = () => {
    if (proofSent) return;
    if (!proofFile) { setProofError('Choose your payment screenshot or photo first.'); return; }
    uploading.run(async () => {
      setProofError('');
      try {
        const formData = new FormData();
        formData.append('order_number', order.number);
        formData.append('customer_phone', order.deliverTo.phone);
        formData.append('proof', proofFile);
        await api.post(ORDERS.PUBLIC_PAYMENT_PROOF, formData, {
          headers: { 'Content-Type': 'multipart/form-data', ...createIntentHeaders(proofIntentRef.current) },
        });
        setProofSent(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setProofError(extractUploadErrorMessage(err));
      }
    });
  };

  const trackerState = (index) => {
    const current = proofSent ? 3 : 1;
    if (index < current) return 'done';
    return index === current ? 'current' : 'todo';
  };

  return (
    <div className={`ck ${proofSent ? '' : 'ck-has-bar'}`}>
      <CheckoutHeader slugLabel={slugLabel} />

      <main>
        <section className="ck-media" aria-labelledby="pay-title">
          <div className="ck-wrap max-w-3xl pb-16 pt-7 sm:pb-20 sm:pt-10">
            <div className="ck-rise flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--ck-champagne)] text-[var(--ck-night)]"><FiCheck aria-hidden="true" /></span>
              <p className="ck-label">{proofSent ? 'Payment proof received' : 'Order placed'}</p>
            </div>
            <h1 id="pay-title" className="ck-heading ck-rise ck-rise-2 mt-3 text-[length:var(--ck-text-hero)]">
              {proofSent ? 'Thank you! We are checking your payment.' : `Pay ${formatCurrency(totalDue)} to finish your order`}
            </h1>
            <div className="ck-rise ck-rise-3 mt-4 flex flex-wrap items-center gap-2 text-[length:var(--ck-text-small)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 font-mono font-semibold backdrop-blur">
                #{order.number}
                <button type="button" onClick={() => copy(order.number, 'order number')} className="text-[var(--ck-champagne)]" aria-label="Copy order number">
                  {copied === 'order number' ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                </button>
              </span>
              {deadline && !proofSent && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                  <FiClock aria-hidden="true" /> Pay by {deadline}
                </span>
              )}
            </div>
            <ol className="ck-track mt-8" aria-label="Order progress">
              {['Placed', 'Pay', 'Upload proof', 'Confirmed'].map((label, i) => (
                <li key={label} data-state={trackerState(i)} aria-current={trackerState(i) === 'current' ? 'step' : undefined}>
                  <span className="ck-track-dot">{trackerState(i) === 'done' ? <FiCheck aria-hidden="true" /> : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="ck-wrap max-w-3xl">
          <div className="ck-sheet -mt-10 p-5 sm:p-7">
            {proofSent ? (
              <div role="status">
                <h2 className="ck-heading text-[length:var(--ck-text-title)]">What happens next</h2>
                <ol className="mt-4 space-y-3 text-[length:var(--ck-text-small)]">
                  <li className="flex gap-3"><span className="ck-step-badge shrink-0">1</span><span>We match your receipt with the payment to our {account?.bank_name || 'account'}.</span></li>
                  <li className="flex gap-3"><span className="ck-step-badge shrink-0">2</span><span>Your order is packed at our fulfillment center and handed to the courier.</span></li>
                  <li className="flex gap-3"><span className="ck-step-badge shrink-0">3</span><span>Follow it any time with your order number.</span></li>
                </ol>
                <Link to={`/track/${order.number}`} className="ck-btn ck-btn-primary mt-6 w-full sm:w-auto">Track my order <FiArrowRight aria-hidden="true" /></Link>
              </div>
            ) : (
              <>
                <h2 className="ck-heading text-[length:var(--ck-text-title)]">Send your payment</h2>
                {account ? (
                  <div className="ck-slip mt-4">
                    <div className="ck-slip-row">
                      <div className="min-w-0">
                        <p className="ck-label">Pay to · {account.bank_name}</p>
                        <p className="mt-1 font-semibold">{account.account_name}</p>
                      </div>
                    </div>
                    <div className="ck-slip-row">
                      <div className="min-w-0">
                        <p className="text-[length:var(--ck-text-small)] ck-muted">Account / mobile number</p>
                        <p className="ck-slip-value font-mono text-lg">{account.account_number}</p>
                      </div>
                      <CopyButton value={account.account_number} label="account number" copied={copied} onCopy={copy} />
                    </div>
                    <div className="ck-slip-row">
                      <div className="min-w-0">
                        <p className="text-[length:var(--ck-text-small)] ck-muted">Exact amount</p>
                        <p className="ck-slip-value ck-price text-xl">{formatCurrency(totalDue)}</p>
                      </div>
                      <CopyButton value={Number(totalDue).toFixed(2)} label="amount" copied={copied} onCopy={copy} />
                    </div>
                  </div>
                ) : (
                  <p className="ck-alert ck-alert-note mt-4">Our team will confirm the payment account. Keep your order number.</p>
                )}

                <ol className="mt-5 space-y-2.5 text-[length:var(--ck-text-small)]">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-3"><span className="ck-step-badge shrink-0">{i + 1}</span><span className="pt-0.5">{step}</span></li>
                  ))}
                </ol>

                <h2 id="proof-title" className="ck-heading mt-8 text-[length:var(--ck-text-title)]">Upload your receipt</h2>
                <label className="ck-drop mt-3" htmlFor="ck-proof">
                  {previewUrl
                    ? <img src={previewUrl} alt="Chosen receipt" className="ck-drop-preview" />
                    : <span className="ck-drop-preview grid place-items-center text-xl text-[var(--ck-accent-ink)]">{proofFile ? <FiImage aria-hidden="true" /> : <FiUploadCloud aria-hidden="true" />}</span>}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{proofFile ? proofFile.name : 'Tap to choose a screenshot or photo'}</span>
                    <span className="block text-[length:var(--ck-text-small)] ck-muted">{proofFile ? 'Tap to change' : 'JPG, PNG, HEIC or PDF'}</span>
                  </span>
                  <input
                    id="ck-proof"
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    disabled={uploading.submitting}
                    onChange={(e) => { setProofFile(e.target.files?.[0] || null); setProofError(''); }}
                  />
                </label>
                {proofError && <p className="ck-alert ck-alert-error mt-3" role="alert">{proofError}</p>}
                <div className="mt-5 hidden gap-3 lg:flex">
                  <button type="button" className="ck-btn ck-btn-primary" onClick={handleUploadProof} disabled={uploading.submitting || !proofFile}>
                    {uploading.submitting ? <><Spinner size="sm" light /> Uploading…</> : 'Submit payment proof'}
                  </button>
                  <Link to={`/track/${order.number}`} className="ck-btn ck-btn-ghost">Track my order <FiArrowRight aria-hidden="true" /></Link>
                </div>
              </>
            )}
          </div>

          <section className="py-8" aria-labelledby="order-summary-title">
            <h2 id="order-summary-title" className="ck-label">Your order</h2>
            <div className="mt-3 flex items-center gap-4 border-b ck-hairline pb-4">
              <span className="ck-product-thumb h-16 w-16 shrink-0">
                <img src={getProductImageSrc(product)} alt="" onError={(e) => attachProductImageFallback(e, product)} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{product.name}</p>
                <p className="text-[length:var(--ck-text-small)] ck-muted">{order.quantity} {order.quantity === 1 ? 'box' : 'boxes'} · VAT, system fee and shipping included</p>
              </div>
              <p className="ck-price">{formatCurrency(totalDue)}</p>
            </div>
            <div className="mt-4 flex gap-3 text-[length:var(--ck-text-small)]">
              <FiMapPin className="mt-1 shrink-0 text-[var(--ck-accent-ink)]" aria-hidden="true" />
              <div>
                <p className="font-semibold">{order.deliverTo.name} · {order.deliverTo.phone}</p>
                <p className="ck-muted">{order.deliverTo.address}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {!proofSent && (
        <div className="ck-mobile-bar" role="region" aria-label="Payment proof">
          <Link to={`/track/${order.number}`} className="text-[length:var(--ck-text-small)] font-semibold underline">Track order</Link>
          <button type="button" className="ck-btn ck-btn-primary shrink-0" onClick={handleUploadProof} disabled={uploading.submitting || !proofFile}>
            {uploading.submitting ? <><Spinner size="sm" light /> Uploading…</> : 'Submit payment proof'}
          </button>
        </div>
      )}

      <CheckoutFooter />
    </div>
  );
}
