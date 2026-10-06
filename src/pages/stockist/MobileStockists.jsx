import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import { Button } from 'flowbite-react';
import { HiPlus, HiPencil, HiSearch } from 'react-icons/hi';
import { FiUser } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import ResponsiveList from '@/components/ResponsiveList';
import AddressPicker from '@/components/AddressPicker';
import RequiredMark from '@/components/RequiredMark';
import { FIELD_CLASSES } from '@/components/formFieldClasses';
import { ToastContainer, useToast } from '@/components/Toast';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import api from '@/services/api';
import { MOBILE_STOCKISTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import {
  EMPTY_PLACE, addressFromRecord, addressToPayload, addressPickerProblems, hasLegacyAddressOnly,
} from '@/utils/addressValue';

const EMPTY_FORM = {
  name: '', email: '', phone: '', status: 'active', password: '', place: EMPTY_PLACE,
};

/**
 * Add / edit a Mobile Stockist. Mounted only while open so each opening starts from a fresh form.
 * The address is entered like checkout (PSGC pickers, street, postal code) with a map pin; the pin
 * is how public and mobile orders find the nearest Stockist.
 */
function MobileStockistFormModal({ item, onClose, onSaved }) {
  const editing = Boolean(item);
  const [form, setForm] = useState(() => (item ? {
    name: item.name || '', email: item.email || '', phone: item.phone || '',
    status: item.status || 'active', password: '', place: addressFromRecord(item),
  } : EMPTY_FORM));
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const { submitting, run } = useSubmitGuard();

  const legacyOnly = hasLegacyAddressOnly(item);
  const legacyText = legacyOnly ? (item.address_display || item.address) : '';
  const problems = addressPickerProblems(form.place, { withPin: true, keepLegacy: legacyOnly });
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = () => run(async () => {
    setAttempted(true);
    setError('');
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    if (!editing && form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (problems.includes('pin')) { setError('Move the map pin inside the Philippines before saving.'); return; }
    if (problems.length > 0) { setError('Complete the address: choose the barangay and enter the street.'); return; }
    const common = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      ...addressToPayload(form.place, { withPin: true }),
    };
    try {
      if (editing) {
        await api.put(MOBILE_STOCKISTS.UPDATE(item.id), { ...common, status: form.status });
        onSaved('Mobile Stockist updated');
      } else {
        await api.post(MOBILE_STOCKISTS.CREATE, { ...common, email: form.email.trim(), password: form.password });
        onSaved('Mobile Stockist created');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save');
    }
  });

  const text = (id, label, key, { type = 'text', required = false, disabled = false, ...rest } = {}) => (
    <div>
      <label htmlFor={id} className={FIELD_CLASSES.label}>{label}{required && <RequiredMark />}</label>
      <input
        id={id}
        type={type}
        className={FIELD_CLASSES.input}
        value={form[key]}
        onChange={setField(key)}
        disabled={submitting || disabled}
        aria-invalid={attempted && required && !String(form[key]).trim() ? true : undefined}
        {...rest}
      />
    </div>
  );

  return (
    <Modal show onClose={submitting ? undefined : onClose} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
      <ModalHeader>{editing ? 'Edit Mobile Stockist' : 'Add Mobile Stockist'}</ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {text('ms_name', 'Full Name', 'name', { required: true, maxLength: 150 })}
          {text('ms_email', 'Email Address', 'email', { type: 'email', required: true, maxLength: 150, disabled: editing })}
          {text('ms_phone', 'Phone Number', 'phone', { type: 'tel', inputMode: 'tel', maxLength: 30 })}
          {editing ? (
            <div>
              <label htmlFor="ms_status" className={FIELD_CLASSES.label}>Status</label>
              <select id="ms_status" className={FIELD_CLASSES.input} value={form.status} onChange={setField('status')} disabled={submitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          ) : text('ms_password', 'Password', 'password', { type: 'password', required: true, autoComplete: 'new-password' })}
          <div className="sm:col-span-2">
            <AddressPicker
              value={form.place}
              onChange={(place) => setForm((f) => ({ ...f, place }))}
              legacyText={legacyText}
              showInvalid={attempted && problems.some((p) => p !== 'pin')}
              disabled={submitting}
              idPrefix="msAddress"
              mapLabel="Pin the Mobile Stockist's location"
            />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button color="warning" onClick={save} disabled={submitting} className="min-h-[44px] md:min-h-0">
          {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Account'}
        </Button>
        <Button color="gray" onClick={onClose} disabled={submitting} className="min-h-[44px] md:min-h-0">Cancel</Button>
      </ModalFooter>
    </Modal>
  );
}

export default function StockistMobileStockists() {
  const { toasts, showToast, dismiss } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // null = form closed, 'new' = add, a record = edit.
  const [formTarget, setFormTarget] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(MOBILE_STOCKISTS.LIST, {
        params: { page, limit: 20, search },
      });
      const list = data.data?.items || data.data || [];
      setItems(Array.isArray(list) ? list : []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      showToast('Failed to load mobile stockists', 'error');
    } finally {
      setLoading(false);
    }
    // showToast is recreated on each render; the list reloads only when the page or search changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSaved = (message) => {
    showToast(message, 'success');
    setFormTarget(null);
    fetchItems();
  };

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">Mobile Stockists</h1>
          <p className="text-sm text-gray-600 dark:text-[var(--dark-muted)] mt-0.5">Manage Mobile Stockists under your territory</p>
        </div>
        <Button color="warning" onClick={() => setFormTarget('new')} className="min-h-[44px] shrink-0 md:min-h-0">
          <HiPlus className="mr-2 w-4 h-4" />
          Add Mobile Stockist
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          aria-label="Search Mobile Stockists"
          className={`${FIELD_CLASSES.input} pl-9`}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-gray-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted">
            <FiUser size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No Mobile Stockists match your search.' : 'No Mobile Stockists yet. Add one so they can order from you.'}</p>
            {!search && (
              <button type="button" onClick={() => setFormTarget('new')} className="brand-btn brand-btn--primary mt-3 min-h-[44px]">
                Add Mobile Stockist
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 md:px-0">
            <ResponsiveList
              items={items}
              getKey={(item) => item.id}
              loading={loading}
              emptyLabel="No Mobile Stockists yet"
              onOpen={setFormTarget}
              row={(item) => ({
                title: item.name,
                subtitle: [item.email, item.address_display || item.address].filter(Boolean).join(' · '),
                status: <StatusBadge status={item.status || 'active'} />,
              })}
            >
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[var(--dark-card)] border-b border-gray-100 dark:border-[var(--dark-border)]">
                      <tr>
                        {['Name', 'Email', 'Phone', 'Address', 'Status', 'Joined', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-[var(--dark-muted)] uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className="border-b border-gray-50 dark:border-[var(--dark-border)] hover:bg-amber-50/30 dark:hover:bg-[var(--dark-card2)] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 dark:text-[var(--dark-text)]">{item.name}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-sm">{item.email}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-sm">{item.phone || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-sm max-w-[260px] truncate" title={item.address_display || item.address}>{item.address_display || item.address || '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={item.status || 'active'} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-[var(--dark-muted)]">{formatDate(item.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setFormTarget(item)}
                                className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                              >
                                <HiPencil className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ResponsiveList>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[var(--dark-border)]">
                <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button size="xs" color="gray" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="xs" color="gray" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / edit: mounted only while open so each opening starts from a fresh form */}
      {formTarget && (
        <MobileStockistFormModal
          item={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
