/**
 * Shown on an order that got the Nogatu Alliance member price. The member price is meant for the member's own
 * order (Sir Dino, 2026-11-24); the person approving checks that here before approving, and rejects if not.
 */
export default function MemberPriceNotice({ order }) {
  if (!order?.member_username) return null;
  const pct = Number(order.member_discount_pct || 0);
  const buyer = order.customer_name || order.customer_display_name || 'the buyer';
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100" role="note">
      <p className="font-semibold">Member price: {order.member_username}{pct ? ` (${pct}% off products)` : ''}</p>
      <p className="mt-1">
        Signed in as an active Nogatu Alliance member. Before approving, check that this order is for the member
        (buyer: {buyer}). If it is for someone else, reject it so they can order at the regular price.
      </p>
    </div>
  );
}
