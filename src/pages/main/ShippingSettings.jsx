import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, TextInput } from 'flowbite-react';
import { HiInformationCircle } from 'react-icons/hi';
import api from '@/services/api';
import { SHIPPING } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import { ToastContainer, useToast } from '@/components/Toast';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { formatCurrency } from '@/utils/formatCurrency';

// Super Admin edits the store's shipping fee table (meeting with Sir Dino, 2026-11-10): fee per zone per
// weight bracket, delivery days per zone, which zone each region and province ships at, and the weight of
// one unit of each product. Checkout quotes from these; orders keep the fee they were quoted.

const ISLAND_GROUP_LABELS = { LUZON: 'Luzon', VISAYAS: 'Visayas', MINDANAO: 'Mindanao' };

const kgLabel = (grams) => `${(grams / 1000).toLocaleString('en-PH', { maximumFractionDigits: 3 })} kg`;

function bracketLabels(rates) {
  return rates.map((rate, i) => (i === 0
    ? `Up to ${kgLabel(rate.max_weight_grams)}`
    : `${kgLabel(rates[i - 1].max_weight_grams)} – ${kgLabel(rate.max_weight_grams)}`));
}

/** The editable copy of the server's settings, as strings so inputs can be cleared while typing. */
function toDraft(data) {
  return {
    zones: data.zones.map((z) => ({
      ...z,
      eta_min_days: String(z.eta_min_days),
      eta_max_days: String(z.eta_max_days),
      rates: z.rates.map((r) => ({ ...r, fee: String(r.fee) })),
    })),
    regions: data.regions.map((r) => ({ ...r })),
    provinces: data.provinces.map((p) => ({ ...p, zone_code: p.zone_code || '' })),
    products: data.products.map((p) => ({ ...p, weight_grams: p.weight_grams == null ? '' : String(p.weight_grams) })),
  };
}

/** What is wrong with the draft, or '' when it can be saved. Mirrors the server's checks. */
function draftProblem(draft) {
  for (const zone of draft.zones) {
    const min = Number(zone.eta_min_days);
    const max = Number(zone.eta_max_days);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 60) return `${zone.name}: delivery days must be whole numbers from 0 to 60`;
    if (min > max) return `${zone.name}: the earliest day cannot be after the latest`;
    if (zone.rates.some((r) => r.fee === '' || !(Number(r.fee) >= 0))) return `${zone.name}: every fee needs an amount`;
  }
  if (draft.regions.some((r) => !r.zone_code)) return 'Every region needs a zone';
  const missing = draft.products.find((p) => !(Number.isInteger(Number(p.weight_grams)) && Number(p.weight_grams) > 0));
  if (missing) return `${missing.name}: enter its weight in grams (it cannot be sold at checkout without one)`;
  return '';
}

function toPayload(draft) {
  return {
    zones: draft.zones.map((z) => ({
      code: z.code,
      eta_min_days: Number(z.eta_min_days),
      eta_max_days: Number(z.eta_max_days),
      rates: z.rates.map((r) => ({ max_weight_grams: r.max_weight_grams, fee: Number(r.fee) })),
    })),
    regions: draft.regions.map((r) => ({ code: r.code, zone_code: r.zone_code })),
    provinces: draft.provinces.map((p) => ({ code: p.code, zone_code: p.zone_code || null })),
    products: draft.products.map((p) => ({ id: p.id, weight_grams: Number(p.weight_grams) })),
  };
}

const numberCell = 'w-24';

export default function ShippingSettings() {
  const { toasts, showToast, dismiss } = useToast();
  const { submitting, run } = useSubmitGuard();
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get(SHIPPING.SETTINGS);
      setDraft(toDraft(data.data));
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load the shipping settings.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const regionZone = useMemo(
    () => Object.fromEntries((draft?.regions || []).map((r) => [r.code, r.zone_code])),
    [draft?.regions]
  );

  const patch = (list, index, changes) => setDraft((d) => ({
    ...d,
    [list]: d[list].map((row, i) => (i === index ? { ...row, ...changes } : row)),
  }));
  const patchRate = (zoneIndex, rateIndex, fee) => setDraft((d) => ({
    ...d,
    zones: d.zones.map((z, i) => (i === zoneIndex
      ? { ...z, rates: z.rates.map((r, j) => (j === rateIndex ? { ...r, fee } : r)) }
      : z)),
  }));

  const handleSave = () => run(async () => {
    const problem = draftProblem(draft);
    if (problem) { showToast(problem, 'warning'); return; }
    try {
      const { data } = await api.put(SHIPPING.SETTINGS, toPayload(draft));
      setDraft(toDraft(data.data));
      showToast(data.message || 'Shipping settings saved', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save the shipping settings', 'error');
    }
  });

  if (loadError) {
    return (
      <div className="page-enter">
        <PageHeader title="Shipping" subtitle="Store shipping fees and delivery times." />
        <Card>
          <p className="text-sm text-red-700">{loadError}</p>
          <Button color="light" onClick={load} className="w-fit">Try again</Button>
        </Card>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="page-enter space-y-3">
        <div className="skeleton h-10 w-48 rounded" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    );
  }

  const brackets = bracketLabels(draft.zones[0]?.rates || []);
  const filter = provinceFilter.trim().toLowerCase();
  const provinces = draft.provinces
    .map((p, index) => ({ ...p, index }))
    .filter((p) => !filter || p.name.toLowerCase().includes(filter));

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Shipping"
        subtitle="Store shipping fee by cart weight and the buyer's zone, and how many days delivery takes."
      >
        <Button color="success" onClick={handleSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</Button>
      </PageHeader>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)]">
        <HiInformationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-500" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Checkout adds up the product weights, picks the bracket (exactly 3 kg is in the first one) and the delivery tier
          counted from where the parcel leaves: the same region is local, then the same island group, then one or two island
          groups away; Island and Palawan provinces have their own rows. From Caloocan and Tycoon this is exactly the proposal&apos;s
          NCR / Luzon / Visayas / Mindanao table, and a Stockist&apos;s nearby buyers pay the local rate. Orders keep the fee they were
          charged; a change here applies to new orders only. Delivery days are calendar days, counted again from the day payment
          is confirmed.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-[var(--dark-text)]">Fees and delivery days</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">
                <th className="py-2 pr-3">Delivery tier</th>
                {brackets.map((label) => <th key={label} className="py-2 pr-3">{label} (₱)</th>)}
                <th className="py-2 pr-3">Delivery days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
              {draft.zones.map((zone, zi) => (
                <tr key={zone.code}>
                  <td className="py-2 pr-3 font-semibold text-gray-900 dark:text-[var(--dark-text)]">{zone.name}</td>
                  {zone.rates.map((rate, ri) => (
                    <td key={rate.max_weight_grams} className="py-2 pr-3">
                      <TextInput
                        sizing="sm" type="number" min="0" step="1" className={numberCell}
                        aria-label={`${zone.name} ${brackets[ri]} fee`}
                        value={rate.fee} onChange={(e) => patchRate(zi, ri, e.target.value)} disabled={submitting}
                      />
                    </td>
                  ))}
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <TextInput
                        sizing="sm" type="number" min="0" max="60" className="w-16" aria-label={`${zone.name} earliest day`}
                        value={zone.eta_min_days} onChange={(e) => patch('zones', zi, { eta_min_days: e.target.value })} disabled={submitting}
                      />
                      <span className="text-gray-500">to</span>
                      <TextInput
                        sizing="sm" type="number" min="0" max="60" className="w-16" aria-label={`${zone.name} latest day`}
                        value={zone.eta_max_days} onChange={(e) => patch('zones', zi, { eta_max_days: e.target.value })} disabled={submitting}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">
          Example: up to 3 kg within the same region (e.g. Caloocan to Quezon City) costs {formatCurrency(Number(draft.zones.find((z) => z.code === 'NCR')?.rates[0]?.fee || 0))}.
        </p>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[var(--dark-text)]">Island group of each region</h2>
          <div className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
            {draft.regions.map((region, i) => (
              <div key={region.code} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-gray-800 dark:text-[var(--dark-text)]">{region.name}</span>
                <Select
                  sizing="sm" className="w-44" aria-label={`${region.name} island group`} disabled={submitting}
                  value={region.zone_code || ''} onChange={(e) => patch('regions', i, { zone_code: e.target.value })}
                >
                  <option value="" disabled>Choose an island group</option>
                  {Object.entries(ISLAND_GROUP_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-[var(--dark-text)]">Provinces with their own zone</h2>
          <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">
            A province follows its region unless you mark it here: Island provinces and Palawan (sea crossing), or another island group.
          </p>
          <TextInput sizing="sm" placeholder="Find a province" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} aria-label="Find a province" />
          <div className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto dark:divide-[var(--dark-border)]">
            {provinces.map((province) => (
              <div key={province.code} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-gray-800 dark:text-[var(--dark-text)]">{province.name}</span>
                <Select
                  sizing="sm" className="w-52" aria-label={`${province.name} zone`} disabled={submitting}
                  value={province.zone_code} onChange={(e) => patch('provinces', province.index, { zone_code: e.target.value })}
                >
                  <option value="">Follows region ({ISLAND_GROUP_LABELS[regionZone[province.region_code]] || 'none'})</option>
                  {Object.entries(ISLAND_GROUP_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  {draft.zones.filter((z) => !ISLAND_GROUP_LABELS[z.code] && z.code !== 'NCR').map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-[var(--dark-text)]">Product weights</h2>
        <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">Weight of one unit as packed. A product without a weight cannot be checked out.</p>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {draft.products.map((product, i) => (
            <div key={product.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-sm text-gray-800 dark:text-[var(--dark-text)]">
                {product.name} <span className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{product.sku}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <TextInput
                  sizing="sm" type="number" min="1" step="1" className={numberCell} aria-label={`${product.name} weight in grams`}
                  value={product.weight_grams} onChange={(e) => patch('products', i, { weight_grams: e.target.value })} disabled={submitting}
                />
                <span className="text-sm text-gray-500">g</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button color="success" onClick={handleSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</Button>
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
