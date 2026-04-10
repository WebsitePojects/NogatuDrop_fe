import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, TextInput, Select, Label, Card, Badge } from 'flowbite-react';
import { HiOutlinePlus, HiOutlineOfficeBuilding, HiOutlineLocationMarker, HiOutlineUser, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import api from '@/services/api';
import { WAREHOUSES } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const WAREHOUSE_TYPES = ['provincial', 'city', 'hub', 'storage'];

const EMPTY_FORM = {
  name: '', type: 'city', address: '', city: '', province: '', region: '',
  capacity: '', manager_name: '', manager_phone: '', lat: '', lng: '',
};

export default function Warehouses() {
  const { toasts, showToast, dismiss } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(WAREHOUSES.LIST, { params: { limit: 100 } });
      setWarehouses(data.data || []);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (w) => {
    setSelected(w);
    setForm({
      name: w.name, type: w.type, address: w.address, city: w.city,
      province: w.province, region: w.region, capacity: w.capacity || '',
      manager_name: w.manager_name || '', manager_phone: w.manager_phone || '',
      lat: w.lat || '', lng: w.lng || '',
    });
    setShowEditModal(true);
  };
  const openDetail = (w) => { setSelected(w); setShowDetailModal(true); };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(WAREHOUSES.CREATE, form);
      showToast('Warehouse added', 'success');
      setShowAddModal(false);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add warehouse', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(WAREHOUSES.UPDATE(selected.id), form);
      showToast('Warehouse updated', 'success');
      setShowEditModal(false);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(WAREHOUSES.UPDATE(deleteTarget.id));
      showToast('Warehouse removed', 'info');
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const typeBadgeColor = (type) => {
    const m = { provincial: 'warning', city: 'info', hub: 'success', storage: 'gray' };
    return m[type] || 'gray';
  };

  const WarehouseFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label value="Warehouse Name" className="mb-1" />
        <TextInput value={form.name} onChange={fld('name')} placeholder="Metro Manila Hub" required />
      </div>
      <div>
        <Label value="Type" className="mb-1" />
        <Select value={form.type} onChange={fld('type')}>
          {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </Select>
      </div>
      <div>
        <Label value="Capacity (units)" className="mb-1" />
        <TextInput type="number" min="0" value={form.capacity} onChange={fld('capacity')} placeholder="5000" />
      </div>
      <div className="col-span-2">
        <Label value="Address" className="mb-1" />
        <TextInput value={form.address} onChange={fld('address')} placeholder="123 Main St." />
      </div>
      <div>
        <Label value="City" className="mb-1" />
        <TextInput value={form.city} onChange={fld('city')} placeholder="Quezon City" />
      </div>
      <div>
        <Label value="Province" className="mb-1" />
        <TextInput value={form.province} onChange={fld('province')} placeholder="Metro Manila" />
      </div>
      <div>
        <Label value="Manager Name" className="mb-1" />
        <TextInput value={form.manager_name} onChange={fld('manager_name')} placeholder="Juan Dela Cruz" />
      </div>
      <div>
        <Label value="Manager Phone" className="mb-1" />
        <TextInput value={form.manager_phone} onChange={fld('manager_phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div>
        <Label value="Latitude (optional)" className="mb-1" />
        <TextInput value={form.lat} onChange={fld('lat')} placeholder="14.5995" />
      </div>
      <div>
        <Label value="Longitude (optional)" className="mb-1" />
        <TextInput value={form.lng} onChange={fld('lng')} placeholder="120.9842" />
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Warehouses"
        subtitle="Manage distribution warehouses"
        actions={[{ label: 'Add Warehouse', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[var(--dark-card)] rounded-xl border border-gray-100 dark:border-[var(--dark-border)] p-5">
              <div className="skeleton h-5 w-3/4 rounded mb-3" />
              <div className="skeleton h-3 w-full rounded mb-2" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={HiOutlineOfficeBuilding}
          title="No warehouses found"
          description="Add your first warehouse to get started"
          actionLabel="Add Warehouse"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-[var(--dark-card)] rounded-xl border border-gray-100 dark:border-[var(--dark-border)] p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => openDetail(w)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <HiOutlineOfficeBuilding className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[var(--dark-text)] text-sm">{w.name}</p>
                    <Badge color={typeBadgeColor(w.type)} size="xs">{w.type}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                <div className="flex items-center gap-1.5">
                  <HiOutlineLocationMarker className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{[w.address, w.city, w.province].filter(Boolean).join(', ') || 'No address'}</span>
                </div>
                {w.manager_name && (
                  <div className="flex items-center gap-1.5">
                    <HiOutlineUser className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{w.manager_name}</span>
                  </div>
                )}
                {w.capacity && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Capacity</span>
                      <span className="font-medium">{w.capacity.toLocaleString()} units</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Add Warehouse</ModalHeader>
        <ModalBody><WarehouseFormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>Add Warehouse</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Warehouse — {selected?.name}</ModalHeader>
        <ModalBody><WarehouseFormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting}>Save Changes</Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>{selected?.name}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Type</p><Badge color={typeBadgeColor(selected.type)}>{selected.type}</Badge></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Capacity</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.capacity ? selected.capacity.toLocaleString() + ' units' : '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Address</p><p className="font-semibold dark:text-[var(--dark-text)]">{[selected.address, selected.city, selected.province].filter(Boolean).join(', ') || '—'}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Manager</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.manager_name || '—'}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Phone</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.manager_phone || '—'}</p></div>
                {(selected.lat && selected.lng) && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs mb-1">Location</p>
                    <p className="font-mono text-xs">{selected.lat}, {selected.lng}</p>
                    <a
                      href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-600 hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>
            <HiOutlinePencil className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button color="failure" size="sm" outline onClick={() => { setShowDetailModal(false); setDeleteTarget(selected); }}>
            <HiOutlineTrash className="w-4 h-4 mr-1" /> Delete
          </Button>
          <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Delete Warehouse"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
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
