/**
 * Phone layout for the lines of a document (PO items, GRN items, report breakdowns), shown beside
 * the desktop table, which is hidden below `md`. A 4-column table inside a modal scrolls sideways at
 * 390px; one hairline row per line does not.
 *
 *   <LineItemList lines={items.map((it, i) => ({
 *     key: i, title: it.product_name, caption: `${it.quantity} × ${formatCurrency(it.unit_price)}`, value: formatCurrency(it.subtotal),
 *   }))} />
 *
 * `caption` is the quiet second line; `value` is the right-aligned figure; `extra` is optional
 * further text under the caption (e.g. a note or a variance).
 */
export default function LineItemList({ lines }) {
  return (
    <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10 md:hidden">
      {lines.map((line) => (
        <li key={line.key} className="flex items-start justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-[var(--dark-text)]">{line.title}</p>
            {line.caption ? <p className="mt-0.5 text-xs text-gray-600 dark:text-[var(--dark-muted)]">{line.caption}</p> : null}
            {line.extra ? <p className="mt-0.5 text-xs text-gray-600 dark:text-[var(--dark-muted)]">{line.extra}</p> : null}
          </div>
          {line.value != null ? (
            <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-[var(--dark-text)]">{line.value}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
