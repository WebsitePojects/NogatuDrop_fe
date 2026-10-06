import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import { Button, Badge } from 'flowbite-react';
import { HiOutlinePlus, HiOutlineOfficeBuilding, HiOutlineLocationMarker, HiOutlineUser, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import api from '@/services/api';
import { WAREHOUSES } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import WarehouseFormModal from '@/components/WarehouseFormModal';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { ToastContainer, useToast } from '@/components/Toast';

export default function Warehouses() {
  const { toasts, showToast, dismiss } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('owned');

  // null = form closed, 'new' = add, a warehouse record = edit.
  const [formTarget, setFormTarget] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const { submitting, run } = useSubmitGuard();

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

  const openAdd = () => setFormTarget('new');
  const openEdit = (w) => { setSelected(w); setFormTarget(w); };
  const handleSaved = (message) => {
    showToast(message, 'success');
    setFormTarget(null);
    fetchWarehouses();
  };
  const openDetail = (w) => { setSelected(w); setShowDetailModal(true); };

  const handleDelete = () => run(async () => {
    try {
      await api.delete(WAREHOUSES.UPDATE(deleteTarget.id));
      showToast('Warehouse removed', 'info');
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  });

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
                    <HiOutlineOfficeBuilding className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[var(--dark-text)] text-sm">{w.name}</p>
                    <Badge color={typeBadgeColor(w.type)} size="xs">{typeLabel(w.type)}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-[var(--dark-muted)]">
                <div className="flex items-center gap-1.5">
                  <HiOutlineLocationMarker className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{w.address_display || w.location || 'No location'}</span>
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
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit: mounted only while open so each opening starts from a fresh form */}
      {formTarget && (
        <WarehouseFormModal
          warehouse={formTarget === 'new' ? null : formTarget}
          createType="manufacturer"
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>{selected?.name}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Type</p><Badge color={typeBadgeColor(selected.type)}>{typeLabel(selected.type)}</Badge></div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Capacity</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.capacity_total ? Number(selected.capacity_total).toLocaleString() + ' units' : '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Address</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.address_display || selected.location || '—'}</p></div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Manager</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.manager_name || '—'}</p></div>
                <div><p className="text-gray-600 dark:text-[var(--dark-muted)] text-xs">Phone</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.manager_phone || '—'}</p></div>
                {(selected.lat && selected.lng) && (
                  <div className="col-span-2">
                    <p className="text-muted text-xs mb-1">Map pin</p>
                    <p className="font-mono text-xs">{selected.lat}, {selected.lng}</p>
                    <a
                      href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-700 dark:text-amber-500 hover:underline"
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
