import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, TextInput, Select, Label, Pagination } from 'flowbite-react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineUsers } from 'react-icons/hi';
import api from '@/services/api';
import { USERS, PARTNERS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'provincial_stockist', label: 'Provincial Stockist' },
  { value: 'city_stockist', label: 'City Stockist' },
  { value: 'staff', label: 'Staff' },
  { value: 'mobile_stockist', label: 'Mobile Stockist' },
];

const EMPTY_FORM = {
  name: '', email: '', phone: '', role_slug: '', partner_id: '', status: 'active', password: '',
};

const roleBadge = (role) => {
  const m = {
    super_admin: 'badge-approved',
    provincial_stockist: 'badge-delivered',
    city_stockist: 'badge-delivering',
    staff: 'badge-inactive',
    mobile_stockist: 'badge-pending',
  };
  const label = ROLES.find((r) => r.value === role)?.label || role;
  return <span className={m[role] || 'badge-inactive'}>{label}</span>;
};

export default function Users() {
  const { toasts, showToast, dismiss } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [partners, setPartners] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(USERS.LIST, {
        params: { page, search: search || undefined, role: roleFilter || undefined, limit: 15 },
      });
      setUsers(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    api.get(PARTNERS.LIST, { params: { limit: 200 } })
      .then((r) => setPartners(r.data.data || []))
      .catch(() => {});
  }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (u) => {
    setSelected(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', role_slug: u.role_slug, partner_id: u.partner_id || '', status: u.status || 'active', password: '' });
    setShowEditModal(true);
  };
  const openDetail = (u) => { setSelected(u); setShowDetailModal(true); };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(USERS.CREATE, form);
      showToast('User created', 'success');
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      await api.put(USERS.UPDATE(selected.id), payload);
      showToast('User updated', 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(USERS.DELETE(deleteTarget.id));
      showToast('User removed', 'info');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (u) => {
    try {
      await api.post(`/users/${u.id}/reset-password`);
      showToast('Password reset email sent', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Reset failed', 'error');
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const needsPartner = (role) => ['provincial_stockist', 'city_stockist', 'staff', 'mobile_stockist'].includes(role);

  const UserFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label value="Full Name" className="mb-1" />
        <TextInput value={form.name} onChange={fld('name')} placeholder="Juan Dela Cruz" required />
      </div>
      <div>
        <Label value="Email" className="mb-1" />
        <TextInput type="email" value={form.email} onChange={fld('email')} placeholder="juan@example.com" required />
      </div>
      <div>
        <Label value="Phone" className="mb-1" />
        <TextInput value={form.phone} onChange={fld('phone')} placeholder="09xxxxxxxxx" />
      </div>
      <div>
        <Label value="Role" className="mb-1" />
        <Select value={form.role_slug} onChange={fld('role_slug')} required>
          <option value="">Select role...</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      </div>
      <div>
        <Label value="Status" className="mb-1" />
        <Select value={form.status} onChange={fld('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {needsPartner(form.role_slug) && (
        <div className="col-span-2">
          <Label value="Stockist (Partner)" className="mb-1" />
          <Select value={form.partner_id} onChange={fld('partner_id')}>
            <option value="">Select stockist...</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}
          </Select>
        </div>
      )}
      <div className="col-span-2">
        <Label value="Password (leave blank to keep current)" className="mb-1" />
        <TextInput type="password" value={form.password} onChange={fld('password')} placeholder="••••••••" autoComplete="new-password" />
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Users"
        subtitle="Manage system user accounts"
        actions={[{ label: 'Add User', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <TextInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="pl-8"
              sizing="sm"
            />
          </div>
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Name</TableHeadCell>
              <TableHeadCell>Email</TableHeadCell>
              <TableHeadCell>Phone</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Stockist</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Last Login</TableHeadCell>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState icon={HiOutlineUsers} title="No users found" description="Add user accounts to manage access" actionLabel="Add User" onAction={openAdd} />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(u)}>
                    <TableCell className="font-medium text-gray-900 dark:text-[var(--dark-text)]">{u.name}</TableCell>
                    <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{u.email}</TableCell>
                    <TableCell className="text-xs">{u.phone || '—'}</TableCell>
                    <TableCell>{roleBadge(u.role_slug)}</TableCell>
                    <TableCell className="text-xs">{u.partner_name || '—'}</TableCell>
                    <TableCell><StatusBadge status={u.status || (u.is_active ? 'active' : 'inactive')} /></TableCell>
                    <TableCell className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{u.last_login_at ? formatDate(u.last_login_at) : 'Never'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="xs" color="light" onClick={() => openEdit(u)}>
                          <HiOutlinePencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="xs" color="failure" outline onClick={() => setDeleteTarget(u)}>
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
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Add User</ModalHeader>
        <ModalBody><UserFormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>Create User</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit User — {selected?.name}</ModalHeader>
        <ModalBody><UserFormFields /></ModalBody>
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Email</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.email}</p></div>
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Phone</p><p className="dark:text-[var(--dark-text)]">{selected.phone || '—'}</p></div>
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Role</p>{roleBadge(selected.role_slug)}</div>
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Status</p><StatusBadge status={selected.status || (selected.is_active ? 'active' : 'inactive')} /></div>
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Stockist</p><p className="dark:text-[var(--dark-text)]">{selected.partner_name || '—'}</p></div>
              <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Last Login</p><p className="dark:text-[var(--dark-text)]">{selected.last_login_at ? formatDate(selected.last_login_at) : 'Never'}</p></div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>Edit</Button>
          <Button color="light" size="sm" onClick={() => { setShowDetailModal(false); handleResetPassword(selected); }}>Reset Password</Button>
          <Button color="failure" size="sm" outline onClick={() => { setShowDetailModal(false); setDeleteTarget(selected); }}>Delete</Button>
          <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Delete User"
        message={`Delete user "${deleteTarget?.name}"? They will lose access immediately.`}
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
