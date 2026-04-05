import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, Tabs, TabItem, Pagination, Textarea, Label,
} from 'flowbite-react';
import { HiOutlineCheck, HiOutlineX, HiOutlineEye, HiOutlineClipboardCheck, HiOutlineExternalLink } from 'react-icons/hi';
import api from '@/services/api';
import { APPLICATIONS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const STATUSES = ['all', 'pending', 'approved', 'rejected'];

export default function Applications() {
  const { toasts, showToast, dismiss } = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1); // default pending
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selected, setSelected] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectApp, setRejectApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = STATUSES[activeTab] === 'all' ? '' : STATUSES[activeTab];

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(APPLICATIONS.LIST, {
        params: { page, status: statusFilter || undefined, limit: 15 },
      });
      setApps(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const openDetail = async (app) => {
    try {
      const { data } = await api.get(APPLICATIONS.BY_ID(app.id));
      setSelected(data.data);
    } catch {
      setSelected(app);
    }
    setShowDetailModal(true);
  };

  const executeApprove = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await api.patch(APPLICATIONS.APPROVE(confirmAction.id));
      showToast('Application approved — account created', 'success');
      setConfirmAction(null);
      setShowDetailModal(false);
      fetchApps();
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeReject = async () => {
    if (!rejectApp) return;
    setActionLoading(true);
    try {
      await api.patch(APPLICATIONS.REJECT(rejectApp.id), { reason: rejectReason });
      showToast('Application rejected', 'info');
      setShowRejectModal(false);
      setShowDetailModal(false);
      fetchApps();
    } catch (err) {
      showToast(err.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const levelLabel = (level) => {
    const m = {
      provincial_stockist: 'Provincial',
      city_stockist: 'City',
      mobile_stockist: 'Mobile',
    };
    return m[level] || level;
  };

  return (
    <div className="page-enter">
      <PageHeader title="Applications" subtitle="Review Stockist-to-be (DTA) applications" />

      <Card>
        <Tabs onActiveTabChange={(i) => { setActiveTab(i); setPage(1); }}>
          {STATUSES.map((s) => (
            <TabItem key={s} title={s.charAt(0).toUpperCase() + s.slice(1)}>
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableHeadCell>Applicant</TableHeadCell>
                    <TableHeadCell>Business</TableHeadCell>
                    <TableHeadCell>Level Requested</TableHeadCell>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : apps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState
                            icon={HiOutlineClipboardCheck}
                            title="No applications"
                            description="No applications matching this filter"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      apps.map((app) => (
                        <TableRow key={app.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(app)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{app.applicant_name || `${app.first_name} ${app.last_name}`}</p>
                              <p className="text-xs text-gray-500">{app.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{app.business_name || '—'}</TableCell>
                          <TableCell>
                            <span className="badge-approved">{levelLabel(app.requested_level)}</span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{formatDate(app.created_at)}</TableCell>
                          <TableCell><StatusBadge status={app.status} /></TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="xs" color="light" onClick={() => openDetail(app)}>
                                <HiOutlineEye className="w-3.5 h-3.5" />
                              </Button>
                              {app.status === 'pending' && (
                                <>
                                  <Button size="xs" color="success" onClick={() => setConfirmAction(app)}>
                                    <HiOutlineCheck className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="xs" color="failure" onClick={() => { setRejectApp(app); setRejectReason(''); setShowRejectModal(true); }}>
                                    <HiOutlineX className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
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
            </TabItem>
          ))}
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
        <ModalHeader>Application Detail</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Applicant Name</p><p className="font-semibold">{selected.applicant_name || `${selected.first_name} ${selected.last_name}`}</p></div>
                <div><p className="text-gray-500 text-xs">Email</p><p className="font-semibold">{selected.email}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p>{selected.phone || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Business Name</p><p className="font-semibold">{selected.business_name || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Level Requested</p><span className="badge-approved">{levelLabel(selected.requested_level)}</span></div>
                <div><p className="text-gray-500 text-xs">Status</p><StatusBadge status={selected.status} /></div>
                <div className="col-span-2"><p className="text-gray-500 text-xs">Address</p><p>{selected.address || '—'}</p></div>
              </div>

              {/* Documents */}
              <div className="flex gap-3 flex-wrap">
                {selected.id_document_url && (
                  <a href={selected.id_document_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:underline">
                    <HiOutlineExternalLink className="w-4 h-4" />
                    View ID Document
                  </a>
                )}
                {selected.business_permit_url && (
                  <a href={selected.business_permit_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:underline">
                    <HiOutlineExternalLink className="w-4 h-4" />
                    View Business Permit
                  </a>
                )}
              </div>

              {selected.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                  <p className="font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-red-600">{selected.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        {selected?.status === 'pending' && (
          <ModalFooter>
            <Button color="success" size="sm" onClick={() => { setShowDetailModal(false); setConfirmAction(selected); }}>
              <HiOutlineCheck className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button color="failure" size="sm" outline onClick={() => { setShowDetailModal(false); setRejectApp(selected); setRejectReason(''); setShowRejectModal(true); }}>
              <HiOutlineX className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
          </ModalFooter>
        )}
      </Modal>

      {/* Approve Confirm */}
      <ConfirmModal
        show={!!confirmAction}
        title="Approve Application"
        message={`Approve application from ${confirmAction?.applicant_name || confirmAction?.email}? This will create their stockist account.`}
        confirmLabel="Approve"
        confirmColor="success"
        onConfirm={executeApprove}
        onClose={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      {/* Reject Modal */}
      <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} size="sm">
        <ModalHeader>Reject Application</ModalHeader>
        <ModalBody>
          <Label value="Reason for rejection" className="mb-1" />
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Incomplete documents, invalid information..."
          />
        </ModalBody>
        <ModalFooter>
          <Button color="failure" onClick={executeReject} disabled={actionLoading} isProcessing={actionLoading}>Reject</Button>
          <Button color="gray" onClick={() => setShowRejectModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
