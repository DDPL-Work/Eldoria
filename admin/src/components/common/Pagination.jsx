import React, { useState, useMemo } from 'react';

/**
 * Reusable Advance Pagination Component
 * Features:
 * - Rows per page dropdown selector (10, 25, 50, 100)
 * - Dynamic "Showing X–Y of Z [items]" summary
 * - First (««), Previous (‹ Prev), Next (Next ›), and Last (»») buttons
 * - Smart windowed page number buttons with active navy styling (#0E2F5A)
 * - Direct "Go to page [ ]" quick jump input
 * - Fully responsive for mobile and desktop screens
 */
export function Pagination({
  currentPage = 1,
  pageSize = 10,
  totalCount = 0,
  totalPages: propTotalPages,
  onPageChange,
  onPageSizeChange,
  itemName = 'items',
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}) {
  const [jumpInput, setJumpInput] = useState('');

  const totalPages =
    propTotalPages !== undefined && propTotalPages > 0
      ? propTotalPages
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalCount);

  // Generate smart windowed page numbers array: e.g. [1, 2, 3, 4, 5, '...', 12]
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  }, [safeCurrentPage, totalPages]);

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange?.(target);
      setJumpInput('');
    }
  };

  if (totalCount <= 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-600 select-none ${className}`}
    >
      {/* Left: Rows per page selector + Showing X-Y of Z */}
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange?.(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer transition shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className={`text-slate-500 font-medium ${
            onPageSizeChange ? 'border-l border-slate-200 pl-3' : ''
          }`}
        >
          Showing{' '}
          <span className="font-bold text-slate-900">{startItem}–{endItem}</span>{' '}
          of <span className="font-bold text-slate-900">{totalCount}</span>{' '}
          {itemName}
        </div>
      </div>

      {/* Right: Page navigation buttons + Quick Jump */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange?.(1)}
          disabled={safeCurrentPage <= 1}
          className="h-8 px-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer font-bold text-xs"
          title="First page"
        >
          ««
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange?.(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer font-semibold text-xs flex items-center gap-1"
          title="Previous page"
        >
          <span>‹</span>
          <span className="hidden md:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-7 h-8 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                >
                  …
                </span>
              );
            }
            const isCurrent = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange?.(p)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0E2F5A] text-white shadow-xs'
                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange?.(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer font-semibold text-xs flex items-center gap-1"
          title="Next page"
        >
          <span className="hidden md:inline">Next</span>
          <span>›</span>
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange?.(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 px-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer font-bold text-xs"
          title="Last page"
        >
          »»
        </button>

        {/* Quick Jump Input if more than 3 pages */}
        {totalPages > 3 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1 pl-2 border-l border-slate-200 hidden lg:flex"
          >
            <span className="text-[11px] text-slate-400">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={String(safeCurrentPage)}
              className="w-12 h-8 text-center text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0E2F5A] py-1"
            />
            <button
              type="submit"
              disabled={!jumpInput}
              className="h-8 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition disabled:opacity-40 cursor-pointer"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
