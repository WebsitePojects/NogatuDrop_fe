import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const DataTable = ({
  headers = [],
  rows = [],
  renderRow,
  emptyMessage = 'No data available',
  pagination,
  onPageChange,
  className = '',
}) => {
  const totalPages = pagination?.totalPages || pagination?.total_pages || 0;

  return (
    <div className={`workspace-table-shell overflow-hidden rounded-[1.6rem] border border-[#eedfce] bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.22)] dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)] ${className}`}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="text-left whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[var(--dark-border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-14 text-center text-[#a0846d] dark:text-[var(--dark-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => renderRow(row, index))
            )}
          </tbody>
        </table>
      </div>
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-[var(--dark-border)]">
          <span className="text-sm text-[#8d6b51] dark:text-[var(--dark-muted)]">
            Page {pagination.page} of {totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-[#ead9c7] bg-white/80 p-2 text-[#8d6b51] transition hover:bg-[#fff5ea] disabled:cursor-not-allowed disabled:opacity-30 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-muted)]"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="rounded-xl border border-[#ead9c7] bg-white/80 p-2 text-[#8d6b51] transition hover:bg-[#fff5ea] disabled:cursor-not-allowed disabled:opacity-30 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-muted)]"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
