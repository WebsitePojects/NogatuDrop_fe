import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { SHIPPING } from '@/services/endpoints';

const DEBOUNCE_MS = 350;

/**
 * The server's shipping fee and delivery window for this cart going to `barangayCode`
 * (POST /shipping/quote; read-only, so it needs no idempotency key). Asks again, debounced, whenever the
 * address or the cart changes; an answer for an older cart is dropped.
 * Returns { quote, loading, error }: quote is null until the buyer has picked a barangay and has items.
 * `centersOnly` is for influencer links, which always ship from a center.
 */
export default function useShippingQuote(barangayCode, items, { centersOnly = false } = {}) {
  const lines = useMemo(
    () => (items || [])
      .filter((item) => item.product_id && Number(item.quantity) > 0)
      .map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) })),
    [items]
  );
  const requestKey = barangayCode && lines.length ? JSON.stringify([barangayCode, lines, centersOnly]) : '';
  const [state, setState] = useState({ key: '', quote: null, error: '' });

  useEffect(() => {
    if (!requestKey) return undefined;
    let current = true;
    const timer = setTimeout(() => {
      const [code, body, onlyCenters] = JSON.parse(requestKey);
      api.post(SHIPPING.QUOTE, { barangay_code: code, items: body, ...(onlyCenters ? { centers_only: true } : {}) })
        .then(({ data }) => { if (current) setState({ key: requestKey, quote: data.data, error: '' }); })
        .catch((err) => {
          if (current) {
            setState({ key: requestKey, quote: null, error: err?.response?.data?.message || 'We could not work out the shipping fee. Please try again.' });
          }
        });
    }, DEBOUNCE_MS);
    return () => { current = false; clearTimeout(timer); };
  }, [requestKey]);

  if (!requestKey) return { quote: null, loading: false, error: '' };
  const settled = state.key === requestKey;
  return { quote: settled ? state.quote : null, loading: !settled, error: settled ? state.error : '' };
}
