import { Spinner } from 'flowbite-react';
import {
  HiOutlineCheckCircle,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlinePhotograph,
  HiOutlineUser,
} from 'react-icons/hi';
import { formatDateTime } from '@/utils/formatDate';

function CoordinateText({ lat, lng }) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return <span className="text-xs text-gray-400">No GPS capture</span>;
  }

  return (
    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
      {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
    </span>
  );
}

export default function ProofOfDeliveryPanel({
  proof,
  loading = false,
  title = 'Proof of Delivery',
  emptyMessage = 'No rider-submitted proof of delivery has been recorded yet.',
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10">
      <div className="mb-3 flex items-center gap-2">
        <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600" />
        <div>
          <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{title}</h3>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Rider-submitted delivery evidence for office review.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" color="success" />
        </div>
      ) : !proof ? (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 px-4 py-5 text-sm text-gray-500 dark:border-emerald-900/40 dark:bg-gray-900/40 dark:text-gray-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white dark:border-emerald-900/40 dark:bg-gray-900/60">
              {proof.photo_url ? (
                <a href={proof.photo_url} target="_blank" rel="noreferrer">
                  <img
                    src={proof.photo_url}
                    alt={`Delivery proof for order ${proof.order_number || proof.order_id}`}
                    className="h-72 w-full object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-gray-400">
                  No delivery photo
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  label: 'Recipient',
                  icon: HiOutlineUser,
                  value: proof.recipient_name || proof.customer_name || 'Not recorded',
                },
                {
                  label: 'Signed At',
                  icon: HiOutlineCheckCircle,
                  value: proof.signed_at
                    ? formatDateTime(proof.signed_at)
                    : (proof.pod_created_at ? formatDateTime(proof.pod_created_at) : 'Not recorded'),
                },
                {
                  label: 'Courier',
                  icon: HiOutlinePhotograph,
                  value: proof.courier_name || proof.rider_name || 'Not recorded',
                },
                {
                  label: 'GPS',
                  icon: HiOutlineLocationMarker,
                  value: <CoordinateText lat={proof.gps_lat} lng={proof.gps_lng} />,
                },
              ].map(({ label, icon: Icon, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/80 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/70"
                >
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </p>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/70">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Warehouse Route
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Source:</span>{' '}
                  <span className="text-gray-600 dark:text-gray-300">
                    {proof.source_warehouse_name || 'Not recorded'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Destination:</span>{' '}
                  <span className="text-gray-600 dark:text-gray-300">
                    {proof.target_warehouse_name || proof.partner_name || 'Not recorded'}
                  </span>
                </div>
                {proof.courier_tracking_number && (
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Tracking Ref:</span>{' '}
                    <span className="font-mono text-gray-600 dark:text-gray-300">{proof.courier_tracking_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/70">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <HiOutlinePencil className="h-3.5 w-3.5" />
                Recipient Signature
              </p>
              {proof.recipient_signature ? (
                <img
                  src={proof.recipient_signature}
                  alt={`Recipient signature for order ${proof.order_number || proof.order_id}`}
                  className="h-28 w-full rounded-lg border border-gray-100 bg-white object-contain p-2 dark:border-gray-800"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-sm text-gray-400 dark:border-gray-800">
                  No signature image saved in this environment.
                </div>
              )}
            </div>
          </div>

          {proof.notes && (
            <div className="rounded-xl border border-white/80 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Rider Notes
              </p>
              {proof.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
