import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, TextInput, Select, Label } from 'flowbite-react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTruck, HiInformationCircle } from 'react-icons/hi';
import api from '@/services/api';
import { COURIERS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const EMPTY_FORM = {
  name: '',
  code: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  tracking_url_template: '',
  website_url: '',
  is_active: true,
};

const normalizeCourier = (raw = {}) => ({
  id: raw.id,
  name: raw.name || '',
  code: raw.code || '',
  contact_person: raw.contact_person || raw.contact_name || '',
  contact_phone: raw.contact_phone || '',
  contact_email: raw.contact_email || '',
  tracking_url_template: raw.tracking_url_template || raw.tracking_url || '',
  website_url: raw.website_url || '',
  is_active: raw.is_active !== false && raw.is_active !== 0,
});

function CourierFormFields({ form, onFieldChange, onOpenTrackingGuide }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label value="Courier Name" className="mb-1" />
        <TextInput value={form.name} onChange={onFieldChange('name')} placeholder="J&T Express" required />
      </div>
      <div>
        <Label value="Code" className="mb-1" />
        <TextInput value={form.code} onChange={onFieldChange('code')} placeholder="JT" required />
      </div>
      <div>
        <Label value="Contact Person" className="mb-1" />
        <TextInput value={form.contact_person} onChange={onFieldChange('contact_person')} placeholder="Area Manager" />
      </div>
      <div>
        <Label value="Contact Phone" className="mb-1" />
        <TextInput value={form.contact_phone} onChange={onFieldChange('contact_phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div className="col-span-2">
        <Label value="Contact Email (optional)" className="mb-1" />
        <TextInput value={form.contact_email} onChange={onFieldChange('contact_email')} placeholder="ops@courier.com" />
      </div>
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1">
          <Label value="Tracking URL Template (optional)" />
          <button
            type="button"
            onClick={onOpenTrackingGuide}
            className="text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            How to get this?
          </button>
        </div>
        <TextInput
          value={form.tracking_url_template}
          onChange={onFieldChange('tracking_url_template')}
          placeholder="https://courier.com/track?num={tracking_number}"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use <span className="font-mono">{'{tracking_number}'}</span> as placeholder for the actual number.
        </p>
      </div>
      <div className="col-span-2">
        <Label value="Courier Website (optional)" className="mb-1" />
        <TextInput value={form.website_url} onChange={onFieldChange('website_url')} placeholder="https://www.courier.com" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={onFieldChange('is_active')} className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">Active</span>
      </label>
    </div>
  );
}

export default function Couriers() {
  const { toasts, showToast, dismiss } = useToast();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showTrackingGuide, setShowTrackingGuide] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchCouriers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(COURIERS.LIST);
      setCouriers((data.data || []).map(normalizeCourier));
    } catch {
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCouriers(); }, [fetchCouriers]);

  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  };

  const openEdit = (c) => {
    const normalized = normalizeCourier(c);
    setSelected(normalized);
    setForm({ ...normalized });
    setShowEditModal(true);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Courier name and code are required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(COURIERS.CREATE, {
        ...form,
        code: form.code.trim().toUpperCase(),
      });
      showToast('Courier added', 'success');
      setShowAddModal(false);
      fetchCouriers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add courier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Courier name and code are required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(COURIERS.UPDATE(selected.id), {
        ...form,
        code: form.code.trim().toUpperCase(),
      });
      showToast('Courier updated', 'success');
      setShowEditModal(false);
      fetchCouriers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(COURIERS.DELETE(deleteTarget.id));
      showToast('Courier removed', 'info');
      setDeleteTarget(null);
      fetchCouriers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({
    ...f,
    [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Couriers"
        subtitle="Third-party delivery partner management"
        actions={[
          { label: 'Tracking Guide', color: 'light', icon: <HiInformationCircle className="w-4 h-4" />, onClick: () => setShowTrackingGuide(true) },
          { label: 'Add Courier', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd },
        ]}
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-[var(--dark-card2)] border border-amber-200 dark:border-[var(--dark-border)] rounded-xl mb-5">
        <HiInformationCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Couriers are third-party delivery partners (J&T, LBC, Flash Express, etc.) assigned to orders when generating delivery magic links.
          No employed riders — all deliveries are via courier partnerships.
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Name</TableHeadCell>
                  <TableHeadCell>Code</TableHeadCell>
                  <TableHeadCell>Contact</TableHeadCell>
                  <TableHeadCell>Tracking URL</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {couriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        icon={HiOutlineTruck}
                        title="No couriers added"
                        description="Add courier partners to assign to deliveries"
                        actionLabel="Add Courier"
                        onAction={openAdd}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  couriers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-amber-50/30">
                      <TableCell className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.code || '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div>{c.contact_person || '—'}</div>
                        {c.contact_phone && <div className="text-gray-500">{c.contact_phone}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.tracking_url_template ? (
                          <span className="text-amber-600 font-mono truncate max-w-xs block">{c.tracking_url_template}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={c.is_active !== false ? 'badge-active' : 'badge-inactive'}>
                          {c.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="xs" color="light" onClick={() => openEdit(c)}>
                            <HiOutlinePencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="xs" color="failure" outline onClick={() => setDeleteTarget(c)}>
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Add Courier</ModalHeader>
        <ModalBody>
          <CourierFormFields form={form} onFieldChange={fld} onOpenTrackingGuide={() => setShowTrackingGuide(true)} />
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Courier'}
          </Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Courier — {selected?.name}</ModalHeader>
        <ModalBody>
          <CourierFormFields form={form} onFieldChange={fld} onOpenTrackingGuide={() => setShowTrackingGuide(true)} />
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Slide-up tracking guide */}
      {showTrackingGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setShowTrackingGuide(false)}
            aria-label="Close tracking guide"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-amber-100 bg-white shadow-2xl p-5 sm:p-6 animate-[fade-up_220ms_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Courier Tracking Link Guide</h3>
            <p className="text-sm text-gray-600 mb-3">
              This field is optional but recommended. It helps stockists open the courier website directly from order tracking.
            </p>
            <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside mb-3">
              <li>Open the courier official tracking page.</li>
              <li>Find the URL pattern where tracking number is passed in the link.</li>
              <li>Replace the real number with <span className="font-mono">{'{tracking_number}'}</span>.</li>
              <li>Save it as Tracking URL Template.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">Example</p>
              <p className="text-xs font-mono text-amber-700 break-all">
                https://www.jtexpress.ph/index/query/gzquery.html?bills={'{tracking_number}'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button color="gray" onClick={() => setShowTrackingGuide(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Delete Courier"
        message={`Delete courier "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        confirmColor="failure"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={submitting}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
