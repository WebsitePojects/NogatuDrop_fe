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
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-gray-400">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
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
