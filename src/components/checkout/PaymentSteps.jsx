const STEPS = [
  { title: 'Pay', detail: 'Send the total by bank transfer or e-wallet.' },
  { title: 'Upload proof', detail: 'Attach a screenshot or photo of your receipt.' },
  { title: 'We confirm', detail: 'We check your payment and prepare your order.' },
];

/**
 * The three payment steps shown under "Pay with" on every store checkout (/shop and influencer links
 * such as /kawoodee), so buyers see the same instructions wherever they order.
 */
export default function PaymentSteps() {
  return (
    <div>
      <ol className="grid gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2 text-xs text-amber-900">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700 text-[11px] font-bold text-white">{index + 1}</span>
            <span><span className="block font-semibold">{step.title}</span><span className="leading-relaxed">{step.detail}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-gray-600">After you place your order we show the account to pay and the upload button.</p>
    </div>
  );
}
