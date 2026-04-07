import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, TextInput, Select, Label,
} from 'flowbite-react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCurrencyDollar, HiInformationCircle } from 'react-icons/hi';
import api from '@/services/api';
import { BANK_ACCOUNTS, WAREHOUSES } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const EMPTY_FORM = {
  bank_name: '', account_name: '', account_number: '', warehouse_id: '',
  is_default: false, is_active: true, notes: '',
};

export default function BankAccounts() {
  const { toasts, showToast, dismiss } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(BANK_ACCOUNTS.LIST);
      setAccounts(data.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    api.get(WAREHOUSES.LIST, { params: { limit: 100 } })
      .then((r) => setWarehouses(r.data.data || []))
      .catch(() => {});
  }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
  const openEdit = (a) => {
    setSelected(a);
    setForm({
      bank_name: a.bank_name, account_name: a.account_name, account_number: a.account_number,
      warehouse_id: a.warehouse_id || '', is_default: a.is_default || false,
      is_active: a.is_active !== false, notes: a.notes || '',
    });
    setShowEditModal(true);
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(BANK_ACCOUNTS.CREATE, form);
      showToast('Bank account added', 'success');
      setShowAddModal(false);
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(BANK_ACCOUNTS.UPDATE(selected.id), form);
      showToast('Bank account updated', 'success');
      setShowEditModal(false);
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(BANK_ACCOUNTS.DELETE(deleteTarget.id));
      showToast('Bank account removed', 'info');
      setDeleteTarget(null);
      fetchAccounts();
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
        <Label value="Bank Name" className="mb-1" />
        <TextInput value={form.bank_name} onChange={fld('bank_name')} placeholder="BDO, BPI, GCash..." required />
      </div>
      <div>
        <Label value="Account Name" className="mb-1" />
        <TextInput value={form.account_name} onChange={fld('account_name')} placeholder="Juan Dela Cruz" required />
      </div>
      <div className="col-span-2">
        <Label value="Account Number" className="mb-1" />
        <TextInput value={form.account_number} onChange={fld('account_number')} placeholder="1234 5678 9012" required />
      </div>
      <div>
        <Label value="Assigned Warehouse (optional)" className="mb-1" />
        <Select value={form.warehouse_id} onChange={fld('warehouse_id')}>
          <option value="">Default (all warehouses)</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
      </div>
      <div>
        <Label value="Notes (optional)" className="mb-1" />
        <TextInput value={form.notes} onChange={fld('notes')} placeholder="Additional info..." />
      </div>
      <div className="col-span-2 flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_default} onChange={fld('is_default')} className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">Set as Default Account</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={fld('is_active')} className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">Active</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title="Bank Accounts"
        subtitle="Payment routing accounts for order approvals"
        actions={[{ label: 'Add Account', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-[var(--dark-card2)] border border-amber-200 dark:border-[var(--dark-border)] rounded-xl mb-5">
        <HiInformationCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Bank accounts are used to route payment instructions to the correct account when a stockist order is approved.
          Each warehouse can have its own bank account. If no warehouse is assigned, the account acts as the company default.
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableHeadCell>Bank Name</TableHeadCell>
                <TableHeadCell>Account Name</TableHeadCell>
                <TableHeadCell>Account Number</TableHeadCell>
                <TableHeadCell>Warehouse</TableHeadCell>
                <TableHeadCell>Default</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y">
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={HiOutlineCurrencyDollar}
                        title="No bank accounts"
                        description="Add bank accounts to route payment instructions"
                        actionLabel="Add Account"
                        onAction={openAdd}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((a) => (
                    <TableRow key={a.id} className="hover:bg-amber-50/30">
                      <TableCell className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{a.bank_name}</TableCell>
                      <TableCell>{a.account_name}</TableCell>
                      <TableCell className="font-mono text-sm">{a.account_number}</TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{a.warehouse_name || <span className="text-gray-400 dark:text-[var(--dark-muted)]">Default</span>}</TableCell>
                      <TableCell>
                        {a.is_default ? (
                          <span className="badge-paid">Default</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={a.is_active !== false ? 'badge-active' : 'badge-inactive'}>
                          {a.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="xs" color="light" onClick={() => openEdit(a)}>
                            <HiOutlinePencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="xs" color="failure" outline onClick={() => setDeleteTarget(a)}>
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
        <ModalHeader>Add Bank Account</ModalHeader>
        <ModalBody><FormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Add Account</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Edit Bank Account</ModalHeader>
        <ModalBody><FormFields /></ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting} isProcessing={submitting}>Save Changes</Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title="Delete Bank Account"
        message={`Delete "${deleteTarget?.bank_name} — ${deleteTarget?.account_name}"? This cannot be undone.`}
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
