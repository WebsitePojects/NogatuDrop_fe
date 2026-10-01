/**
 * Normalize `GET /orders/public/payment-options` into picker entries.
 *
 * Each provider is either a bare code ("GCASH") or an object carrying the
 * account the routed center wants to be paid on. Account fields are optional:
 * when the API omits them the picker shows the provider alone and the account
 * is revealed on the post-order payment screen.
 *
 * @returns {{ provider: string, bankName: string, accountName: string, accountNumber: string }[]}
 */
export function normalizePaymentProviders(rawProviders) {
  if (!Array.isArray(rawProviders)) return [];
  const seen = new Set();
  const entries = [];
  rawProviders.forEach((raw) => {
    const entry = typeof raw === 'string'
      ? { provider: raw }
      : { ...raw, provider: raw?.provider };
    const provider = String(entry.provider || '').trim().toUpperCase();
    if (!provider || seen.has(provider)) return;
    seen.add(provider);
    entries.push({
      provider,
      bankName: entry.bank_name || '',
      accountName: entry.account_name || '',
      accountNumber: entry.account_number || '',
    });
  });
  return entries;
}
