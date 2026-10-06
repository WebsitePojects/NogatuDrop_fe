import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Spinner } from 'flowbite-react';
import { FiMinus, FiPlus, FiLock, FiTruck, FiShield, FiArrowRight } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS, PRODUCTS } from '@/services/endpoints';
import { createCheckoutIntent, createIntentHeaders, getCheckoutIntent } from '@/utils/checkoutIntent';
import { formatCurrency } from '@/utils/formatCurrency';
import { getPublicCatalogPrice } from '@/utils/publicCatalogPrice';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';
import { getPublicOrderPricingTotals, VAT_LABEL } from '@/utils/publicCheckoutPricing';
import { NOGATU_PRODUCT_CATALOG } from '@/utils/nogatuCatalog';
import { maxOrderableQuantity, clampQuantity } from '@/utils/publicOrderLimits';
import {
  EMPTY_NAME, EMPTY_ADDRESS, NAME_SUFFIX_OPTIONS,
  nameProblems, addressProblems, toOrderCustomerFields, formatPersonName, geocodeQueries,
} from '@/utils/publicCustomer';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import LocationPicker from '@/components/LocationPicker';
import PhAddressFields from '@/components/PhAddressFields';
import { normalizePaymentProviders } from './paymentProviders.js';
import { CheckoutHeader, CheckoutFooter } from './InfluencerCheckoutChrome';
import InfluencerPaymentStep from './InfluencerPaymentStep';
import './influencerCheckout.css';

const PHONE_PATTERN = /^(\+?63|0)9\d{9}$/;
const ADDRESS_CLASSES = { field: '', label: 'ck-field-label', input: 'ck-input', hint: 'ck-field-hint text-[var(--ck-danger)]' };

function productDescription(product) {
  const entry = NOGATU_PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === String(product?.name || '').toLowerCase());
  return entry?.shortDescription || 'Official Nogatu product, shipped from a Nogatu fulfillment center.';
}

// Hoisted to module scope so inputs keep focus between keystrokes.
function Field({ id, label, required, children, hint, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="ck-field-label">{label}{required && <span aria-hidden="true"> *</span>}</label>
      {children}
      {hint && <p className="ck-field-hint">{hint}</p>}
    </div>
  );
}

function StepHeading({ number, id, title, detail }) {
  return (
    <div className="flex items-start gap-3">
      <span className="ck-step-badge mt-0.5 shrink-0" aria-hidden="true">{number}</span>
      <div>
        <h3 id={id} className="ck-heading text-[length:var(--ck-text-title)]">{title}</h3>
        {detail && <p className="mt-0.5 text-[length:var(--ck-text-small)] ck-muted">{detail}</p>}
      </div>
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
    <fieldset disabled={disabled} className="grid gap-2.5 sm:grid-cols-3">
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
    <dl className="space-y-2 text-[length:var(--ck-text-small)]">
      <div className="flex justify-between"><dt className="ck-muted">Subtotal</dt><dd className="font-medium">{formatCurrency(totals.merchandiseSubtotal)}</dd></div>
      <div className="flex justify-between"><dt className="ck-muted">{VAT_LABEL}</dt><dd className="font-medium">{formatCurrency(totals.systemFee)}</dd></div>
      <div className="flex justify-between"><dt className="ck-muted">Shipping</dt><dd className="font-medium">{formatCurrency(totals.shippingFee)}</dd></div>
    </dl>
  );
}

/**
 * Checkout for an influencer link such as /kawoodee: one product, the buyer picks the quantity
 * (1 to the public cap, never more than is in stock), gives their name and a PSGC address in parts,
 * then pays by bank transfer or e-wallet and uploads proof. Orders go to
 * POST /orders/public/influencer/:slug, which re-validates everything and attributes the sale.
 */
export default function InfluencerCheckout({ influencer }) {
  const { slug, product } = influencer;
  const slugLabel = String(slug || '').toUpperCase();
  const unitPrice = getPublicCatalogPrice(product);
  const productImage = getProductImageSrc(product);

  const [availableQty, setAvailableQty] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState(EMPTY_NAME);
  const [contact, setContact] = useState({ phone: '', email: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [place, setPlace] = useState(null);
  const [touched, setTouched] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [paymentProviders, setPaymentProviders] = useState([]);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentOptionsError, setPaymentOptionsError] = useState('');
  const [formError, setFormError] = useState('');
  const [order, setOrder] = useState(null);

  const checkoutIntentRef = useRef(createCheckoutIntent());
  const placing = useSubmitGuard();

  const maxQty = maxOrderableQuantity(availableQty);
  const soldOut = availableQty !== null && maxQty === 0;
  const totals = useMemo(() => getPublicOrderPricingTotals(unitPrice * quantity), [unitPrice, quantity]);
  const searchQueries = useMemo(() => geocodeQueries(place), [place]);

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
  const setNamePart = (key) => (e) => setName((n) => ({ ...n, [key]: e.target.value }));
  const setContactPart = (key) => (e) => setContact((c) => ({ ...c, [key]: e.target.value }));

  const phoneValid = PHONE_PATTERN.test(contact.phone.replace(/[\s-]/g, ''));
  const badName = touched ? nameProblems(name) : [];
  const badAddress = touched ? addressProblems(address) : [];
  const invalidAddress = Object.fromEntries(badAddress.map((key) => [key, true]));

  // Shows the message and takes the buyer to the field to fix; on a phone it is far above the button.
  const fail = (message, fieldId) => {
    setFormError(message);
    const field = fieldId && document.getElementById(fieldId);
    if (field) {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      field.focus({ preventScroll: true });
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setTouched(true);
    setFormError('');
    const badNameNow = nameProblems(name);
    if (badNameNow.length > 0) { fail('Please enter your first and last name (letters only).', `ck-${badNameNow[0]}`); return; }
    if (!phoneValid) { fail('Please enter a valid mobile number, e.g. 0917 123 4567.', 'ck-phone'); return; }
    const missingAddress = addressProblems(address);
    if (missingAddress.includes('barangay')) {
      const firstEmpty = ['regionCode', 'provinceKey', 'cityCode'].find((key) => !address[key]);
      const ids = { regionCode: 'ck-addr-region', provinceKey: 'ck-addr-province', cityCode: 'ck-addr-city' };
      fail('Please choose your region, province, city and barangay.', ids[firstEmpty] || 'ck-addr-barangay');
      return;
    }
    if (missingAddress.length > 0) { fail('Please add your house no. and street, and check the postal code.', missingAddress[0] === 'line' ? 'ck-addr-line' : 'ck-addr-postal'); return; }
    if (!paymentProvider) { fail('Please choose how you will pay.'); return; }
    if (soldOut || quantity < 1) { fail('This product is out of stock right now.'); return; }

    placing.run(async () => {
      const payload = {
        ...toOrderCustomerFields(name, address),
        customer_phone: contact.phone.replace(/[\s-]/g, ''),
        customer_email: contact.email.trim() || undefined,
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
        const placeLine = [address.line.trim(), place?.barangay, place?.city, place?.province || place?.region, address.postalCode.trim()]
          .filter(Boolean).join(', ');
        setOrder({
          number: res.data.data?.order_number || 'N/A',
          payment: res.data.data?.payment || null,
          provider: paymentProvider,
          quantity,
          deliverTo: { name: formatPersonName(name), phone: payload.customer_phone, address: placeLine },
        });
        window.scrollTo({ top: 0 });
      } catch (err) {
        setFormError(err?.response?.data?.message || 'We could not place your order. Please try again.');
      }
    });
  };

  if (order) {
    return <InfluencerPaymentStep slugLabel={slugLabel} product={product} order={order} fallbackTotal={totals.totalDue} />;
  }

  const placeDisabled = placing.submitting || soldOut || paymentProviders.length === 0;

  return (
    <div className="ck ck-has-bar">
      <CheckoutHeader slugLabel={slugLabel} />

      <main>
        {/* Brand photo band + product sheet */}
        <section className="ck-media ck-media-band">
          <div className="ck-wrap pt-6 sm:pt-10">
            <p className="ck-label ck-rise">Shared by {slugLabel}</p>
            <p className="ck-rise ck-rise-2 mt-2 max-w-md text-[length:var(--ck-text-small)] text-white/90">Nogatu Global Wellness Collection — shipped from our centers in Caloocan and Pasig.</p>
          </div>
        </section>

        <div className="ck-wrap">
          <section className="ck-sheet ck-rise p-4 sm:p-7" aria-labelledby="ck-product-name">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
              <div className="ck-product-thumb h-56 w-full sm:aspect-square sm:h-auto">
                <img src={productImage} alt={product.name} onError={(e) => attachProductImageFallback(e, product)} />
              </div>
              <div className="flex flex-col">
                <h1 id="ck-product-name" className="ck-heading text-[length:var(--ck-text-hero)]">{product.name}</h1>
                <p className="mt-2 text-[length:var(--ck-text-small)] ck-muted sm:text-[length:var(--ck-text-body)]">{productDescription(product)}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="ck-price text-[length:var(--ck-text-price)]">{formatCurrency(unitPrice)}</span>
                  <span className="text-[length:var(--ck-text-small)] ck-muted">per box</span>
                </div>
                <p className="mt-1 inline-flex items-center gap-2 text-[length:var(--ck-text-small)]">
                  <span className={`h-2 w-2 rounded-full ${soldOut ? 'bg-[var(--ck-danger)]' : 'bg-[var(--ck-success)]'}`} aria-hidden="true" />
                  {soldOut ? 'Out of stock right now' : 'In stock'}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <QuantityStepper value={quantity} max={maxQty} onChange={setQty} disabled={soldOut} idPrefix="hero" />
                  <a href="#checkout" className="ck-btn ck-btn-primary flex-1 sm:flex-none" aria-disabled={soldOut}>
                    Buy now<span className="hidden sm:inline"> · {formatCurrency(totals.totalDue)}</span> <FiArrowRight aria-hidden="true" />
                  </a>
                </div>
                <ul className="mt-5 grid gap-2 border-t ck-hairline pt-4 text-[length:var(--ck-text-small)] sm:grid-cols-3">
                  <li className="flex items-center gap-2"><FiShield className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> Official Nogatu product</li>
                  <li className="flex items-center gap-2"><FiLock className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> GCash, BDO or PSBank</li>
                  <li className="flex items-center gap-2"><FiTruck className="text-[var(--ck-accent-ink)]" aria-hidden="true" /> Track your order online</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Checkout */}
        <section id="checkout" style={{ scrollMarginTop: '4.5rem' }} aria-labelledby="ck-checkout-title">
          <form onSubmit={handlePlaceOrder} noValidate className="ck-wrap grid gap-8 py-8 sm:py-12 lg:grid-cols-[1.45fr_1fr] lg:gap-12">
            <div>
              <h2 id="ck-checkout-title" className="ck-heading text-[length:var(--ck-text-hero)]">Checkout</h2>
              <p className="mt-1 text-[length:var(--ck-text-small)] ck-muted">No account needed. We only use these details to deliver your order.</p>

              <section className="ck-step" aria-labelledby="ck-step-contact">
                <StepHeading number={1} id="ck-step-contact" title="Your details" />
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-6">
                  <Field id="ck-first" label="First name" required className="col-span-2 sm:col-span-3">
                    <input id="ck-first" className="ck-input" autoComplete="given-name" value={name.first} onChange={setNamePart('first')} aria-invalid={badName.includes('first') || undefined} maxLength={80} placeholder="Juan" />
                  </Field>
                  <Field id="ck-middle" label="Middle name" className="col-span-2 sm:col-span-3">
                    <input id="ck-middle" className="ck-input" autoComplete="additional-name" value={name.middle} onChange={setNamePart('middle')} aria-invalid={badName.includes('middle') || undefined} maxLength={80} placeholder="Optional" />
                  </Field>
                  <Field id="ck-last" label="Last name" required className="col-span-2 sm:col-span-4">
                    <input id="ck-last" className="ck-input" autoComplete="family-name" value={name.last} onChange={setNamePart('last')} aria-invalid={badName.includes('last') || undefined} maxLength={80} placeholder="Dela Cruz" />
                  </Field>
                  <Field id="ck-suffix" label="Suffix" className="col-span-2 sm:col-span-2">
                    <select id="ck-suffix" className="ck-input" autoComplete="honorific-suffix" value={name.suffix} onChange={setNamePart('suffix')}>
                      <option value="">None</option>
                      {NAME_SUFFIX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field id="ck-phone" label="Mobile number" required hint="We text delivery updates here. You also need it to upload your receipt." className="col-span-2 sm:col-span-3">
                    <input id="ck-phone" className="ck-input" type="tel" autoComplete="tel" inputMode="tel" value={contact.phone} onChange={setContactPart('phone')} aria-invalid={(touched && !phoneValid) || undefined} placeholder="0917 123 4567" />
                  </Field>
                  <Field id="ck-email" label="Email" hint="Optional, for order updates." className="col-span-2 sm:col-span-3">
                    <input id="ck-email" className="ck-input" type="email" autoComplete="email" inputMode="email" value={contact.email} onChange={setContactPart('email')} placeholder="juan@example.com" />
                  </Field>
                </div>
              </section>

              <section className="ck-step" aria-labelledby="ck-step-delivery">
                <StepHeading number={2} id="ck-step-delivery" title="Delivery address" detail="Pick your barangay and the map drops a pin there." />
                <div className="mt-5 grid gap-5">
                  <PhAddressFields
                    value={address}
                    onChange={setAddress}
                    onPlaceChange={setPlace}
                    invalid={invalidAddress}
                    disabled={placing.submitting}
                    classes={ADDRESS_CLASSES}
                    idPrefix="ck-addr"
                  />
                  <LocationPicker value={pinnedLocation} onChange={setPinnedLocation} searchQueries={searchQueries} />
                </div>
              </section>

              <section className="ck-step" aria-labelledby="ck-step-payment">
                <StepHeading number={3} id="ck-step-payment" title="Payment" detail="Bank transfer or e-wallet. The account appears right after you place the order." />
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
              </section>
              {formError && <p className="ck-alert ck-alert-error lg:hidden" role="alert">{formError}</p>}
            </div>

            <aside aria-labelledby="ck-summary-title">
              <div className="ck-summary p-5 sm:p-6">
                <h2 id="ck-summary-title" className="ck-label">Order summary</h2>
                <div className="mt-4 flex items-center gap-3 border-b ck-hairline pb-4">
                  <span className="ck-product-thumb h-16 w-16 shrink-0">
                    <img src={productImage} alt="" onError={(e) => attachProductImageFallback(e, product)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-[length:var(--ck-text-small)] ck-muted">{formatCurrency(unitPrice)} each</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-b ck-hairline py-4">
                  <span className="text-[length:var(--ck-text-small)] font-semibold">Quantity</span>
                  <QuantityStepper value={quantity} max={maxQty} onChange={setQty} disabled={soldOut || placing.submitting} idPrefix="summary" />
                </div>
                <div className="border-b ck-hairline py-4"><SummaryLines totals={totals} /></div>
                <div className="flex items-baseline justify-between py-4">
                  <span className="font-semibold">Total</span>
                  <span className="ck-price text-[length:var(--ck-text-price)]">{formatCurrency(totals.totalDue)}</span>
                </div>
                {formError && <p className="ck-alert ck-alert-error mb-4 hidden lg:block" role="alert">{formError}</p>}
                <button type="submit" className="ck-btn ck-btn-primary hidden w-full lg:inline-flex" disabled={placeDisabled}>
                  {placing.submitting ? <><Spinner size="sm" light /> Placing order…</> : `Place order · ${formatCurrency(totals.totalDue)}`}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[length:var(--ck-text-small)] ck-muted">
                  <FiLock aria-hidden="true" /> Your details are only used for this order.
                </p>
              </div>
            </aside>

            <div className="ck-mobile-bar" role="region" aria-label="Order total">
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ck-muted">Total · {quantity} {quantity === 1 ? 'box' : 'boxes'}</p>
                <p className="ck-price text-xl leading-tight">{formatCurrency(totals.totalDue)}</p>
              </div>
              <button type="submit" className="ck-btn ck-btn-primary shrink-0" disabled={placeDisabled}>
                {placing.submitting ? <><Spinner size="sm" light /> Placing…</> : 'Place order'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <CheckoutFooter />
    </div>
  );
}
