import { useEffect, useMemo, useState } from 'react';
import { normalizePaymentProviders } from '@/pages/shared/paymentProviders.js';

/**
 * How the buyer can pay, from the shipping quote (POST /shipping/quote → payment_providers): only the
 * accounts of the Stockist or hub that ships to this address, or the company accounts when it has none
 * (Sir Dino, 2026-11-26). Until there is a quote (no address yet) there is nothing to choose.
 * The choice is kept while still offered and moves to the first option when the address changes it away.
 */
export default function useQuotedPaymentProviders(quote) {
  const options = useMemo(() => normalizePaymentProviders(quote?.payment_providers), [quote]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (options.length === 0) return;
    setSelected((current) => (options.some((o) => o.provider === current) ? current : options[0].provider));
  }, [options]);

  const offered = options.some((o) => o.provider === selected);
  return { options, selected: offered ? selected : '', setSelected };
}
