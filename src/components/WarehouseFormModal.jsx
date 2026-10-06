import { useState } from 'react';
import { Button } from 'flowbite-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import AddressPicker from '@/components/AddressPicker';
import RequiredMark from '@/components/RequiredMark';
import { FIELD_CLASSES } from '@/components/formFieldClasses';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import api from '@/services/api';
import { WAREHOUSES } from '@/services/endpoints';
import {
  EMPTY_PLACE, addressFromRecord, addressToPayload, addressPickerProblems, hasLegacyAddressOnly,
} from '@/utils/addressValue';

const DEFAULT_CAPACITY = 100000;

/**
 * Add / edit a warehouse. Shared by the Super Admin and Stockist portals so both enter an address
 * the same way (AddressPicker: PSGC pickers + street + postal code + map pin).
 *
 * - `warehouse` null = add, a list record = edit (its saved address parts prefill the pickers).
 * - `createType` is sent only when adding ('manufacturer' for the main warehouse); the server picks
 *   the type for Stockists and never lets one change it.
 * - `onSaved(message)` runs after a successful save; the caller refreshes its list and closes.
 *
 * Mount it only while open (`{open && <WarehouseFormModal … />}`) so each opening starts from a
 * fresh form.
 */
export default function WarehouseFormModal({ warehouse, createType, onClose, onSaved }) {
  const editing = Boolean(warehouse);
  const [form, setForm] = useState(() => ({
    name: warehouse?.name || '',
    capacity: warehouse?.capacity_total ? String(warehouse.capacity_total) : '',
    managerName: warehouse?.manager_name || '',
    managerPhone: warehouse?.manager_phone || '',
    place: warehouse ? addressFromRecord(warehouse) : EMPTY_PLACE,
  }));
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const { submitting, run } = useSubmitGuard();

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPlace = (place) => setForm((f) => ({ ...f, place }));

  const legacyOnly = hasLegacyAddressOnly(warehouse);
  const problems = addressPickerProblems(form.place, { withPin: true, keepLegacy: legacyOnly });
  const missing = [!form.name.trim() && 'Warehouse name', !form.managerName.trim() && 'Manager name'].filter(Boolean);

  const save = () => run(async () => {
    setAttempted(true);
    setError('');
    if (missing.length > 0) { setError(`${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} required.`); return; }
    if (problems.includes('pin')) { setError('Move the map pin inside the Philippines before saving.'); return; }
    if (problems.length > 0) { setError('Complete the address: choose the barangay and enter the street.'); return; }
    const body = {
      name: form.name.trim(),
      capacity_total: Number(form.capacity) || DEFAULT_CAPACITY,
      manager_name: form.managerName.trim(),
      manager_phone: form.managerPhone.trim() || null,
      ...addressToPayload(form.place, { withPin: true }),
    };
    try {
      if (editing) {
        await api.put(WAREHOUSES.UPDATE(warehouse.id), body);
        onSaved('Warehouse updated');
      } else {
        await api.post(WAREHOUSES.CREATE, { ...body, ...(createType ? { type: createType } : {}) });
        onSaved('Warehouse added');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the warehouse. Please try again.');
    }
  });

  return (
    <Modal show onClose={submitting ? undefined : onClose} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
      <ModalHeader>{editing ? `Edit Warehouse — ${warehouse.name}` : 'Add Warehouse'}</ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="wh_name" className={FIELD_CLASSES.label}>Warehouse Name<RequiredMark /></label>
            <input id="wh_name" className={FIELD_CLASSES.input} value={form.name} onChange={setField('name')} placeholder="Metro Manila Hub" maxLength={150} disabled={submitting} aria-invalid={attempted && !form.name.trim() ? true : undefined} />
          </div>
          <div>
            <label htmlFor="wh_manager_name" className={FIELD_CLASSES.label}>Manager Name<RequiredMark /></label>
            <input id="wh_manager_name" className={FIELD_CLASSES.input} value={form.managerName} onChange={setField('managerName')} placeholder="Juan Dela Cruz" maxLength={150} disabled={submitting} aria-invalid={attempted && !form.managerName.trim() ? true : undefined} />
          </div>
          <div>
            <label htmlFor="wh_manager_phone" className={FIELD_CLASSES.label}>Manager Phone</label>
            <input id="wh_manager_phone" className={FIELD_CLASSES.input} type="tel" inputMode="tel" value={form.managerPhone} onChange={setField('managerPhone')} placeholder="09xxxxxxxxx" maxLength={30} disabled={submitting} />
          </div>
          <div>
            <label htmlFor="wh_capacity" className={FIELD_CLASSES.label}>Capacity (units)</label>
            <input id="wh_capacity" className={FIELD_CLASSES.input} type="number" inputMode="numeric" min="1" value={form.capacity} onChange={setField('capacity')} placeholder="100000" disabled={submitting} />
          </div>
          <div className="sm:col-span-2">
            <AddressPicker
              value={form.place}
              onChange={setPlace}
              legacyText={legacyOnly ? (warehouse.address_display || warehouse.location) : ''}
              showInvalid={attempted && problems.some((p) => p !== 'pin')}
              disabled={submitting}
              idPrefix="whAddress"
              mapLabel="Pin the warehouse on the map"
            />
            <p className="mt-2 text-xs text-gray-600 dark:text-[var(--dark-muted)]">
              Delivery routes start or end at this pin, and store orders go to the nearest fulfillment center by it.
            </p>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button color="warning" onClick={save} disabled={submitting} className="min-h-[44px] md:min-h-0">
          {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Warehouse'}
        </Button>
        <Button color="gray" onClick={onClose} disabled={submitting} className="min-h-[44px] md:min-h-0">Cancel</Button>
      </ModalFooter>
    </Modal>
  );
}
