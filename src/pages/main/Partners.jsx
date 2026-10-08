import StockistTerritoryEditor from '@/components/StockistTerritoryEditor';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, Label, Pagination } from 'flowbite-react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineAdjustments,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import api from '@/services/api';
import { PARTNERS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import RequiredMark from '@/components/RequiredMark';
import ResponsiveList from '@/components/ResponsiveList';
import AddressPicker from '@/components/AddressPicker';
import { FIELD_CLASSES } from '@/components/formFieldClasses';
import { ToastContainer, useToast } from '@/components/Toast';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { CENTER_LEVEL } from '@/utils/partnerLevel';
import {
  EMPTY_PLACE, addressFromRecord, addressToPayload, addressPickerProblems, hasLegacyAddressOnly,
} from '@/utils/addressValue';

const EMPTY_FORM = {
  business_name: '', email: '', phone: '',
  stockist_level: 'city_stockist', parent_partner_id: '', discount_pct: '0',
  place: EMPTY_PLACE,
};

const LEVEL_LABELS = {
  provincial_stockist: 'Provincial',
  city_stockist: 'City',
  [CENTER_LEVEL]: 'Fulfillment Center',
};
const levelLabel = (level) => LEVEL_LABELS[level] || level?.replace(/_/g, ' ') || '—';

const isCenter = (partner) => partner.stockist_level === CENTER_LEVEL;

// Stockist accounts keep no map pin (their warehouses carry the coordinates that routing and
// nearest-Stockist assignment use), so the address form here has no map.
const WITH_PIN = false;

// Hoisted to module scope — stable identity prevents input focus loss on each keystroke.
function PartnerFormFields({ form, setForm, parents, editing, legacyText, attempted, disabled }) {
  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const field = (id, label, input, { required = false, span = false } = {}) => (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="mb-1">{label}{required && <RequiredMark />}</Label>
      {input}
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {field('pt_business_name', 'Business Name', (
        <input id="pt_business_name" className={FIELD_CLASSES.input} value={form.business_name} onChange={fld('business_name')} placeholder="Juan Store" maxLength={150} disabled={disabled} aria-invalid={attempted && !form.business_name.trim() ? true : undefined} />
      ), { required: true, span: true })}
      {field('pt_email', 'Email', (
        <input id="pt_email" type="email" className={FIELD_CLASSES.input} value={form.email} onChange={fld('email')} placeholder="juan@store.com" maxLength={150} disabled={disabled} aria-invalid={attempted && !form.email.trim() ? true : undefined} />
      ), { required: true })}
      {field('pt_phone', 'Phone', (
        <input id="pt_phone" type="tel" inputMode="tel" className={FIELD_CLASSES.input} value={form.phone} onChange={fld('phone')} placeholder="09xxxxxxxxx" maxLength={30} disabled={disabled} />
      ))}
      {field('pt_level', 'Level', (
        <select id="pt_level" className={FIELD_CLASSES.input} value={form.stockist_level} onChange={fld('stockist_level')} disabled={disabled || editing}>
          <option value="provincial_stockist">Provincial Stockist</option>
          <option value="city_stockist">City Stockist</option>
        </select>
      ))}
      {field('pt_discount', 'Discount %', (
        <input id="pt_discount" type="number" inputMode="decimal" min="0" max="100" step="0.1" className={FIELD_CLASSES.input} value={form.discount_pct} onChange={fld('discount_pct')} placeholder="0" disabled={disabled || editing} />
      ))}
      {form.stockist_level === 'city_stockist' && field('pt_parent', 'Parent Provincial Stockist', (
        <select id="pt_parent" className={FIELD_CLASSES.input} value={form.parent_partner_id} onChange={fld('parent_partner_id')} disabled={disabled}>
          <option value="">Select parent...</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}
        </select>
      ), { span: true })}
      <div className="sm:col-span-2">
        <AddressPicker
          value={form.place}
          onChange={(place) => setForm((f) => ({ ...f, place }))}
          withMap={WITH_PIN}
          legacyText={legacyText}
          showInvalid={attempted && addressPickerProblems(form.place, { withPin: WITH_PIN, keepLegacy: Boolean(legacyText) }).length > 0}
          disabled={disabled}
          idPrefix="ptAddress"
        />
      </div>
    </div>
  );
}

/**
 * Add / edit a Stockist. Mounted only while open so each opening starts from a fresh form. Level and
 * discount are fixed on edit (the discount has its own dialog; the level decides the login role).
 */
function PartnerFormModal({ partner, parents, onClose, onSaved }) {
  const editing = Boolean(partner);
  const [form, setForm] = useState(() => (partner ? {
    business_name: partner.business_name, email: partner.email, phone: partner.phone || '',
    stockist_level: partner.stockist_level, parent_partner_id: partner.parent_partner_id || '',
    discount_pct: String(partner.discount_pct ?? '0'),
    place: addressFromRecord(partner),
  } : EMPTY_FORM));
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const { submitting, run } = useSubmitGuard();

  const legacyOnly = hasLegacyAddressOnly(partner);
  const legacyText = legacyOnly ? (partner.address_display || partner.address) : '';

  const save = () => run(async () => {
    setAttempted(true);
    setError('');
    if (!form.business_name.trim() || !form.email.trim()) { setError('Business name and email are required.'); return; }
    if (addressPickerProblems(form.place, { withPin: WITH_PIN, keepLegacy: legacyOnly }).length > 0) {
      setError('Complete the address: choose the barangay and enter the street.');
      return;
    }
    const common = {
      business_name: form.business_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      parent_partner_id: form.stockist_level === 'city_stockist' ? form.parent_partner_id : '',
      ...addressToPayload(form.place, { withPin: WITH_PIN }),
    };
    try {
      if (editing) {
        await api.put(PARTNERS.UPDATE(partner.id), common);
        onSaved('Stockist updated');
      } else {
        await api.post(PARTNERS.CREATE, { ...common, stockist_level: form.stockist_level, discount_pct: Number(form.discount_pct) || 0 });
        onSaved('Stockist added');
      }
    } catch (err) {
      setError(err.response?.data?.message || (editing ? 'Update failed' : 'Failed to add stockist'));
    }
  });

  return (
    <Modal show onClose={submitting ? undefined : onClose} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
      <ModalHeader>{editing ? `Edit Stockist — ${partner.business_name}` : 'Add Stockist'}</ModalHeader>
      <ModalBody>
        <PartnerFormFields form={form} setForm={setForm} parents={parents} editing={editing} legacyText={legacyText} attempted={attempted} disabled={submitting} />
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button color="warning" onClick={save} disabled={submitting} className="min-h-[44px] md:min-h-0">
          {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Stockist'}
        </Button>
        <Button color="gray" onClick={onClose} disabled={submitting} className="min-h-[44px] md:min-h-0">Cancel</Button>
      </ModalFooter>
    </Modal>
  );
}

const rowFor = (partner, { onEdit, canAct }) => ({
  title: partner.business_name,
  subtitle: [levelLabel(partner.stockist_level), partner.address_display || partner.address].filter(Boolean).join(' · '),
  meta: isCenter(partner) ? null : `${partner.discount_pct ?? 0}%`,
  status: <StatusBadge status={partner.status} />,
  details: [
    ['Email', partner.email],
    ['Phone', partner.phone || '—'],
    ['Level', levelLabel(partner.stockist_level)],
    ['Address', partner.address_display || partner.address || '—'],
  ],
  action: canAct ? { label: 'Edit', onClick: () => onEdit(partner) } : null,
});

// Centers are company-run, so they have no discount, parent, or editable level.
// They are shown read-only and apart from the Stockist table.
function FulfillmentCentersCard({ centers, onSelect }) {
  return (
    <Card className="mb-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-strong">Fulfillment Centers</h2>
        <p className="text-sm text-muted">Company-run centers that fulfill public and Stockist orders.</p>
      </div>
      <ResponsiveList items={centers} getKey={(c) => c.id} onOpen={onSelect} row={(c) => rowFor(c, { canAct: false })}>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Center</TableHeadCell>
                <TableHeadCell>Address</TableHeadCell>
                <TableHeadCell>Phone</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {centers.map((center) => (
                <TableRow key={center.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => onSelect(center)}>
                  <TableCell className="font-medium text-gray-900 dark:text-[var(--dark-text)]">{center.business_name}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs">{center.address_display || center.address || '—'}</TableCell>
                  <TableCell className="text-xs">{center.phone || '—'}</TableCell>
                  <TableCell><StatusBadge status={center.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ResponsiveList>
    </Card>
  );
}

export default function Partners() {
  const { toasts, showToast, dismiss } = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [parents, setParents] = useState([]);

  // null = form closed, 'new' = add, a partner record = edit.
  const [formTarget, setFormTarget] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [discountVal, setDiscountVal] = useState('');
  const { submitting, run } = useSubmitGuard();

  const centers = partners.filter(isCenter);
  const stockists = partners.filter((p) => !isCenter(p));

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PARTNERS.LIST, {
        params: { page, search: search || undefined, limit: 15 },
      });
      setPartners(data.data || []);
      setTotalPages(data.pagination?.totalPages || data.pagination?.pages || 1);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  useEffect(() => {
    api.get(PARTNERS.LIST, { params: { limit: 100, stockist_level: 'provincial_stockist' } })
      .then((r) => setParents(r.data.data || []))
      .catch(() => {});
  }, []);

  const openAdd = () => setFormTarget('new');
  const openEdit = (p) => { setSelected(p); setFormTarget(p); };
  const openDetail = (p) => { setSelected(p); setShowDetailModal(true); };
  const openDiscount = (p) => {
    setSelected(p);
    setDiscountVal(String(p.discount_pct ?? 0));
    setShowDiscountModal(true);
  };
  const handleSaved = (message) => {
    showToast(message, 'success');
    setFormTarget(null);
    fetchPartners();
  };

  const handleDiscount = () => run(async () => {
    try {
      await api.patch(PARTNERS.UPDATE_DISCOUNT(selected.id), { discount_pct: Number(discountVal) });
      showToast('Discount updated', 'success');
      setShowDiscountModal(false);
      fetchPartners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update discount', 'error');
    }
  });

  const levelBadge = (level) => {
    if (level === 'provincial_stockist') return <span className="badge-approved">Provincial</span>;
    if (level === 'city_stockist') return <span className="badge-delivering">City</span>;
    if (level === CENTER_LEVEL) return <span className="badge-active">Fulfillment Center</span>;
    return <span className="badge-inactive">{level?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Stockists"
        subtitle="Manage provincial and city Stockist accounts and their discounts"
        actions={[{ label: 'Add Stockist', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      {!loading && centers.length > 0 && <FulfillmentCentersCard centers={centers} onSelect={openDetail} />}

      <Card>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 md:max-w-xs">
            <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Search stockists"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search stockists..."
              className={`${FIELD_CLASSES.input} pl-9`}
            />
          </div>
        </div>

        {!loading && stockists.length === 0 ? (
          <EmptyState
            icon={HiOutlineUserGroup}
            title="No Stockists yet"
            description="Add a Stockist account so they can start ordering from the catalog."
            actionLabel="Add Stockist"
            onAction={openAdd}
          />
        ) : (
          <ResponsiveList
            items={stockists}
            getKey={(p) => p.id}
            loading={loading}
            emptyLabel="No Stockists yet"
            onOpen={openDetail}
            row={(p) => rowFor(p, { onEdit: openEdit, canAct: true })}
          >
            <div className="overflow-x-auto">
              <Table striped>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Business Name</TableHeadCell>
                    <TableHeadCell>Email</TableHeadCell>
                    <TableHeadCell>Phone</TableHeadCell>
                    <TableHeadCell>Address</TableHeadCell>
                    <TableHeadCell>Level</TableHeadCell>
                    <TableHeadCell>Discount %</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    stockists.map((p) => (
                      <TableRow key={p.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(p)}>
                        <TableCell className="font-medium text-gray-900 dark:text-[var(--dark-text)]">{p.business_name}</TableCell>
                        <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{p.email}</TableCell>
                        <TableCell className="text-xs">{p.phone || '—'}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs" title={p.address_display || p.address}>{p.address_display || p.address || '—'}</TableCell>
                        <TableCell>{levelBadge(p.stockist_level)}</TableCell>
                        <TableCell className="font-semibold">{p.discount_pct ?? 0}%</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button size="xs" color="light" onClick={() => openEdit(p)} title="Edit">
                              <HiOutlinePencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" color="warning" onClick={() => openDiscount(p)} title="Adjust Discount">
                              <HiOutlineAdjustments className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ResponsiveList>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      {/* Add / edit: mounted only while open so each opening starts from a fresh form */}
      {formTarget && (
        <PartnerFormModal
          partner={formTarget === 'new' ? null : formTarget}
          parents={parents}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>{selected?.business_name}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Email</p><p className="font-semibold break-all dark:text-[var(--dark-text)]">{selected.email}</p></div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Phone</p><p className="dark:text-[var(--dark-text)]">{selected.phone || '—'}</p></div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Level</p>{levelBadge(selected.stockist_level)}</div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Region</p><p className="dark:text-[var(--dark-text)]">{selected.region || '—'}</p></div>
                {!isCenter(selected) && (
                  <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Discount</p><p className="font-bold text-amber-700 dark:text-amber-500">{selected.discount_pct ?? 0}%</p></div>
                )}
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Status</p><StatusBadge status={selected.status} /></div>
                <div className="col-span-2"><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Address</p><p className="dark:text-[var(--dark-text)]">{selected.address_display || selected.address || '—'}</p></div>
              </div>
              {!isCenter(selected) && <StockistTerritoryEditor partnerId={selected.id} />}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {selected && !isCenter(selected) && (
            <>
              <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>Edit</Button>
              <Button color="light" size="sm" onClick={() => { setShowDetailModal(false); openDiscount(selected); }}>Adjust Discount</Button>
            </>
          )}
          <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Discount Modal */}
      <Modal show={showDiscountModal} onClose={() => setShowDiscountModal(false)} size="sm" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Update Discount — {selected?.business_name}</ModalHeader>
        <ModalBody>
          <Label htmlFor="pt_discount_val" className="mb-1">Discount Percentage (%)</Label>
          <input
            id="pt_discount_val"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.1"
            className={FIELD_CLASSES.input}
            value={discountVal}
            onChange={(e) => setDiscountVal(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)] mt-2">
            Applied at checkout: Stockist price × (1 − discount / 100)
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleDiscount} disabled={submitting}>{submitting ? 'Saving…' : 'Update Discount'}</Button>
          <Button color="gray" onClick={() => setShowDiscountModal(false)} disabled={submitting}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
