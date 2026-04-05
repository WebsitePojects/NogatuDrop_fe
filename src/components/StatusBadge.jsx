const STATUS_MAP = {
  pending:      'badge-pending',
  approved:     'badge-approved',
  delivering:   'badge-delivering',
  in_transit:   'badge-delivering',
  delivered:    'badge-delivered',
  cancelled:    'badge-cancelled',
  rejected:     'badge-rejected',
  paid:         'badge-paid',
  unpaid:       'badge-unpaid',
  active:       'badge-active',
  inactive:     'badge-inactive',
  suspended:    'badge-suspended',
  draft:        'badge-draft',
  completed:    'badge-completed',
  discrepancy:  'badge-discrepancy',
};

const LABELS = {
  pending:      'Pending',
  approved:     'Approved',
  delivering:   'Delivering',
  in_transit:   'In Transit',
  delivered:    'Delivered',
  cancelled:    'Cancelled',
  rejected:     'Rejected',
  paid:         'Paid',
  unpaid:       'Unpaid',
  active:       'Active',
  inactive:     'Inactive',
  suspended:    'Suspended',
  draft:        'Draft',
  completed:    'Completed',
  discrepancy:  'Discrepancy',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  const cls = STATUS_MAP[key] || 'badge-inactive';
  const label = LABELS[key] || status;
  return <span className={cls}>{label}</span>;
}
