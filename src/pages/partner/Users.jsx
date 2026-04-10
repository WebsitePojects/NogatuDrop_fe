import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiFilter, FiUserPlus, FiDownload, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '@/services/api';
import { USERS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import { STATUS_BADGE } from '@/utils/constants';

const Users = () => {
  const { toasts, showToast, dismiss } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get(USERS.LIST);
      setUsers(data.data || []);
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || u.status === filter || u.role_slug === filter;
    return matchSearch && matchFilter;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const admins = users.filter((u) => u.role_slug === 'admin').length;

  const handleExport = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Level', 'Location', 'Status', 'Last Login'],
      ...filtered.map((u) => [
        `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        u.email,
        u.role_slug,
        u.level || '',
        u.location || '',
        u.status,
        u.last_login || '',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
  };

  const openModal = () => {
    setForm({ name: '', email: '', password: '' });
    setShowModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      role_slug: 'staff',
    };

    if (!payload.name) {
      showToast('Name is required', 'warning');
      return;
    }
    if (payload.password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(USERS.CREATE, payload);
      setShowModal(false);
      showToast('Staff user added', 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || '';
    setEditingUserId(user.id);
    setForm({
      name: fullName,
      email: user.email || '',
      password: '',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUserId) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      status: form.status,
    };

    if (!payload.name) {
      showToast('Name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(USERS.UPDATE(editingUserId), payload);
      setShowEditModal(false);
      setEditingUserId(null);
      showToast('User updated', 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const askDeleteUser = (user) => {
    setDeleteTarget(user);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await api.delete(USERS.DELETE(deleteTarget.id));
      showToast('User deleted', 'info');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>USER MANAGEMENT</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your staff</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-black rounded-lg bg-black text-white hover:bg-gray-900 transition-colors"
          >
            <FiDownload className="text-white" />
            Export
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Users', value: loading ? '—' : totalUsers },
            { label: 'Active Users', value: loading ? '—' : activeUsers },
            { label: 'Admins', value: loading ? '—' : admins },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter + Add User */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3 items-center">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white appearance-none min-w-[140px]"
            >
              <option value="">Filter</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ background: '#FF8C00' }}
          >
            <FiUserPlus />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">System Users</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user) => {
                      const statusBadge = STATUS_BADGE[user.status] || STATUS_BADGE.inactive;
                      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || '—';
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{fullName}</td>
                          <td className="px-4 py-3 text-gray-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                              {user.role_slug || user.role || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{user.level || 'Main'}</td>
                          <td className="px-4 py-3 text-gray-600">{user.location || 'Regional Hub - North'}</td>
                          <td className="px-4 py-3">
                            <Badge {...statusBadge} />
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {formatDate(user.last_login || user.updated_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(user)}
                                className="px-2 py-1 text-xs font-medium rounded text-white"
                                style={{ background: '#FF8C00' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => askDeleteUser(user)}
                                className="px-2 py-1 text-xs font-medium rounded text-white bg-red-500 hover:bg-red-600"
                              >
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Staff">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              required
              type="text"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="Enter email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              required
              type="password"
              name="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="Minimum 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#0B3D0B] text-white font-semibold rounded-xl hover:bg-[#145214] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Staff User'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff">
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status || 'active'}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#0B3D0B] text-white font-semibold rounded-xl hover:bg-[#145214] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        show={!!deleteTarget}
        title="Delete User"
        message={`Delete user ${(deleteTarget && (`${deleteTarget.first_name || ''} ${deleteTarget.last_name || ''}`.trim() || deleteTarget.name || deleteTarget.email)) || ''}?`}
        confirmLabel="Delete"
        confirmColor="failure"
        onConfirm={handleDeleteUser}
        onClose={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default Users;
