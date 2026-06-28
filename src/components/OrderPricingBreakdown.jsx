import { HiOutlineReceiptTax } from 'react-icons/hi';
import formatCurrency from '@/utils/formatCurrency';

function PricingRow({ label, amount, emphasis = false, tone = 'default' }) {
  const toneClass = tone === 'discount'
    ? 'text-emerald-700 dark:text-emerald-300'
    : tone === 'adjustment'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-gray-800 dark:text-[var(--dark-text)]';
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasis ? 'pt-3 text-base font-extrabold' : 'text-sm'}`}>
      <span className={emphasis ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-[var(--dark-muted)]'}>{label}</span>
      <span className={`${toneClass} tabular-nums ${emphasis ? 'text-lg' : 'font-semibold'}`}>
        {tone === 'discount' && Number(amount) > 0 ? '- ' : ''}{formatCurrency(amount)}
      </span>
    </div>
  );
}

export default function OrderPricingBreakdown({ breakdown, fallbackTotal = 0 }) {
  const values = breakdown || {};
  const merchandise = Number(values.merchandise_subtotal ?? fallbackTotal ?? 0);
  const discount = Number(values.member_discount_amount || 0);
  const shipping = Number(values.shipping_fee || 0);
  const system = Number(values.system_fee || 0);
  const adjustment = Number(values.adjustment_amount || 0);
  const total = Number(values.total_amount ?? fallbackTotal ?? 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm dark:border-amber-500/20 dark:from-amber-500/10 dark:via-[var(--dark-card)] dark:to-orange-500/5">
      <div className="flex items-center gap-3 border-b border-amber-100 px-4 py-3 dark:border-amber-500/15">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/25">
          <HiOutlineReceiptTax className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-gray-950 dark:text-white">How this total was calculated</h3>
          <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Locked checkout prices and fees</p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-4">
        <PricingRow label="Merchandise subtotal" amount={merchandise} />
        {discount > 0 ? <PricingRow label="Member discount" amount={discount} tone="discount" /> : null}
        <PricingRow label="Shipping fee" amount={shipping} />
        <PricingRow label="System fee" amount={system} />
        {adjustment !== 0 ? <PricingRow label="Historical adjustment" amount={adjustment} tone="adjustment" /> : null}
        <div className="border-t border-dashed border-amber-200 dark:border-amber-500/25">
          <PricingRow label="Total amount" amount={total} emphasis />
        </div>
      </div>
    </section>
  );
}
