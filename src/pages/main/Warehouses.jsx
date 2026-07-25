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
import MapLocationPicker from '@/components/MapLocationPicker';
import RequiredMark from '@/components/RequiredMark';
import { ToastContainer, useToast } from '@/components/Toast';

const WAREHOUSE_TYPES = ['manufacturer'];

const EMPTY_FORM = {
  name: '', type: 'city', address: '', city: '', province: '', region: '',
  capacity: '', manager_name: '', manager_phone: '', lat: '', lng: '',
};

// Hoisted to module scope — stable identity prevents input focus loss on each keystroke.
function WarehouseFormFields({ form, fld, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="wh_name" className="mb-1">
          Warehouse Name<RequiredMark />
        </Label>
        <TextInput id="wh_name" value={form.name} onChange={fld('name')} placeholder="Metro Manila Hub" required />
      </div>
      <div>
        <Label htmlFor="wh_type" className="mb-1">Type</Label>
        <Select id="wh_type" value={form.type} onChange={fld('type')}>
          {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="wh_capacity" className="mb-1">Capacity (units)</Label>
        <TextInput id="wh_capacity" type="number" min="0" value={form.capacity} onChange={fld('capacity')} placeholder="5000" />
      </div>
      <div className="col-span-2">
        <Label htmlFor="wh_address" className="mb-1">Address</Label>
        <TextInput id="wh_address" value={form.address} onChange={fld('address')} placeholder="123 Main St." />
      </div>
      <div>
        <Label htmlFor="wh_city" className="mb-1">City</Label>
        <TextInput id="wh_city" value={form.city} onChange={fld('city')} placeholder="Quezon City" />
      </div>
      <div>
        <Label htmlFor="wh_province" className="mb-1">Province</Label>
        <TextInput id="wh_province" value={form.province} onChange={fld('province')} placeholder="Metro Manila" />
      </div>
      <div>
        <Label htmlFor="wh_manager_name" className="mb-1">Manager Name</Label>
        <TextInput id="wh_manager_name" value={form.manager_name} onChange={fld('manager_name')} placeholder="Juan Dela Cruz" />
      </div>
      <div>
        <Label htmlFor="wh_manager_phone" className="mb-1">Manager Phone</Label>
        <TextInput id="wh_manager_phone" value={form.manager_phone} onChange={fld('manager_phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div className="col-span-2">
        <MapLocationPicker
          lat={form.lat}
          lng={form.lng}
          onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
          label="Pin Warehouse Location (Philippines)"
        />
      </div>
      <div>
        <Label htmlFor="wh_lat" className="mb-1">Latitude (optional)</Label>
        <TextInput id="wh_lat" value={form.lat} onChange={fld('lat')} placeholder="14.5995" />
        <p className="mt-1 text-xs text-gray-500 dark:text-[var(--dark-muted)]">Auto-filled by the map pin above — edit only if you have exact survey coordinates.</p>
      </div>
      <div>
        <Label htmlFor="wh_lng" className="mb-1">Longitude (optional)</Label>
        <TextInput id="wh_lng" value={form.lng} onChange={fld('lng')} placeholder="120.9842" />
        <p className="mt-1 text-xs text-gray-500 dark:text-[var(--dark-muted)]">Used for nearest-stockist auto-assignment on public/mobile orders.</p>
      </div>
    </div>
  );
}

export default function Warehouses() {
  const { toasts, showToast, dismiss } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('owned');

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
      const { data } = await api.get(WAREHOUSES.LIST, { params: { view: activeView, limit: 100 } });
      setWarehouses(data.data || []);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [activeView]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (w) => {
    setSelected(w);
    setForm({
      name: w.name, type: w.type, address: w.location || '', city: '',
      province: '', region: '', capacity: w.capacity_total || '',
      manager_name: w.manager_name || '', manager_phone: w.manager_phone || '',
      lat: w.lat || '', lng: w.lng || '',
    });
    setShowEditModal(true);
  };
  const openDetail = (w) => { setSelected(w); setShowDetailModal(true); };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(WAREHOUSES.CREATE, {
        name: form.name,
        type: 'manufacturer',
        location: [form.address, form.city, form.province].filter(Boolean).join(', '),
        capacity_total: Number(form.capacity) || 100000,
        manager_name: form.manager_name,
        manager_phone: form.manager_phone || null,
        lat: form.lat || null,
        lng: form.lng || null,
      });
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
      await api.put(WAREHOUSES.UPDATE(selected.id), {
        name: form.name,
        location: [form.address, form.city, form.province].filter(Boolean).join(', '),
        capacity_total: Number(form.capacity) || 100000,
        manager_name: form.manager_name,
        manager_phone: form.manager_phone || null,
        lat: form.lat || null,
        lng: form.lng || null,
      });
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
    const m = { provincial: 'warning', city: 'info', hub: 'success', storage: 'gray', region: 'info', manufacturer: 'purple' };
    return m[type] || 'gray';
  };
  // Manufacturer warehouses are the Super Admin-owned main warehouse scope.
  const typeLabel = (type) => (type === 'manufacturer' ? 'Main' : type);

  return (
    <div className="page-enter">
      <PageHeader
        title="Warehouses"
        subtitle="Manage the main warehouse and inspect the Provincial Stockist network"
        actions={activeView === 'owned' ? [{ label: 'Add Warehouse', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }] : []}
      />

      <div className="mb-5 inline-flex rounded-2xl border border-amber-200 bg-white p-1 shadow-sm dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]">
        {[['owned', 'My Warehouses'], ['network', 'Affiliated Network']].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setActiveView(value)} className={`rounded-xl px-4 py-2 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${activeView === value ? 'bg-[#3D1800] text-white shadow-sm' : 'text-gray-600 hover:bg-amber-50 dark:text-[var(--dark-muted)] dark:hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

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
          description={activeView === 'owned' ? 'Add the main manufacturer warehouse to get started' : 'No Provincial Stockist warehouses are affiliated yet'}
          actionLabel={activeView === 'owned' ? 'Add Warehouse' : undefined}
          onAction={activeView === 'owned' ? openAdd : undefined}
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
                    <Badge color={typeBadgeColor(w.type)} size="xs">{typeLabel(w.type)}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                <div className="flex items-center gap-1.5">
                  <HiOutlineLocationMarker className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{w.location || 'No location'}</span>
                </div>
                {w.manager_name && (
                  <div className="flex items-center gap-1.5">
                    <HiOutlineUser className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{w.manager_name}</span>
                  </div>
                )}
                {w.capacity_total && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Capacity</span>
                      <span className="font-medium">{Number(w.capacity_total).toLocaleString()} units</span>
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
        <ModalBody><WarehouseFormFields form={form} fld={fld} setForm={setForm} /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>Add Warehouse</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Warehouse — {selected?.name}</ModalHeader>
        <ModalBody><WarehouseFormFields form={form} fld={fld} setForm={setForm} /></ModalBody>
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
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Type</p><Badge color={typeBadgeColor(selected.type)}>{typeLabel(selected.type)}</Badge></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Capacity</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.capacity_total ? Number(selected.capacity_total).toLocaleString() + ' units' : '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Location</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.location || '—'}</p></div>
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
          {activeView === 'owned' && <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>
            <HiOutlinePencil className="w-4 h-4 mr-1" /> Edit
          </Button>}
          {activeView === 'owned' && <Button color="failure" size="sm" outline onClick={() => { setShowDetailModal(false); setDeleteTarget(selected); }}>
            <HiOutlineTrash className="w-4 h-4 mr-1" /> Delete
          </Button>}
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
