import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiFilter, FiPlus, FiDownload, FiEdit2 } from 'react-icons/fi';
import api from '@/services/api';
import { USERS } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { formatDate } from '@/utils/formatDate';

const ROLE_BADGE = {
  super_admin: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Super Admin' },
  admin: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Admin' },
  staff: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Staff' },
};

const STATUS_BADGE_USER = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Inactive' },
};

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role_slug: 'staff',
    password: '',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(USERS.LIST, {
        params: { page, search, role: roleFilter || undefined, limit: 20 },
      });
      setUsers(data.data || []);
      setPagination(data.pagination || null);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      role_slug: String(formData.get('role_slug') || 'staff'),
    };

    if (!payload.name) {
      alert('Name is required');
      return;
    }
    if (payload.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(USERS.CREATE, payload);
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setForm({ name: '', email: '', role_slug: 'staff', password: '' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || '';
    setEditingUserId(user.id);
    setForm({
      name: fullName,
      email: user.email || '',
      role_slug: user.role_slug || 'staff',
      password: '',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUserId) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      status: form.status,
    };

    if (!payload.name) {
      alert('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(USERS.UPDATE(editingUserId), payload);
      setShowEditModal(false);
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email;
    const confirmed = window.confirm(`Delete user ${fullName}?`);
    if (!confirmed) return;

    try {
      await api.delete(USERS.DELETE(user.id));
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Compute KPI counts
  const totalUsers = pagination?.total || users.length;
  const activeUsers = users.filter((u) => u.is_active !== false).length;
  const admins = users.filter((u) => u.role_slug === 'super_admin' || u.role_slug === 'admin').length;

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">USER MANAGEMENT</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <FiDownload />Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { title: 'Total Users', value: totalUsers },
          { title: 'Active Users', value: activeUsers },
          { title: 'Admins', value: admins },
        ].map((k) => (
          <div key={k.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium">{k.title}</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter & Add */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none appearance-none"
          >
            <option value="">Filter</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          style={{ backgroundColor: '#FF8C00' }}
        >
          <FiPlus />Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">System Users</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Name', 'Email', 'Role', 'Level', 'Location', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const roleBadge = ROLE_BADGE[user.role_slug] || ROLE_BADGE.staff;
                  const statusBadge = STATUS_BADGE_USER[user.is_active !== false ? 'active' : 'inactive'];
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || 'N/A';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{fullName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs capitalize">{user.level || user.role_slug || 'Main'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{user.location || user.warehouse_name || 'Regional Hub - North'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                            style={{ backgroundColor: '#FF8C00' }}
                          >
                            <FiEdit2 size={11} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="px-2.5 py-1.5 text-xs font-medium text-white rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            Delete
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-30">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ADD NEW USER</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new system user account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input name="name" required type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select name="role_slug" value={form.role_slug} onChange={(e) => setForm({ ...form, role_slug: e.target.value })} className={inputCls}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input name="password" required minLength={6} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Adding...' : 'ADD USER'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status || 'active'}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Saving...' : 'SAVE CHANGES'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
