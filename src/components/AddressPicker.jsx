import { useCallback, useState } from 'react';
import PhAddressFields from '@/components/PhAddressFields';
import LocationPicker from '@/components/LocationPicker';
import { FIELD_CLASSES } from '@/components/formFieldClasses';
import { geocodeQueries, addressProblems } from '@/utils/publicCustomer';


/**
 * The one address entry used across the system, the same as checkout: PSGC region → province →
 * city/municipality → barangay, a street line, a 4-digit postal code and, optionally, a map pin.
 *
 * `value` is `{ regionCode, provinceKey, cityCode, barangayCode, line, postalCode, lat, lng }`
 * (EMPTY_PLACE from utils/addressValue); `onChange` receives the next value. The pin stays on the
 * value as a number pair, or null/null when none is set.
 *
 * - `withMap={false}` hides the map, for records that store no coordinates (Stockist accounts).
 * - `legacyText` is the old single-text address of a record saved before the parts existed; it is
 *   shown as a hint until the parts are chosen.
 * - `showInvalid` highlights missing parts; pass it after the first save attempt. A pin outside the
 *   Philippines is always flagged (utils/addressValue addressPickerProblems blocks the save).
 */
export default function AddressPicker({
  value,
  onChange,
  withMap = true,
  legacyText = '',
  showInvalid = false,
  disabled = false,
  idPrefix = 'addr',
  mapLabel = 'Pin the location on the map',
}) {
  const [place, setPlace] = useState(null);
  // The map follows the pickers only after the user changes them: opening a saved record must keep
  // its saved pin instead of jumping to the barangay centre.
  const [pickersChanged, setPickersChanged] = useState(false);

  const handleFieldsChange = useCallback((next) => {
    if (next.barangayCode !== value.barangayCode || next.cityCode !== value.cityCode) setPickersChanged(true);
    onChange(next);
  }, [onChange, value.barangayCode, value.cityCode]);

  const problems = showInvalid ? addressProblems(value) : [];
  const invalid = { barangay: problems.includes('barangay'), line: problems.includes('line'), postalCode: problems.includes('postalCode') };
  const showLegacyHint = Boolean(legacyText) && !value.barangayCode;

  return (
    <div className="space-y-4">
      {showLegacyHint && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          Saved address: <span className="font-semibold">{legacyText}</span>. Choose the region, province, city and barangay below to
          replace it with a complete address.
        </p>
      )}
      <PhAddressFields
        value={value}
        onChange={handleFieldsChange}
        onPlaceChange={setPlace}
        invalid={invalid}
        disabled={disabled}
        classes={FIELD_CLASSES}
        idPrefix={idPrefix}
      />
      {withMap && (
        <LocationPicker
          value={value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null}
          onChange={(point) => onChange({ ...value, lat: point.lat, lng: point.lng })}
          searchQueries={pickersChanged ? geocodeQueries(place) : []}
          label={mapLabel}
          emptyHint="Choose the barangay above and the pin drops there, then drag it to the exact spot. You can also tap the map."
          showConsentHint={false}
        />
      )}
    </div>
  );
}
