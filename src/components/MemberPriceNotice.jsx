import { useState } from 'react';
import { Button } from 'flowbite-react';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import ConfirmDialog from '@/components/ConfirmDialog';
import useSubmitGuard from '@/hooks/useSubmitGuard';

/**
 * Shown on an order that got the Nogatu Alliance member price. The member price is meant for the member's own
 * order (Sir Dino, 2026-11-24); the person approving checks that here. If it is for someone else, they can remove
 * just the member price (2026-11-26) so the buyer does not have to order again: products go back to their regular
 * price, shipping stays, and the buyer is emailed the new total. Only while pending and before any payment.
 *
 * `canRemove`: the viewer may approve this order. `onRemoved(message)`: reload the order and the list.
 */
export default function MemberPriceNotice({ order, canRemove = false, onRemoved, onError }) {
  const [confirming, setConfirming] = useState(false);
  const { submitting, run } = useSubmitGuard();
  if (!order?.member_username) return null;

  const pct = Number(order.member_discount_pct || 0);
  const buyer = order.customer_name || order.customer_display_name || 'the buyer';
  const removable = canRemove && pct > 0 && order.status === 'pending' && !order.payment_proof_url;

  const remove = () => run(async () => {
    try {
      const { data } = await api.patch(ORDERS.REMOVE_MEMBER_PRICE(order.id));
      setConfirming(false);
      onRemoved?.(data.message);
    } catch (err) {
      setConfirming(false);
      onError?.(err?.response?.data?.message || 'Could not remove the member price. Please try again.');
    }
  });

  if (pct === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-100" role="note">
        <p className="font-semibold">Member price removed (signed in as {order.member_username})</p>
        <p className="mt-1">The products are at the regular price and the buyer was emailed the new total.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100" role="note">
      <p className="font-semibold">Member price: {order.member_username} ({pct}% off products)</p>
      <p className="mt-1">
        Signed in as an active Nogatu Alliance member. Before approving, check that this order is for the member
        (buyer: {buyer}). If it is for someone else, remove the member price instead of rejecting the order.
      </p>
      {removable && (
        <div className="mt-3">
          <Button size="xs" color="light" disabled={submitting} onClick={() => setConfirming(true)}>
            Remove member price
          </Button>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => { if (!submitting) setConfirming(false); }}
        onConfirm={remove}
        loading={submitting}
        variant="primary"
        title="Remove the member price?"
        message={`The products go back to the regular price and ${buyer} is emailed the new total. Shipping stays the same. This cannot be undone.`}
        confirmText={submitting ? 'Removing…' : 'Remove member price'}
      />
    </div>
  );
}
