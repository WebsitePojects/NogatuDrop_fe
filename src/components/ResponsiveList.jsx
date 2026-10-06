import { useState } from 'react';
import { HiChevronRight } from 'react-icons/hi';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';

/**
 * One list, two layouts: the page's own table from 768px up (passed as `children`), and hairline
 * rows on phones, where a wide table would scroll sideways.
 *
 * Each phone row shows a title, a sub-line, a status chip and a chevron; tapping it opens the full
 * details. Pages with their own details modal pass `onOpen`; otherwise the row's `details` pairs are
 * shown in a built-in sheet. One `action` per row (the next step, e.g. "Approve") sits on the row.
 *
 *   <ResponsiveList
 *     items={orders}
 *     getKey={(o) => o.id}
 *     loading={loading}
 *     emptyLabel="No orders yet"
 *     onOpen={(o) => openDetail(o)}                       // optional
 *     row={(o) => ({
 *       title: o.order_number,
 *       subtitle: `${o.customer_name} · ${formatDate(o.created_at)}`,
 *       meta: formatCurrency(o.total_amount),             // right-aligned, tabular
 *       status: <StatusBadge status={o.status} />,
 *       details: [['Payment', o.payment_status], ['Items', o.items_count]], // used when no onOpen
 *       action: canApprove ? { label: 'Approve', onClick: () => approve(o), tone: 'primary' } : null,
 *     })}
 *   >
 *     <Table>…existing desktop table…</Table>
 *   </ResponsiveList>
 */
export default function ResponsiveList({
  items = [],
  getKey = (item) => item.id,
  row,
  onOpen,
  loading = false,
  emptyLabel = 'Nothing here yet',
  children,
}) {
  const [sheetItem, setSheetItem] = useState(null);
  const sheet = sheetItem ? row(sheetItem) : null;

  const open = (item) => (onOpen ? onOpen(item) : setSheetItem(item));

  return (
    <>
      <div className="hidden md:block">{children}</div>

      <div className="md:hidden">
        {loading ? (
          <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 py-3.5">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-600 dark:text-[var(--dark-muted)]">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
            {items.map((item) => {
              const r = row(item);
              return (
                <li key={getKey(item)} className="py-1">
                  <button
                    type="button"
                    onClick={() => open(item)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]"
                  >
                    <span className="min-w-0 flex-1">
                      {/* Titles wrap instead of truncating: an order number's unique part is its end. */}
                      <span className="block text-[15px] font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere] dark:text-[var(--dark-text)]">{r.title}</span>
                      {r.subtitle ? (
                        <span className="mt-0.5 block truncate text-[13px] text-gray-600 dark:text-[var(--dark-muted)]">{r.subtitle}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {r.meta != null ? (
                        <span className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-[var(--dark-text)]">{r.meta}</span>
                      ) : null}
                      {r.status || null}
                    </span>
                    <HiChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  </button>
                  {r.action ? <RowAction action={r.action} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal show={Boolean(sheet)} onClose={() => setSheetItem(null)} size="md" dismissible>
        <ModalHeader>{sheet?.title}</ModalHeader>
        <ModalBody>
          {sheet?.subtitle ? <p className="mb-3 text-sm text-gray-600 dark:text-[var(--dark-muted)]">{sheet.subtitle}</p> : null}
          <dl className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
            {(sheet?.details || []).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <dt className="text-gray-600 dark:text-[var(--dark-muted)]">{label}</dt>
                <dd className="text-right font-medium text-gray-900 dark:text-[var(--dark-text)]">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </ModalBody>
        {sheet?.action ? (
          <ModalFooter>
            <RowAction action={sheet.action} onDone={() => setSheetItem(null)} block />
          </ModalFooter>
        ) : null}
      </Modal>
    </>
  );
}

function RowAction({ action, onDone, block = false }) {
  const tone = action.tone === 'danger'
    ? 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-300'
    : action.tone === 'primary'
      ? 'border-transparent bg-[#3D1800] text-white dark:bg-amber-500 dark:text-[#1c0a00]'
      : 'border-[var(--ncdms-hairline,#e2d7c8)] text-gray-800 dark:border-white/15 dark:text-[var(--dark-text)]';
  return (
    <div className={block ? 'w-full' : 'pb-2 pl-1'}>
      <button
        type="button"
        disabled={action.disabled}
        onClick={async () => { await action.onClick(); onDone?.(); }}
        className={`${block ? 'w-full' : ''} inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${tone}`}
      >
        {action.label}
      </button>
    </div>
  );
}
