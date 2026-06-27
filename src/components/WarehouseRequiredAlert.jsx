import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiHome } from 'react-icons/fi';
import api from '@/services/api';
import { WAREHOUSES } from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';

/**
 * Production safeguard: a portal account must have a warehouse/storage assigned
 * before it can hold inventory or fulfil orders. This pops a blocking alert when
 * the signed-in user's scope has zero warehouses — even with no orders yet — so
 * an admin/stockist can't operate with a vague/missing stock source. Pairs with
 * the backend guard that refuses to place an order when no source warehouse
 * resolves.
 */
export default function WarehouseRequiredAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [needsWarehouse, setNeedsWarehouse] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNeedsWarehouse(false);
    setDismissed(false);
    if (!user) return undefined;

    api
      .get(WAREHOUSES.LIST, { params: { limit: 1 } })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const total = res.data?.pagination?.total ?? list.length;
        if (!cancelled) setNeedsWarehouse(Number(total) === 0);
      })
      .catch(() => {
        // Network/permission errors should never trap the user behind the alert.
        if (!cancelled) setNeedsWarehouse(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  if (!user || !needsWarehouse || dismissed) return null;

  const isAdmin = user.role_slug === 'super_admin';
  const target = isAdmin ? '/main/warehouses' : '/stockist/warehouses';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <FiAlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-center text-lg font-bold text-gray-900">No warehouse assigned</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
          This account has no warehouse/storage set up yet. Inventory, products, and
          order fulfilment all need a warehouse first. Assign one to continue using
          the system safely.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { navigate(target); setDismissed(true); }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <FiHome className="h-4 w-4" />
            Assign a Warehouse
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
