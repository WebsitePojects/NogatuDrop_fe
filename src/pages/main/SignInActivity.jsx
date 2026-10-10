import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, Select, Pagination,
} from 'flowbite-react';
import { HiOutlineShieldCheck, HiOutlineDesktopComputer } from 'react-icons/hi';
import api from '@/services/api';
import { SECURITY } from '@/services/endpoints';
import { formatDateTime } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import ResponsiveList from '@/components/ResponsiveList';
import { ToastContainer, useToast } from '@/components/Toast';
import useSubmitGuard from '@/hooks/useSubmitGuard';

// Plain-language reasons for the flags the server sets (src/services/loginRisk.js).
const FLAG_LABELS = {
  foreign_country: 'Outside the Philippines',
  quiet_hours: 'Midnight–5am',
  failed_attempts: 'After wrong passwords',
  new_country: 'New country',
};

const OUTCOME = {
  success: { label: 'Signed in', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  code_passed: { label: 'Signed in with code', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  code_required: { label: 'Code sent, not entered', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300' },
  code_unsent: { label: 'Code could not be sent', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  code_failed: { label: 'Wrong code', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  bad_password: { label: 'Wrong password', cls: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

const pill = (cls, text) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
const outcomeOf = (event) => OUTCOME[event.outcome] || { ...OUTCOME.bad_password, label: event.outcome };
const flagText = (event) => (event.flags ? event.flags.split(',').map((flag) => FLAG_LABELS[flag] || flag).join(', ') : '');
const pageCount = (pagination) => pagination?.totalPages || pagination?.pages || 1;

function Skeleton({ columns }) {
  return Array.from({ length: 6 }).map((_, row) => (
    <TableRow key={row}>
      {Array.from({ length: columns }).map((__, cell) => (
        <TableCell key={cell}><div className="skeleton h-4 w-full rounded" /></TableCell>
      ))}
    </TableRow>
  ));
}

function SignInsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState('1');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(SECURITY.LOGIN_EVENTS, { params: { flagged: flaggedOnly || undefined, page, limit: 20 } });
      setRows(data.data || []);
      setTotalPages(pageCount(data.pagination));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [flaggedOnly, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select id="signin-filter" value={flaggedOnly} onChange={(e) => { setFlaggedOnly(e.target.value); setPage(1); }} sizing="sm">
          <option value="1">Unusual sign-ins only</option>
          <option value="">All sign-in attempts</option>
        </Select>
        <p className="text-xs text-muted">Unusual sign-ins had to enter a code sent to the account email.</p>
      </div>
      <ResponsiveList
        items={rows}
        loading={loading}
        emptyLabel="No sign-ins match this filter."
        row={(e) => ({
          title: e.user_name,
          subtitle: `${formatDateTime(e.created_at)} · ${e.country || 'Unknown country'}`,
          status: pill(outcomeOf(e).cls, outcomeOf(e).label),
          details: [
            ['Account', e.user_email],
            ['When', formatDateTime(e.created_at)],
            ['Result', outcomeOf(e).label],
            ['Why flagged', flagText(e) || 'Not flagged'],
            ['Country', e.country || 'Unknown'],
            ['IP address', e.ip || '—'],
          ],
        })}
      >
      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell>When</TableHeadCell>
              <TableHeadCell>Account</TableHeadCell>
              <TableHeadCell>Result</TableHeadCell>
              <TableHeadCell>Why flagged</TableHeadCell>
              <TableHeadCell>Country</TableHeadCell>
              <TableHeadCell>IP address</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {loading ? <Skeleton columns={6} /> : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState icon={HiOutlineShieldCheck} title="Nothing unusual" description="No sign-ins match this filter." />
                </TableCell>
              </TableRow>
            ) : rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(e.created_at)}</TableCell>
                <TableCell>
                  <span className="block font-medium text-strong">{e.user_name}</span>
                  <span className="block text-xs text-muted">{e.user_email}</span>
                </TableCell>
                <TableCell>{pill(outcomeOf(e).cls, outcomeOf(e).label)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(e.flags ? e.flags.split(',') : []).map((flag) => (
                      <span key={flag}>{pill('bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300', FLAG_LABELS[flag] || flag)}</span>
                    ))}
                    {!e.flags && <span className="text-xs text-muted">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{e.country || 'Unknown'}</TableCell>
                <TableCell className="font-mono text-xs">{e.ip || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </ResponsiveList>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-end">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
        </div>
      )}
    </Card>
  );
}

function DevicesTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [target, setTarget] = useState(null);
  const { submitting, run } = useSubmitGuard();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(SECURITY.SESSIONS, { params: { page, limit: 20 } });
      setRows(data.data || []);
      setTotalPages(pageCount(data.pagination));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const endSession = () => run(async () => {
    try {
      await api.patch(SECURITY.REVOKE_SESSION(target.id));
      showToast(`${target.user_name} was signed out on that device`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not end the session', 'error');
    } finally {
      setTarget(null);
      load();
    }
  });

  return (
    <Card>
      <p className="mb-4 text-xs text-muted">
        Devices signed in right now. A session ends by itself after 7 days, or after a day without use.
      </p>
      <ResponsiveList
        items={rows}
        loading={loading}
        emptyLabel="No one is signed in right now."
        row={(s) => ({
          title: s.user_name,
          subtitle: `Active ${formatDateTime(s.last_seen_at)} · ${s.country || 'Unknown country'}`,
          details: [
            ['Account', s.user_email],
            ['Signed in', formatDateTime(s.created_at)],
            ['Last active', formatDateTime(s.last_seen_at)],
            ['Country', s.country || 'Unknown'],
            ['IP address', s.ip || '—'],
            ['Device', s.user_agent || '—'],
          ],
          action: { label: 'End session', tone: 'danger', disabled: submitting, onClick: () => setTarget(s) },
        })}
      >
      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell>Account</TableHeadCell>
              <TableHeadCell>Signed in</TableHeadCell>
              <TableHeadCell>Last active</TableHeadCell>
              <TableHeadCell>Country / IP</TableHeadCell>
              <TableHeadCell>Device</TableHeadCell>
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {loading ? <Skeleton columns={6} /> : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState icon={HiOutlineDesktopComputer} title="No one is signed in" description="Signed-in devices appear here." />
                </TableCell>
              </TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <span className="block font-medium text-strong">{s.user_name}</span>
                  <span className="block text-xs text-muted">{s.user_email}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(s.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(s.last_seen_at)}</TableCell>
                <TableCell className="text-xs">
                  {s.country || 'Unknown'}
                  <span className="block font-mono text-muted">{s.ip || '—'}</span>
                </TableCell>
                <TableCell className="max-w-[16rem] truncate text-xs text-muted" title={s.user_agent || ''}>{s.user_agent || '—'}</TableCell>
                <TableCell>
                  <Button size="xs" color="failure" disabled={submitting} onClick={() => setTarget(s)}>End session</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </ResponsiveList>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-end">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
        </div>
      )}
      <ConfirmModal
        show={!!target}
        onClose={() => { if (!submitting) setTarget(null); }}
        onConfirm={endSession}
        loading={submitting}
        title="End this session?"
        message={target ? `${target.user_name} will be signed out on that device immediately and must sign in again.` : ''}
        confirmLabel="End session"
      />
    </Card>
  );
}

export default function SignInActivity() {
  const { toasts, showToast, dismiss } = useToast();
  const [tab, setTab] = useState('signins');

  return (
    <div className="page-enter">
      <PageHeader title="Sign-in Activity" subtitle="Unusual sign-ins and the devices signed in right now" />
      <div className="mb-4 inline-flex rounded-xl border border-gray-200 p-1 dark:border-[var(--dark-border)]" role="tablist">
        {[['signins', 'Sign-ins'], ['devices', 'Signed-in devices']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${tab === key
              ? 'bg-[#3D1800] text-white dark:bg-orange-500/20 dark:text-orange-200'
              : 'text-gray-700 hover:bg-gray-100 dark:text-[var(--dark-text)] dark:hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'signins' ? <SignInsTab /> : <DevicesTab showToast={showToast} />}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
