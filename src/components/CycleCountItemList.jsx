const FIELD_CLASS = 'block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-base text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-text)]';

/**
 * Phone layout for a cycle count's lines (the 7-column review table would scroll sideways).
 * Render it beside the desktop table, which is hidden below `md`.
 *
 * `editable` turns the counted quantity and notes into inputs (draft counts only). Inputs are 16px
 * and 44px tall so iOS does not zoom on focus and thumbs can hit them.
 */
export default function CycleCountItemList({ items, editable = false, showReserved = false, onChange }) {
  return (
    <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10 md:hidden">
      {items.map((item) => {
        const variance = Number(item.variance_qty || 0);
        return (
          <li key={item.id} className="space-y-2 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-[var(--dark-text)]">{item.product_name}</p>
                <p className="font-mono text-xs text-gray-600 dark:text-[var(--dark-muted)]">{item.sku}</p>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${variance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {variance > 0 ? '+' : ''}{item.variance_qty}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">
              System {item.system_qty}
              {editable ? '' : ` · Counted ${item.counted_qty}`}
              {showReserved ? ` · Reserved ${item.reserved_stock || 0}` : ''}
            </p>
            {editable ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-[var(--dark-text)]">
                  Counted qty
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.counted_qty}
                    onChange={(e) => onChange(item.id, { counted_qty: e.target.value })}
                    className={`${FIELD_CLASS} mt-1 min-h-[44px]`}
                  />
                </label>
                <label className="block text-xs font-medium text-gray-700 dark:text-[var(--dark-text)]">
                  Notes
                  <textarea
                    rows={2}
                    value={item.notes || ''}
                    onChange={(e) => onChange(item.id, { notes: e.target.value })}
                    className={`${FIELD_CLASS} mt-1 py-2`}
                  />
                </label>
              </div>
            ) : item.notes ? (
              <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{item.notes}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
