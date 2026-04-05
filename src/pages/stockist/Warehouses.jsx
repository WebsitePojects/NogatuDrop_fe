/**
 * Stockist: My Warehouses — view warehouses associated with this stockist
 */
import { useState, useEffect } from 'react';
import { Card, Button, Modal, ModalHeader, ModalBody, ModalFooter, Badge } from 'flowbite-react';
import {
  HiOutlineOfficeBuilding, HiOutlineLocationMarker, HiOutlineUser,
  HiOutlinePhone, HiOutlineMail, HiOutlineEye, HiOutlineRefresh,
} from 'react-icons/hi';
import api from '@/services/api';
import { WAREHOUSES, INVENTORY } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import StatusBadge from '@/components/StatusBadge';
import { ToastContainer, useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';

export default function StockistWarehouses() {
  const { toasts, showToast, dismiss } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(WAREHOUSES.LIST);
      setWarehouses(data.data || []);
    } catch {
      showToast('Failed to load warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const openWarehouse = async (wh) => {
    setSelected(wh);
    setViewModal(true);
    setInvLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, { params: { warehouse_id: wh.id, limit: 50 } });
      setWarehouseInventory(data.data || []);
    } catch {
      setWarehouseInventory([]);
    } finally {
      setInvLoading(false);
    }
  };

  const capacityPct = (wh) => wh.capacity_total > 0
    ? Math.min(100, Math.round((wh.capacity_used / wh.capacity_total) * 100))
    : 0;

  const capacityColor = (pct) => pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="page-enter">
      <PageHeader
        title="My Warehouses"
        subtitle="Warehouses associated with your stockist account"
        actions={[
          {
            label: 'Refresh',
            icon: <HiOutlineRefresh className="w-4 h-4" />,
            onClick: fetchWarehouses,
            color: 'light',
          },
        ]}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="kpi-card h-48">
              <div className="space-y-3 w-full">
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <HiOutlineOfficeBuilding className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No Warehouses Found</h3>
          <p className="text-sm text-gray-500">Contact your administrator to assign a warehouse to your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => {
            const pct = capacityPct(wh);
            return (
              <div
                key={wh.id}
                className="bg-white rounded-xl border border-coffee-100 p-5 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
                onClick={() => openWarehouse(wh)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <HiOutlineOfficeBuilding className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{wh.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        wh.type === 'manufacturer' ? 'bg-purple-100 text-purple-700' :
                        wh.type === 'region' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {wh.type}
                      </span>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${wh.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                  <HiOutlineLocationMarker className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{wh.location}</span>
                </div>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Capacity</span>
                    <span>{pct}% used</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${capacityColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {(wh.capacity_used || 0).toLocaleString()} / {(wh.capacity_total || 0).toLocaleString()} units
                  </p>
                </div>

                {/* Manager */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <HiOutlineUser className="w-3.5 h-3.5" />
                  <span>{wh.manager_name || 'No manager assigned'}</span>
                </div>

                {/* View button */}
                <button className="mt-3 w-full py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                  View Details →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal show={viewModal} onClose={() => setViewModal(false)} size="2xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <HiOutlineOfficeBuilding className="w-5 h-5 text-amber-500" />
            <span>{selected?.name}</span>
          </div>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {selected && (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Type</p>
                  <p className="font-medium text-gray-900 capitalize">{selected.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${selected.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {selected.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                  <p className="font-medium text-gray-900">{selected.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Capacity</p>
                  <p className="font-medium text-gray-900">
                    {(selected.capacity_used || 0).toLocaleString()} / {(selected.capacity_total || 0).toLocaleString()} units
                  </p>
                </div>
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="font-medium">Storage Utilization</span>
                  <span>{capacityPct(selected)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${capacityColor(capacityPct(selected))}`}
                    style={{ width: `${capacityPct(selected)}%` }}
                  />
                </div>
              </div>

              {/* Manager info */}
              <div className="bg-coffee-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Warehouse Manager</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-bold text-sm">
                    {selected.manager_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{selected.manager_name || 'Not assigned'}</p>
                    {selected.manager_email && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <HiOutlineMail className="w-3 h-3" />{selected.manager_email}
                      </p>
                    )}
                    {selected.manager_phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <HiOutlinePhone className="w-3 h-3" />{selected.manager_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inventory table */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Current Inventory</p>
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-coffee-50">
                      <tr className="text-xs text-coffee-700 uppercase">
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-right">Stock</th>
                        <th className="px-3 py-2 text-right">Reserved</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invLoading ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Loading inventory...</td></tr>
                      ) : warehouseInventory.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No inventory records</td></tr>
                      ) : (
                        warehouseInventory.map((inv) => (
                          <tr key={inv.id} className="border-t border-gray-100">
                            <td className="px-3 py-2.5 font-medium text-gray-800">{inv.product_name || inv.product?.name}</td>
                            <td className={`px-3 py-2.5 text-right font-semibold ${
                              inv.status === 'out_of_stock' ? 'text-red-600' :
                              inv.status === 'low_stock' ? 'text-amber-600' : 'text-green-700'
                            }`}>{(inv.current_stock || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right text-gray-500">{(inv.reserved_stock || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center"><StatusBadge status={inv.status} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setViewModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
