import { useState, useEffect, useCallback } from 'react';
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, TextInput, Label, Select, Spinner,
} from 'flowbite-react';
import { HiPlus, HiPencil, HiSearch } from 'react-icons/hi';
import { FiUser } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { USERS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  role_slug: 'staff',
  status: 'active',
  password: '',
};

export default function StockistUsers() {
  const { user: currentUser } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(USERS.LIST, {
        params: { partner_id: currentUser?.partner_id, limit: 100, search },
      });
      const list = data.data?.items || data.data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, currentUser?.partner_id]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal('add');
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '',
      email: u.email || '',
      phone: u.phone || '',
      role_slug: u.role_slug || 'staff',
      status: u.status || 'active',
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
      showToast('Password is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, partner_id: currentUser?.partner_id };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.put(USERS.UPDATE(editing.id), payload);
        showToast('User updated', 'success');
      } else {
        await api.post(USERS.CREATE, payload);
        showToast('User created', 'success');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(USERS.DELETE(deleteTarget.id));
      showToast('User removed', 'info');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(u => {
    const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
  });

  const roleLabel = (slug) => {
    if (slug === 'staff') return 'Staff';
    if (slug === 'city_stockist') return 'City Stockist';
    return slug || '—';
  };

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage staff and sub-stockist accounts</p>
        </div>
        <Button color="warning" onClick={openAdd}>
          <HiPlus className="mr-2 w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Active', value: users.filter(u => u.status === 'active').length },
          { label: 'Staff', value: users.filter(u => u.role_slug === 'staff').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FiUser size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
            <button onClick={openAdd} className="mt-3 text-amber-600 text-sm hover:underline">
              Add a user
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const name = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{name}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {roleLabel(u.role_slug)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status || 'active'} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal show={!!modal} onClose={closeModal} size="md">
        <ModalHeader>{modal === 'edit' ? 'Edit User' : 'Add User'}</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label value="Full Name *" className="mb-1.5" />
            <TextInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <Label value={`Email *${modal === 'edit' ? ' (read only)' : ''}`} className="mb-1.5" />
            <TextInput
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email address"
              disabled={modal === 'edit'}
            />
          </div>
          <div>
            <Label value="Phone" className="mb-1.5" />
            <TextInput type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <Label value="Role *" className="mb-1.5" />
            <Select value={form.role_slug} onChange={e => setForm(f => ({ ...f, role_slug: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="city_stockist">City Stockist</option>
            </Select>
          </div>
          {modal === 'edit' && (
            <div>
              <Label value="Status" className="mb-1.5" />
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          )}
          {modal === 'add' && (
            <div>
              <Label value="Password *" className="mb-1.5" />
              <TextInput
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                minLength={8}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleSubmit} disabled={submitting} isProcessing={submitting}>
            {modal === 'edit' ? 'Save Changes' : 'Create User'}
          </Button>
          <Button color="gray" onClick={closeModal}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Remove User"
        message={`Remove ${deleteTarget?.name || deleteTarget?.email} from your team?`}
        confirmLabel="Remove"
        confirmColor="failure"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
