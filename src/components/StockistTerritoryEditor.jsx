import { useEffect, useState } from 'react';
import { Button } from 'flowbite-react';
import { HiOutlineX, HiOutlineMap } from 'react-icons/hi';
import api from '@/services/api';
import { LOCATIONS, TERRITORIES } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { FIELD_CLASSES } from '@/components/formFieldClasses';

// Choice for cities that belong to no province; it is never saved as an area.
const INDEPENDENT = '__independent__';
const areaKey = (a) => `${a.area_type}:${a.area_code}`;
const areaLabel = (a) => (a.area_type === 'province'
  ? `${a.area_name} · whole province`
  : `${a.area_name}${a.province_name ? ` · in ${a.province_name}` : ''}`);

/**
 * Super Admin: the provinces and cities whose store orders this Stockist fulfils (management, 2026-10-08).
 * Buyers outside every territory, orders the Stockist cannot fill from stock, and affiliate-link orders go
 * to Caloocan or Tycoon. Edits stay in a draft until Save, which sends the whole list at once.
 */
export default function StockistTerritoryEditor({ partnerId }) {
  const [saved, setSaved] = useState([]);
  const [draft, setDraft] = useState([]);
  const [suggested, setSuggested] = useState(null);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [pick, setPick] = useState({ region: '', province: '', city: '' });
  const saving = useSubmitGuard();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(TERRITORIES.BY_PARTNER(partnerId))
      .then(({ data }) => {
        if (!active) return;
        setSaved(data.data.areas);
        setDraft(data.data.areas);
        setSuggested(data.data.suggested);
        setAllowed(data.data.can_have_territory);
      })
      .catch(() => active && setError('Could not load the territory.'))
      .finally(() => active && setLoading(false));
    api.get(LOCATIONS.REGIONS).then(({ data }) => active && setRegions(data.data || [])).catch(() => {});
    return () => { active = false; };
  }, [partnerId]);

  // Region -> provinces, plus cities that belong to no province (all of Metro Manila, and places like Cebu
  // City), offered as one extra choice; province -> its cities.
  const [independent, setIndependent] = useState(null);
  useEffect(() => {
    setProvinces([]); setCities([]); setIndependent(null);
    if (!pick.region) return;
    api.get(LOCATIONS.PROVINCES, { params: { region: pick.region } }).then(({ data }) => {
      const result = data.data || {};
      setProvinces(result.provinces || []);
      if (result.independent_cities > 0) {
        setIndependent(result.independent_label || 'Cities outside a province');
        if (!(result.provinces || []).length) setPick((p) => ({ ...p, province: INDEPENDENT }));
      }
    }).catch(() => {});
  }, [pick.region]);
  useEffect(() => {
    if (!pick.province) return;
    setCities([]);
    const params = pick.province === INDEPENDENT ? { region: pick.region } : { province: pick.province };
    api.get(LOCATIONS.CITIES, { params })
      .then(({ data }) => setCities((data.data || []).filter((c) => pick.province !== INDEPENDENT || !c.province_code)))
      .catch(() => {});
  }, [pick.province, pick.region]);

  if (loading) return <p className="text-sm text-gray-600 dark:text-[var(--dark-muted)]">Loading territory…</p>;
  if (!allowed) return null;

  const add = (area) => {
    setMessage('');
    setDraft((list) => (list.some((a) => areaKey(a) === areaKey(area)) ? list : [...list, area]));
  };
  const remove = (area) => { setMessage(''); setDraft((list) => list.filter((a) => areaKey(a) !== areaKey(area))); };
  const province = provinces.find((p) => p.code === pick.province); // undefined for the independent choice
  const city = cities.find((c) => c.code === pick.city);
  const dirty = draft.map(areaKey).sort().join() !== saved.map(areaKey).sort().join();

  const save = () => saving.run(async () => {
    setError(''); setMessage('');
    try {
      const { data } = await api.put(TERRITORIES.BY_PARTNER(partnerId), {
        areas: draft.map(({ area_type, area_code }) => ({ area_type, area_code })),
      });
      setSaved(data.data.areas);
      setDraft(data.data.areas);
      setMessage('Territory saved. New store orders from these areas go to this Stockist.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save the territory. Please try again.');
    }
  });

  return (
    <section className="space-y-3 border-t border-[var(--ncdms-hairline,#ece3d6)] pt-4 dark:border-white/10" aria-labelledby="territory-title">
      <div>
        <h3 id="territory-title" className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
          <HiOutlineMap className="h-4 w-4" aria-hidden="true" /> Store-order territory
        </h3>
        <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">
          Store orders from these areas go to this Stockist when it has the stock. Everything else goes to Caloocan or Tycoon.
        </p>
      </div>

      {draft.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-white/5 dark:text-[var(--dark-text)]">
          No territory yet, so Caloocan or Tycoon fulfil this area.
          {suggested ? (
            <> Suggested from their address: <strong>{suggested.area_name}</strong>.{' '}
              <button type="button" className="font-semibold text-amber-800 underline dark:text-amber-300" onClick={() => add(suggested)}>Use it</button>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
          {draft.map((area) => (
            <li key={areaKey(area)} className="flex items-center justify-between gap-3 py-2 text-sm text-gray-900 dark:text-[var(--dark-text)]">
              <span>{areaLabel(area)}</span>
              <button type="button" onClick={() => remove(area)} disabled={saving.submitting} aria-label={`Remove ${area.area_name}`}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-gray-300 px-3 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:text-[var(--dark-text)] dark:hover:bg-white/5">
                <HiOutlineX className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="Region" className={FIELD_CLASSES.input} value={pick.region}
          onChange={(e) => setPick({ region: e.target.value, province: '', city: '' })}>
          <option value="">Region</option>
          {regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </select>
        <select aria-label="Province" className={FIELD_CLASSES.input} value={pick.province} disabled={provinces.length === 0 && !independent}
          onChange={(e) => setPick((p) => ({ ...p, province: e.target.value, city: '' }))}>
          <option value="">Province</option>
          {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          {independent ? <option value={INDEPENDENT}>{independent}</option> : null}
        </select>
        <select aria-label="City or municipality" className={FIELD_CLASSES.input} value={pick.city} disabled={cities.length === 0}
          onChange={(e) => setPick((p) => ({ ...p, city: e.target.value }))}>
          <option value="">City (optional)</option>
          {cities.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="xs" color="light" disabled={!province}
          onClick={() => add({ area_type: 'province', area_code: province.code, area_name: province.name })}>
          Add whole province
        </Button>
        <Button size="xs" color="light" disabled={!city}
          onClick={() => add({ area_type: 'city', area_code: city.code, area_name: city.name, province_name: province?.name })}>
          Add this city only
        </Button>
        <Button size="xs" color="warning" disabled={!dirty || saving.submitting} onClick={save}>
          {saving.submitting ? 'Saving…' : 'Save territory'}
        </Button>
      </div>
      {message ? <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300" role="status">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
    </section>
  );
}
