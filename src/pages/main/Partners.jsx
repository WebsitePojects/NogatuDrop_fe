import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, TextInput, Select, Label, Badge, Pagination,
} from 'flowbite-react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineAdjustments,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import api from '@/services/api';
import { PARTNERS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const EMPTY_FORM = {
  business_name: '', email: '', phone: '', address: '', region: '',
  stockist_level: 'city_stockist', parent_partner_id: '', discount_pct: '0',
};

export default function Partners() {
  const { toasts, showToast, dismiss } = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [allPartners, setAllPartners] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [discountVal, setDiscountVal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PARTNERS.LIST, {
        params: { page, search: search || undefined, limit: 15 },
      });
      setPartners(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  useEffect(() => {
    api.get(PARTNERS.LIST, { params: { limit: 200, level: 'provincial_stockist' } })
      .then((r) => setAllPartners(r.data.data || []))
      .catch(() => {});
  }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (p) => {
    setSelected(p);
    setForm({
      business_name: p.business_name, email: p.email, phone: p.phone || '',
      address: p.address || '', region: p.region || '',
      stockist_level: p.stockist_level, parent_partner_id: p.parent_partner_id || '',
      discount_pct: p.discount_pct ?? '0',
    });
    setShowEditModal(true);
  };
  const openDetail = (p) => { setSelected(p); setShowDetailModal(true); };
  const openDiscount = (p) => {
    setSelected(p);
    setDiscountVal(String(p.discount_pct ?? 0));
    setShowDiscountModal(true);
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(PARTNERS.CREATE, form);
      showToast('Stockist added', 'success');
      setShowAddModal(false);
      fetchPartners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add stockist', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(PARTNERS.UPDATE(selected.id), form);
      showToast('Stockist updated', 'success');
      setShowEditModal(false);
      fetchPartners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscount = async () => {
    setSubmitting(true);
    try {
      await api.patch(PARTNERS.UPDATE_DISCOUNT(selected.id), { discount_pct: Number(discountVal) });
      showToast('Discount updated', 'success');
      setShowDiscountModal(false);
      fetchPartners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update discount', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const levelBadge = (level) => {
    if (level === 'provincial_stockist') return <span className="badge-approved">Provincial</span>;
    if (level === 'city_stockist') return <span className="badge-delivering">City</span>;
    return <span className="badge-inactive">{level?.replace(/_/g, ' ')}</span>;
  };

  const PartnerFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label value="Business Name" className="mb-1" />
        <TextInput value={form.business_name} onChange={fld('business_name')} placeholder="Juan Store" required />
      </div>
      <div>
        <Label value="Email" className="mb-1" />
        <TextInput type="email" value={form.email} onChange={fld('email')} placeholder="juan@store.com" required />
      </div>
      <div>
        <Label value="Phone" className="mb-1" />
        <TextInput value={form.phone} onChange={fld('phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div className="col-span-2">
        <Label value="Address" className="mb-1" />
        <TextInput value={form.address} onChange={fld('address')} placeholder="123 Main St." />
      </div>
      <div>
        <Label value="Region" className="mb-1" />
        <TextInput value={form.region} onChange={fld('region')} placeholder="NCR" />
      </div>
      <div>
        <Label value="Level" className="mb-1" />
        <Select value={form.stockist_level} onChange={fld('stockist_level')}>
          <option value="provincial_stockist">Provincial Stockist</option>
          <option value="city_stockist">City Stockist</option>
        </Select>
      </div>
      {form.stockist_level === 'city_stockist' && (
        <div className="col-span-2">
          <Label value="Parent Provincial Stockist" className="mb-1" />
          <Select value={form.parent_partner_id} onChange={fld('parent_partner_id')}>
            <option value="">Select parent...</option>
            {allPartners.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}
          </Select>
        </div>
      )}
      <div>
        <Label value="Discount %" className="mb-1" />
        <TextInput type="number" min="0" max="100" step="0.1" value={form.discount_pct} onChange={fld('discount_pct')} placeholder="0" />
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Stockists"
        subtitle="Manage provincial and city stockist accounts"
        actions={[{ label: 'Add Stockist', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      <Card>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <TextInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search stockists..."
              className="pl-8"
              sizing="sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Business Name</TableHeadCell>
              <TableHeadCell>Email</TableHeadCell>
              <TableHeadCell>Phone</TableHeadCell>
              <TableHeadCell>Region</TableHeadCell>
              <TableHeadCell>Level</TableHeadCell>
              <TableHeadCell>Discount %</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
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
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={HiOutlineUserGroup}
                      title="No stockists found"
                      description="Add stockist accounts to start managing distribution"
                      actionLabel="Add Stockist"
                      onAction={openAdd}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((p) => (
                  <TableRow key={p.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(p)}>
                    <TableCell className="font-medium text-gray-900 dark:text-[var(--dark-text)]">{p.business_name}</TableCell>
                    <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{p.email}</TableCell>
                    <TableCell className="text-xs">{p.phone || '—'}</TableCell>
                    <TableCell className="text-xs">{p.region || '—'}</TableCell>
                    <TableCell>{levelBadge(p.stockist_level)}</TableCell>
                    <TableCell className="font-semibold">{p.discount_pct ?? 0}%</TableCell>
                    <TableCell><StatusBadge status={p.is_active ? 'active' : 'inactive'} /></TableCell>
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
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Add Stockist</ModalHeader>
        <ModalBody><PartnerFormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Add Stockist</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Stockist — {selected?.business_name}</ModalHeader>
        <ModalBody><PartnerFormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting} isProcessing={submitting}>Save Changes</Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>{selected?.business_name}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Email</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.email}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Phone</p><p className="dark:text-[var(--dark-text)]">{selected.phone || '—'}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Level</p>{levelBadge(selected.stockist_level)}</div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Region</p><p className="dark:text-[var(--dark-text)]">{selected.region || '—'}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Discount</p><p className="font-bold text-amber-600">{selected.discount_pct ?? 0}%</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Status</p><StatusBadge status={selected.is_active ? 'active' : 'inactive'} /></div>
                <div className="col-span-2"><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Address</p><p className="dark:text-[var(--dark-text)]">{selected.address || '—'}</p></div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>Edit</Button>
          <Button color="light" size="sm" onClick={() => { setShowDetailModal(false); openDiscount(selected); }}>Adjust Discount</Button>
          <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Discount Modal */}
      <Modal show={showDiscountModal} onClose={() => setShowDiscountModal(false)} size="sm" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Update Discount — {selected?.business_name}</ModalHeader>
        <ModalBody>
          <Label value="Discount Percentage (%)" className="mb-1" />
          <TextInput
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={discountVal}
            onChange={(e) => setDiscountVal(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)] mt-2">
            Applied at checkout: partner_price × (1 − discount / 100)
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleDiscount} disabled={submitting} isProcessing={submitting}>Update Discount</Button>
          <Button color="gray" onClick={() => setShowDiscountModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
