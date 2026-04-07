import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, TextInput, Select, Label,
} from 'flowbite-react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTruck, HiInformationCircle } from 'react-icons/hi';
import api from '@/services/api';
import { COURIERS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const EMPTY_FORM = {
  name: '', code: '', contact_name: '', contact_phone: '',
  tracking_url: '', is_active: true,
};

export default function Couriers() {
  const { toasts, showToast, dismiss } = useToast();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchCouriers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(COURIERS.LIST);
      setCouriers(data.data || []);
    } catch {
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCouriers(); }, [fetchCouriers]);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (c) => {
    setSelected(c);
    setForm({
      name: c.name, code: c.code || '', contact_name: c.contact_name || '',
      contact_phone: c.contact_phone || '', tracking_url: c.tracking_url || '',
      is_active: c.is_active !== false,
    });
    setShowEditModal(true);
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(COURIERS.CREATE, form);
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
    setSubmitting(true);
    try {
      await api.put(COURIERS.UPDATE(selected.id), form);
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
      await api.delete(`/couriers/${deleteTarget.id}`);
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

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label value="Courier Name" className="mb-1" />
        <TextInput value={form.name} onChange={fld('name')} placeholder="J&T Express" required />
      </div>
      <div>
        <Label value="Code (short name)" className="mb-1" />
        <TextInput value={form.code} onChange={fld('code')} placeholder="JT" />
      </div>
      <div>
        <Label value="Contact Person" className="mb-1" />
        <TextInput value={form.contact_name} onChange={fld('contact_name')} placeholder="Area Manager" />
      </div>
      <div>
        <Label value="Contact Phone" className="mb-1" />
        <TextInput value={form.contact_phone} onChange={fld('contact_phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div className="col-span-2">
        <Label value="Tracking URL (optional)" className="mb-1" />
        <TextInput value={form.tracking_url} onChange={fld('tracking_url')} placeholder="https://jtexpress.ph/track?num={tracking_number}" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={fld('is_active')} className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">Active</span>
      </label>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Couriers"
        subtitle="Third-party delivery partner management"
        actions={[{ label: 'Add Courier', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
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
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Code</TableHeadCell>
                <TableHeadCell>Contact</TableHeadCell>
                <TableHeadCell>Tracking URL</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
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
                        <div>{c.contact_name || '—'}</div>
                        {c.contact_phone && <div className="text-gray-500">{c.contact_phone}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.tracking_url ? (
                          <span className="text-amber-600 font-mono truncate max-w-xs block">{c.tracking_url}</span>
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
        <ModalBody><FormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Add Courier</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Courier — {selected?.name}</ModalHeader>
        <ModalBody><FormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting} isProcessing={submitting}>Save Changes</Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

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
