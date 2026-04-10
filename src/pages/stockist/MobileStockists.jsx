import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, TextInput, Label, Select, Spinner } from 'flowbite-react';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import { FiUser } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { MOBILE_STOCKISTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  region: '',
  status: 'active',
  password: '',
};

export default function StockistMobileStockists() {
  const { toasts, showToast, dismiss } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(MOBILE_STOCKISTS.LIST, {
        params: { page, limit: 20, search },
      });
      const list = data.data?.items || data.data || [];
      setItems(Array.isArray(list) ? list : []);
      setTotalPages(data.data?.pagination?.pages || 1);
    } catch {
      showToast('Failed to load mobile stockists', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal('add');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      region: item.region || '',
      status: item.status || 'active',
      password: '',
    });
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Name and email are required', 'warning');
      return;
    }
    if (modal === 'add' && !form.password) {
      showToast('Password is required for new accounts', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.put(MOBILE_STOCKISTS.UPDATE(editing.id), payload);
        showToast('Mobile Stockist updated', 'success');
      } else {
        await api.post(MOBILE_STOCKISTS.CREATE, payload);
        showToast('Mobile Stockist created', 'success');
      }
      closeModal();
      fetchItems();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/mobile-stockists/${deleteTarget.id}`);
      showToast('Mobile Stockist removed', 'info');
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const f = (label, key, type = 'text', required = false) => (
    <div key={key}>
      <Label value={label + (required ? ' *' : '')} className="mb-1.5" />
      <TextInput
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={label}
      />
    </div>
  );

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter bg-[#FFF8F0] dark:bg-[var(--dark-bg)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">Mobile Stockists</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] mt-0.5">Manage Mobile Stockists under your territory</p>
        </div>
        <Button color="warning" onClick={openAdd}>
          <HiPlus className="mr-2 w-4 h-4" />
          Add Mobile Stockist
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-gray-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FiUser size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No mobile stockists found</p>
            <button onClick={openAdd} className="mt-3 text-amber-600 text-sm hover:underline">
              Add one now
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[var(--dark-card)] border-b border-gray-100 dark:border-[var(--dark-border)]">
                  <tr>
                    {['Name', 'Email', 'Phone', 'Region', 'Status', 'Joined', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">
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
                      <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-sm">{item.region || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status || 'active'} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-[var(--dark-muted)]">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button size="xs" color="gray" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="xs" color="gray" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal show={!!modal} onClose={closeModal} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>{modal === 'edit' ? 'Edit Mobile Stockist' : 'Add Mobile Stockist'}</ModalHeader>
        <ModalBody className="space-y-4">
          {f('Full Name', 'name', 'text', true)}
          {f('Email Address', 'email', 'email', modal === 'add')}
          {f('Phone Number', 'phone', 'tel')}
          {f('Address', 'address')}
          {f('Region / Area', 'region')}
          {modal === 'edit' && (
            <div>
              <Label value="Status" className="mb-1.5" />
              <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          )}
          {modal === 'add' && f('Password *', 'password', 'password', true)}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleSubmit} disabled={submitting}>
            {modal === 'edit' ? 'Save Changes' : 'Create Account'}
          </Button>
          <Button color="gray" onClick={closeModal}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Remove Mobile Stockist"
        message={`Remove ${deleteTarget?.name} from your territory? This action cannot be undone.`}
        confirmLabel="Remove"
        confirmColor="failure"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
