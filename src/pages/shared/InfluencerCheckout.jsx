import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { FiMinus, FiPlus, FiLock, FiTruck, FiShield, FiCheck, FiCopy, FiUploadCloud, FiArrowRight } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS, PRODUCTS } from '@/services/endpoints';
import { createCheckoutIntent, createIntentHeaders, getCheckoutIntent } from '@/utils/checkoutIntent';
import { formatCurrency } from '@/utils/formatCurrency';
import { getPublicCatalogPrice } from '@/utils/publicCatalogPrice';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';
import { getPublicOrderPricingTotals } from '@/utils/publicCheckoutPricing';
import { extractUploadErrorMessage } from '@/utils/uploadError';
import { NOGATU_PRODUCT_CATALOG } from '@/utils/nogatuCatalog';
import { maxOrderableQuantity, clampQuantity } from '@/utils/publicOrderLimits';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import LocationPicker from '@/components/LocationPicker';
import { normalizePaymentProviders } from './paymentProviders.js';
import './influencerCheckout.css';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';
const EMPTY_CUSTOMER = { name: '', phone: '', email: '', address: '' };
const REQUIRED_FIELDS = ['name', 'phone', 'address'];

const PAYMENT_STEPS = [
  { title: 'Pay', detail: 'Send the total to the account we show after you place the order.' },
  { title: 'Upload proof', detail: 'Attach a screenshot or photo of your receipt.' },
  { title: 'We confirm', detail: 'We check your payment and prepare your order.' },
];

function productDescription(product) {
  const entry = NOGATU_PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === String(product?.name || '').toLowerCase());
  return entry?.shortDescription || 'Official Nogatu product, shipped from a Nogatu fulfillment center.';
}

// Hoisted to module scope so inputs keep focus between keystrokes.
function Field({ id, label, required, children, hint }) {
  return (
    <div className="ck-field">
      <label htmlFor={id} className="ck-label">{label}{required && <span aria-hidden="true"> *</span>}</label>
      {children}
      {hint && <p className="mt-1.5 text-[length:var(--ck-text-small)] ck-muted">{hint}</p>}
    </div>
  );
}

function QuantityStepper({ value, max, onChange, disabled, idPrefix }) {
  return (
    <div className="ck-stepper" role="group" aria-label="Quantity">
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity">
        <FiMinus aria-hidden="true" />
      </button>
      <input
        id={`${idPrefix}-qty`}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Quantity"
      />
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}

function PaymentChoices({ options, selected, onSelect, disabled, loadError, onRetry }) {
  if (loadError) {
    return (
      <div className="ck-alert ck-alert-error" role="alert">
        {loadError} <button type="button" onClick={onRetry} className="ml-1 font-semibold underline">Try again</button>
      </div>
    );
  }
  if (options.length === 0) {
    return <p className="ck-muted">Payment accounts are not available right now. Please check back shortly.</p>;
  }
  return (
    <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-3">
      <legend className="sr-only">Pay with</legend>
      {options.map((option) => {
        const isSelected = option.provider === selected;
        return (
          <label key={option.provider} className="ck-pay" data-selected={isSelected}>
            <input
              type="radio"
              name="paymentProvider"
              value={option.provider}
              checked={isSelected}
              onChange={() => onSelect(option.provider)}
            />
            <span className="font-semibold">{option.provider}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function SummaryLines({ totals }) {
  return (
    <dl className="space-y-2.5 text-[length:var(--ck-text-small)]">
      <div className="flex justify-between"><dt className="ck-muted">Subtotal</dt><dd className="font-medium">{formatCurrency(totals.merchandiseSubtotal)}</dd></div>
      <div className="flex justify-between"><dt className="ck-muted">VAT &amp; system fee (12%)</dt><dd className="font-medium">{formatCurrency(totals.systemFee)}</dd></div>
      <div className="flex justify-between"><dt className="ck-muted">Shipping</dt><dd className="font-medium">{formatCurrency(totals.shippingFee)}</dd></div>
    </dl>
  );
}

function CheckoutHeader({ slugLabel }) {
  return (
    <header className="ck-header">
      <div className="ck-wrap flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="Nogatu home">
          <img src={BRAND_LOGO} alt="" className="h-9 w-9 rounded-full" />
          <span className="leading-tight">
            <span className="ck-display block text-xl">Nogatu</span>
            <span className="ck-label hidden text-[0.6rem] sm:block">Official store · {slugLabel}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-[length:var(--ck-text-small)]">
          <Link to="/track" className="whitespace-nowrap font-medium hover:underline">Track order</Link>
          <span className="hidden items-center gap-1.5 ck-muted sm:inline-flex"><FiLock aria-hidden="true" /> Secure checkout</span>
        </nav>
      </div>
    </header>
  );
}

function CheckoutFooter() {
  return (
    <footer className="ck-footer">
      <div className="ck-wrap flex flex-col gap-3 py-10 text-[length:var(--ck-text-small)] sm:flex-row sm:items-center sm:justify-between">
        <p><span className="ck-display text-lg text-white">Nogatu</span> · Shipped from our fulfillment centers in Caloocan and Pasig.</p>
        <p><Link to="/track">Track an order</Link></p>
      </div>
    </footer>
  );
}

/**
 * Checkout for an influencer link such as /kawoodee: one product, the buyer picks the quantity
 * (1 to the public cap, never more than is in stock), then pays by bank transfer or e-wallet and
 * uploads proof. Orders go to POST /orders/public/influencer/:slug, which re-validates the product,
 * the quantity and the price on the server and attributes the sale to the link.
 */
export default function InfluencerCheckout({ influencer }) {
  const { slug, product } = influencer;
  const slugLabel = String(slug || '').toUpperCase();
  const unitPrice = getPublicCatalogPrice(product);
  const productImage = getProductImageSrc(product);

  const [availableQty, setAvailableQty] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [touched, setTouched] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [paymentProviders, setPaymentProviders] = useState([]);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentOptionsError, setPaymentOptionsError] = useState('');
  const [formError, setFormError] = useState('');
  const [order, setOrder] = useState(null); // { number, payment } once placed
  const [proofFile, setProofFile] = useState(null);
  const [proofMessage, setProofMessage] = useState('');
  const [proofError, setProofError] = useState('');
  const [copied, setCopied] = useState('');

  const checkoutIntentRef = useRef(createCheckoutIntent());
  const proofIntentRef = useRef(createCheckoutIntent());
  const placing = useSubmitGuard();
  const uploading = useSubmitGuard();

  const maxQty = maxOrderableQuantity(availableQty);
  const soldOut = availableQty !== null && maxQty === 0;
  const totals = useMemo(() => getPublicOrderPricingTotals(unitPrice * quantity), [unitPrice, quantity]);

  useEffect(() => {
    let active = true;
    api.get(PRODUCTS.PUBLIC, { params: { limit: 100 } })
      .then(({ data }) => {
        const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        const match = list.find((p) => Number(p.id) === Number(product.id));
        if (active && match && match.available_qty !== undefined) setAvailableQty(Number(match.available_qty));
      })
      .catch(() => { /* the server still checks stock when the order is placed */ });
    return () => { active = false; };
  }, [product.id]);

  useEffect(() => {
    if (availableQty !== null) setQuantity((q) => clampQuantity(q, maxOrderableQuantity(availableQty)));
  }, [availableQty]);

  const loadPaymentOptions = useCallback(() => {
    setPaymentOptionsError('');
    return api.get(ORDERS.PUBLIC_PAYMENT_OPTIONS)
      .then(({ data }) => {
        const providers = normalizePaymentProviders(data.data?.providers);
        setPaymentProviders(providers);
        setPaymentProvider((current) => (providers.some((o) => o.provider === current) ? current : providers[0]?.provider || ''));
      })
      .catch((err) => {
        setPaymentProviders([]);
        setPaymentOptionsError(err?.response?.data?.message || 'We could not load payment options.');
      });
  }, []);

  useEffect(() => { loadPaymentOptions(); }, [loadPaymentOptions]);

  const setQty = (value) => setQuantity(clampQuantity(value, maxQty));
  const setField = (key) => (e) => setCustomer((c) => ({ ...c, [key]: e.target.value }));
  const fieldInvalid = (key) => touched && REQUIRED_FIELDS.includes(key) && !customer[key].trim();

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setTouched(true);
    setFormError('');
    if (REQUIRED_FIELDS.some((key) => !customer[key].trim())) {
      setFormError('Please fill in your name, mobile number and delivery address.');
      return;
    }
    if (!paymentProvider) { setFormError('Please choose how you will pay.'); return; }
    if (soldOut || quantity < 1) { setFormError('This product is out of stock right now.'); return; }

    placing.run(async () => {
      const payload = {
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_email: customer.email.trim() || undefined,
        customer_address: customer.address.trim(),
        customer_lat: pinnedLocation?.lat ?? null,
        customer_lng: pinnedLocation?.lng ?? null,
        payment_method: 'bank_transfer',
        payment_provider: paymentProvider,
        items: [{ product_id: product.id, quantity }],
      };
      // Same intent (and Idempotency-Key) for retries of the same order; a changed order gets a new one.
      checkoutIntentRef.current = getCheckoutIntent(checkoutIntentRef.current, payload);
      try {
        const res = await api.post(ORDERS.PUBLIC_INFLUENCER(slug), payload, {
          headers: createIntentHeaders(checkoutIntentRef.current),
        });
        proofIntentRef.current = createCheckoutIntent();
        setOrder({ number: res.data.data?.order_number || 'N/A', payment: res.data.data?.payment || null });
        window.scrollTo({ top: 0 });
      } catch (err) {
        setFormError(err?.response?.data?.message || 'We could not place your order. Please try again.');
      }
    });
  };

  const handleUploadProof = () => {
    if (!proofFile) { setProofError('Please choose your payment screenshot or photo first.'); return; }
    uploading.run(async () => {
      setProofError('');
      setProofMessage('');
      try {
        const formData = new FormData();
        formData.append('order_number', order.number);
        formData.append('customer_phone', customer.phone.trim());
        formData.append('proof', proofFile);
        await api.post(ORDERS.PUBLIC_PAYMENT_PROOF, formData, {
          headers: { 'Content-Type': 'multipart/form-data', ...createIntentHeaders(proofIntentRef.current) },
        });
        setProofMessage('Payment proof received. We will verify your payment shortly.');
        setProofFile(null);
      } catch (err) {
        setProofError(extractUploadErrorMessage(err));
      }
    });
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied('');
    }
  };

  if (order) {
    const account = order.payment?.bank_account || null;
    const totalDue = order.payment?.total_amount ?? totals.totalDue;
    return (
      <div className="ck">
        <CheckoutHeader slugLabel={slugLabel} />
        <main className="ck-wrap" style={{ paddingBlock: 'var(--ck-section)' }}>
          <div className="mx-auto max-w-3xl">
            <div className="ck-rise flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ck-brand)] text-white"><FiCheck aria-hidden="true" /></span>
              <p className="ck-label">Order placed</p>
            </div>
            <h1 className="ck-display ck-rise ck-rise-2 mt-5 text-[length:var(--ck-text-display)]">Almost done. Send your payment.</h1>
            <p className="ck-rise ck-rise-3 mt-4 max-w-xl ck-muted">
              Order <strong className="font-mono text-[var(--ck-ink)]">#{order.number}</strong> is reserved for you. Transfer the total
              below, then upload a photo or screenshot of your receipt so we can confirm it.
            </p>

            <div className="mt-10 grid gap-10 border-y ck-hairline py-10 md:grid-cols-2">
              <div>
                <p className="ck-label">Total due</p>
                <p className="ck-display mt-2 text-[length:var(--ck-text-price)]">{formatCurrency(totalDue)}</p>
                <p className="mt-1 text-[length:var(--ck-text-small)] ck-muted">
                  {quantity} × {product.name} · VAT, system fee and shipping included
                </p>
              </div>
              <div>
                <p className="ck-label">Pay to</p>
                {account ? (
                  <dl className="mt-3 space-y-3">
                    <div><dt className="text-[length:var(--ck-text-small)] ck-muted">{account.bank_name}</dt><dd className="font-semibold">{account.account_name}</dd></div>
                    <div className="flex items-center justify-between gap-3">
                      <dd className="font-mono text-xl font-semibold tracking-wide">{account.account_number}</dd>
                      <button type="button" className="ck-btn ck-btn-ghost min-h-[2.5rem] px-4 text-sm" onClick={() => copy(account.account_number, 'account')}>
                        <FiCopy aria-hidden="true" /> {copied === 'account' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 ck-muted">The payment account will be confirmed by our team. Keep your order number.</p>
                )}
              </div>
            </div>

            <section className="py-10" aria-labelledby="proof-title">
              <h2 id="proof-title" className="ck-display text-[length:var(--ck-text-title)]">Upload your payment proof</h2>
              <label className="ck-drop mt-5" htmlFor="ck-proof">
                <FiUploadCloud className="text-2xl text-[var(--ck-accent-ink)]" aria-hidden="true" />
                <span className="font-semibold">{proofFile ? proofFile.name : 'Choose a photo, screenshot or PDF'}</span>
                <span className="text-[length:var(--ck-text-small)] ck-muted">JPG, PNG, HEIC or PDF</span>
                <input
                  id="ck-proof"
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  disabled={uploading.submitting}
                  onChange={(e) => { setProofFile(e.target.files?.[0] || null); setProofError(''); }}
                />
              </label>
              {proofMessage && <p className="ck-alert ck-alert-success mt-4" role="status">{proofMessage}</p>}
              {proofError && <p className="ck-alert ck-alert-error mt-4" role="alert">{proofError}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="ck-btn ck-btn-primary" onClick={handleUploadProof} disabled={uploading.submitting}>
                  {uploading.submitting ? <><Spinner size="sm" light /> Uploading…</> : 'Submit payment proof'}
                </button>
                <Link to={`/track/${order.number}`} className="ck-btn ck-btn-ghost">Track my order <FiArrowRight aria-hidden="true" /></Link>
              </div>
            </section>
          </div>
        </main>
        <CheckoutFooter />
      </div>
    );
  }

  return (
    <div className="ck ck-has-bar">
      <CheckoutHeader slugLabel={slugLabel} />

      <main>
        {/* Product */}
        <section className="ck-hero" aria-labelledby="ck-product-name">
          <div className="ck-wrap grid items-center gap-10 py-[var(--ck-section)] lg:grid-cols-2 lg:gap-16">
            <div className="ck-product-stage ck-rise rounded-[2rem]">
              <img src={productImage} alt={product.name} onError={(e) => attachProductImageFallback(e, product)} />
            </div>
            <div>
              <p className="ck-label ck-rise">Shared by {slugLabel}</p>
              <h1 id="ck-product-name" className="ck-display ck-rise ck-rise-2 mt-4 text-[length:var(--ck-text-display)]">{product.name}</h1>
              <p className="ck-rise ck-rise-3 mt-5 max-w-lg leading-snug ck-muted" style={{ fontSize: 'clamp(1.05rem, 0.95rem + 0.5vw, 1.3rem)' }}>
                {productDescription(product)}
              </p>
              <div className="mt-8 flex items-baseline gap-3">
                <span className="ck-display text-[length:var(--ck-text-price)]">{formatCurrency(unitPrice)}</span>
                <span className="ck-muted">per box</span>
              </div>
              <p className="mt-2 inline-flex items-center gap-2 text-[length:var(--ck-text-small)]">
                <span className={`h-2 w-2 rounded-full ${soldOut ? 'bg-[var(--ck-danger)]' : 'bg-[var(--ck-success)]'}`} aria-hidden="true" />
                {soldOut ? 'Out of stock right now' : 'In stock · ships from Caloocan or Pasig'}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <QuantityStepper value={quantity} max={maxQty} onChange={setQty} disabled={soldOut} idPrefix="hero" />
                <a href="#checkout" className="ck-btn ck-btn-primary" aria-disabled={soldOut}>
                  Buy now · {formatCurrency(totals.totalDue)} <FiArrowRight aria-hidden="true" />
                </a>
              </div>
              <ul className="mt-10 grid gap-4 border-t ck-hairline pt-6 text-[length:var(--ck-text-small)] sm:grid-cols-3">
                <li className="flex items-center gap-2"><FiShield className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> Official Nogatu product</li>
                <li className="flex items-center gap-2"><FiLock className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> GCash, BDO or PSBank</li>
                <li className="flex items-center gap-2"><FiTruck className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> Track your order online</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Checkout */}
        <section id="checkout" className="border-t ck-hairline bg-[var(--ck-paper-2)]" style={{ scrollMarginTop: '5rem' }} aria-labelledby="ck-checkout-title">
          <form onSubmit={handlePlaceOrder} noValidate className="ck-wrap grid gap-12 py-[var(--ck-section)] lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <div>
              <h2 id="ck-checkout-title" className="ck-display text-[length:var(--ck-text-display)]" style={{ fontSize: 'clamp(2rem, 1.6rem + 2vw, 3.25rem)' }}>Checkout</h2>
              <p className="mt-3 ck-muted">No account needed. We only use these details to deliver your order.</p>

              <div className="mt-8">
                <section className="ck-step grid gap-6 py-8 sm:grid-cols-[3.5rem_1fr]" aria-labelledby="ck-step-contact">
                  <span className="ck-step-num" aria-hidden="true">01</span>
                  <div>
                    <h3 id="ck-step-contact" className="text-[length:var(--ck-text-title)] font-semibold">Contact</h3>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field id="ck-name" label="Full name" required>
                          <input id="ck-name" className="ck-input" autoComplete="name" value={customer.name} onChange={setField('name')} aria-invalid={fieldInvalid('name')} placeholder="Juan Dela Cruz" />
                        </Field>
                      </div>
                      <Field id="ck-phone" label="Mobile number" required hint="Needed to upload your payment proof.">
                        <input id="ck-phone" className="ck-input" type="tel" autoComplete="tel" inputMode="tel" value={customer.phone} onChange={setField('phone')} aria-invalid={fieldInvalid('phone')} placeholder="0917 123 4567" />
                      </Field>
                      <Field id="ck-email" label="Email" hint="Optional, for order updates.">
                        <input id="ck-email" className="ck-input" type="email" autoComplete="email" value={customer.email} onChange={setField('email')} placeholder="juan@example.com" />
                      </Field>
                    </div>
                  </div>
                </section>

                <section className="ck-step grid gap-6 py-8 sm:grid-cols-[3.5rem_1fr]" aria-labelledby="ck-step-delivery">
                  <span className="ck-step-num" aria-hidden="true">02</span>
                  <div>
                    <h3 id="ck-step-delivery" className="text-[length:var(--ck-text-title)] font-semibold">Delivery</h3>
                    <div className="mt-5 grid gap-5">
                      <Field id="ck-address" label="Delivery address" required>
                        <textarea id="ck-address" className="ck-input min-h-[6rem]" autoComplete="street-address" value={customer.address} onChange={setField('address')} aria-invalid={fieldInvalid('address')} placeholder="House no., street, barangay, city, province, postal code" />
                      </Field>
                      <LocationPicker value={pinnedLocation} onChange={setPinnedLocation} />
                    </div>
                  </div>
                </section>

                <section className="ck-step grid gap-6 py-8 sm:grid-cols-[3.5rem_1fr]" aria-labelledby="ck-step-payment">
                  <span className="ck-step-num" aria-hidden="true">03</span>
                  <div>
                    <h3 id="ck-step-payment" className="text-[length:var(--ck-text-title)] font-semibold">Payment</h3>
                    <p className="mt-1 ck-muted text-[length:var(--ck-text-small)]">Bank transfer or e-wallet. The account details appear after you place the order.</p>
                    <div className="mt-5">
                      <PaymentChoices
                        options={paymentProviders}
                        selected={paymentProvider}
                        onSelect={setPaymentProvider}
                        disabled={placing.submitting}
                        loadError={paymentOptionsError}
                        onRetry={loadPaymentOptions}
                      />
                    </div>
                    <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                      {PAYMENT_STEPS.map((step, i) => (
                        <li key={step.title} className="text-[length:var(--ck-text-small)]">
                          <span className="ck-display text-lg text-[var(--ck-accent-ink)]">{i + 1}.</span>{' '}
                          <span className="font-semibold">{step.title}</span>
                          <span className="block ck-muted">{step.detail}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              </div>
            </div>

            <aside aria-labelledby="ck-summary-title">
              <div className="ck-summary p-6 sm:p-8">
                <h2 id="ck-summary-title" className="ck-label">Order summary</h2>
                <div className="mt-5 flex items-center gap-4 border-b ck-hairline pb-5">
                  <img src={productImage} alt="" className="h-20 w-20 rounded-2xl bg-[var(--ck-paper)] object-contain p-2" onError={(e) => attachProductImageFallback(e, product)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-[length:var(--ck-text-small)] ck-muted">{formatCurrency(unitPrice)} each</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-b ck-hairline py-5">
                  <span className="ck-label">Quantity</span>
                  <QuantityStepper value={quantity} max={maxQty} onChange={setQty} disabled={soldOut || placing.submitting} idPrefix="summary" />
                </div>
                <div className="border-b ck-hairline py-5"><SummaryLines totals={totals} /></div>
                <div className="flex items-baseline justify-between py-5">
                  <span className="font-semibold">Total</span>
                  <span className="ck-display text-[length:var(--ck-text-price)]">{formatCurrency(totals.totalDue)}</span>
                </div>
                {formError && <p className="ck-alert ck-alert-error mb-4" role="alert">{formError}</p>}
                <button type="submit" className="ck-btn ck-btn-primary w-full" disabled={placing.submitting || soldOut || paymentProviders.length === 0}>
                  {placing.submitting ? <><Spinner size="sm" light /> Placing order…</> : `Place order · ${formatCurrency(totals.totalDue)}`}
                </button>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-[length:var(--ck-text-small)] ck-muted">
                  <FiLock aria-hidden="true" /> Your details are only used for this order.
                </p>
              </div>
            </aside>

            <div className="ck-mobile-bar" role="region" aria-label="Order total">
              <div className="min-w-0">
                <p className="ck-label text-[0.6rem]">Total · {quantity} {quantity === 1 ? 'box' : 'boxes'}</p>
                <p className="ck-display text-2xl leading-none">{formatCurrency(totals.totalDue)}</p>
              </div>
              <button type="submit" className="ck-btn ck-btn-primary shrink-0" disabled={placing.submitting || soldOut || paymentProviders.length === 0}>
                {placing.submitting ? <Spinner size="sm" light /> : 'Place order'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <CheckoutFooter />
    </div>
  );
}
