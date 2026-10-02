import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { LOCATIONS } from '@/services/endpoints';
import { INDEPENDENT_PROVINCE } from '@/utils/publicCustomer';

// One request per list for the whole visit: the server's lists change a few times a year at most.
const listCache = new Map();
function fetchList(url, params) {
  const key = `${url}?${new URLSearchParams(params)}`;
  if (!listCache.has(key)) {
    listCache.set(key, api.get(url, { params }).then(({ data }) => data.data).catch((err) => {
      listCache.delete(key);
      throw err;
    }));
  }
  return listCache.get(key);
}

/** Loads one picker list; `request` is null until the parent choice is made. */
function useLocationList(request) {
  const [state, setState] = useState({ data: null, loading: false, error: '' });
  const [attempt, setAttempt] = useState(0);
  const key = request ? `${request.url}?${new URLSearchParams(request.params)}` : '';

  useEffect(() => {
    if (!request) { setState({ data: null, loading: false, error: '' }); return undefined; }
    let active = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetchList(request.url, request.params)
      .then((data) => { if (active) setState({ data, loading: false, error: '' }); })
      .catch(() => { if (active) setState({ data: null, loading: false, error: 'Could not load this list.' }); });
    return () => { active = false; };
    // `key` captures the request; the object itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

const nameOf = (list, code) => list?.find((item) => item.code === code)?.name || '';

/**
 * Region → province → city/municipality → barangay pickers (official PSGC list), plus the street line
 * and postal code. Native selects on purpose: phones open their own full-screen pickers for them.
 *
 * `value` is EMPTY_ADDRESS-shaped; `onChange` receives the next value. `onPlaceChange` receives the
 * chosen place names ({ barangay, city, province, region }) so the map can move to them.
 * `classes` lets each page apply its own field styles: { field, label, input, hint }.
 */
export default function PhAddressFields({ value, onChange, onPlaceChange, invalid = {}, disabled = false, classes = {}, idPrefix = 'addr' }) {
  const regions = useLocationList({ url: LOCATIONS.REGIONS, params: {} });
  const provinces = useLocationList(value.regionCode ? { url: LOCATIONS.PROVINCES, params: { region: value.regionCode } } : null);
  const cityRequest = !value.provinceKey ? null : value.provinceKey === INDEPENDENT_PROVINCE
    ? { url: LOCATIONS.CITIES, params: { region: value.regionCode } }
    : { url: LOCATIONS.CITIES, params: { province: value.provinceKey } };
  const cities = useLocationList(cityRequest);
  const barangays = useLocationList(value.cityCode ? { url: LOCATIONS.BARANGAYS, params: { city: value.cityCode } } : null);

  const provinceOptions = useMemo(() => {
    if (!provinces.data) return [];
    const options = provinces.data.provinces.map((p) => ({ code: p.code, name: p.name }));
    if (provinces.data.independent_cities > 0) {
      options.unshift({ code: INDEPENDENT_PROVINCE, name: provinces.data.independent_label });
    }
    return options;
  }, [provinces.data]);

  // Metro Manila has no provinces: its one choice is picked for the buyer.
  useEffect(() => {
    if (!value.provinceKey && provinceOptions.length === 1) {
      onChange({ ...value, provinceKey: provinceOptions[0].code });
    }
  }, [provinceOptions, value, onChange]);

  const regionName = nameOf(regions.data, value.regionCode);
  const provinceName = value.provinceKey === INDEPENDENT_PROVINCE ? '' : nameOf(provinceOptions, value.provinceKey);
  const cityName = nameOf(cities.data, value.cityCode);
  const barangayName = nameOf(barangays.data, value.barangayCode);
  useEffect(() => {
    if (onPlaceChange) {
      onPlaceChange(cityName ? { barangay: barangayName, city: cityName, province: provinceName, region: regionName } : null);
    }
  }, [barangayName, cityName, provinceName, regionName, onPlaceChange]);

  // Changing a level clears every level below it.
  const choose = (level) => (e) => {
    const code = e.target.value;
    if (level === 'region') onChange({ ...value, regionCode: code, provinceKey: '', cityCode: '', barangayCode: '' });
    if (level === 'province') onChange({ ...value, provinceKey: code, cityCode: '', barangayCode: '' });
    if (level === 'city') onChange({ ...value, cityCode: code, barangayCode: '' });
    if (level === 'barangay') onChange({ ...value, barangayCode: code });
  };
  const setText = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  const select = ({ id, label, level, current, list, placeholder, enabled, isInvalid }) => (
    <div className={classes.field}>
      <label htmlFor={id} className={classes.label}>{label}<span aria-hidden="true"> *</span></label>
      <select
        id={id}
        className={classes.input}
        value={current}
        onChange={choose(level)}
        disabled={disabled || !enabled || list.loading}
        aria-invalid={isInvalid || undefined}
        required
      >
        <option value="">{list.loading ? 'Loading…' : placeholder}</option>
        {(level === 'province' ? provinceOptions : list.data || []).map((item) => (
          <option key={item.code} value={item.code}>{item.name}</option>
        ))}
      </select>
      {list.error && (
        <p className={classes.hint} role="alert">
          {list.error} <button type="button" className="font-semibold underline" onClick={list.retry}>Try again</button>
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {select({ id: `${idPrefix}-region`, label: 'Region', level: 'region', current: value.regionCode, list: regions, placeholder: 'Choose region', enabled: true })}
      {select({ id: `${idPrefix}-province`, label: 'Province', level: 'province', current: value.provinceKey, list: provinces, placeholder: 'Choose province', enabled: !!value.regionCode })}
      {select({ id: `${idPrefix}-city`, label: 'City / Municipality', level: 'city', current: value.cityCode, list: cities, placeholder: 'Choose city or municipality', enabled: !!value.provinceKey })}
      {select({ id: `${idPrefix}-barangay`, label: 'Barangay', level: 'barangay', current: value.barangayCode, list: barangays, placeholder: 'Choose barangay', enabled: !!value.cityCode, isInvalid: invalid.barangay })}
      <div className={`${classes.field || ''} sm:col-span-2`}>
        <label htmlFor={`${idPrefix}-line`} className={classes.label}>House no., street, subdivision<span aria-hidden="true"> *</span></label>
        <input
          id={`${idPrefix}-line`}
          className={classes.input}
          autoComplete="address-line1"
          value={value.line}
          onChange={setText('line')}
          disabled={disabled}
          aria-invalid={invalid.line || undefined}
          maxLength={255}
          placeholder="Blk 4 Lot 12, Mabini St., Villa Verde Subd."
        />
      </div>
      <div className={classes.field}>
        <label htmlFor={`${idPrefix}-postal`} className={classes.label}>Postal code</label>
        <input
          id={`${idPrefix}-postal`}
          className={classes.input}
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={4}
          value={value.postalCode}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          disabled={disabled}
          aria-invalid={invalid.postalCode || undefined}
          placeholder="1400"
        />
      </div>
    </div>
  );
}
