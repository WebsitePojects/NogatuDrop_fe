import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabItem, Spinner } from 'flowbite-react';
import { HiDownload } from 'react-icons/hi';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { REPORTS, ORDERS, INVENTORY } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { CHART_COLORS } from '@/utils/constants';

const STATUS_PIE_COLORS = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  delivering: '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
  rejected: '#F87171',
};

export default function StockistReports() {
  const { toasts, showToast, dismiss } = useToast();
  const [revenueData, setRevenueData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [movementsData, setMovementsData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, purchRes, prodRes, movRes] = await Promise.allSettled([
        api.get(REPORTS.REVENUE, { params: { from: dateFrom, to: dateTo } }),
        api.get(REPORTS.PURCHASES, { params: { from: dateFrom, to: dateTo } }),
        api.get(REPORTS.PRODUCTS, { params: { from: dateFrom, to: dateTo } }),
        api.get(REPORTS.MOVEMENTS, { params: { from: dateFrom, to: dateTo } }),
      ]);

      if (revRes.status === 'fulfilled') {
        const d = revRes.value.data.data;
        setRevenueData(d?.monthly || d?.revenue || []);
      }
      if (purchRes.status === 'fulfilled') {
        const d = purchRes.value.data.data;
        const purchases = d?.purchases || d || [];
        setOrdersData(Array.isArray(purchases) ? purchases : []);
        // Status breakdown
        const statusMap = {};
        purchases.forEach(o => {
          statusMap[o.status] = (statusMap[o.status] || 0) + 1;
        });
        setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
      }
      if (prodRes.status === 'fulfilled') {
        const d = prodRes.value.data.data;
        setInventoryData(d?.products || d || []);
      }
      if (movRes.status === 'fulfilled') {
        const d = movRes.value.data.data;
        setMovementsData(d?.movements || d || []);
      }
    } catch {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExportPDF = () => window.print();

  const DateFilter = () => (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
        />
      </div>
      <button
        onClick={handleExportPDF}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        <HiDownload className="w-4 h-4" />
        Export PDF
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FFF8F0' }}>
        <Spinner size="xl" color="warning" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your business performance (scoped to your account)</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Tabs aria-label="Reports tabs" variant="underline">
          {/* Revenue Tab */}
          <TabItem title="Revenue">
            <div className="p-4">
              <DateFilter />
              <div className="bg-gray-50 rounded-xl p-5 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue</p>
                {revenueData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Month', 'Orders', 'Revenue', 'Avg Order'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.map((row, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-amber-50/30">
                        <td className="px-4 py-2.5 font-medium">{row.month}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row.order_count || 0}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{formatCurrency(row.revenue || 0)}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {row.order_count ? formatCurrency((row.revenue || 0) / row.order_count) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabItem>

          {/* Orders Tab */}
          <TabItem title="Orders">
            <div className="p-4">
              <DateFilter />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Order Status Breakdown</p>
                  {statusBreakdown.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {statusBreakdown.map((entry, i) => (
                            <Cell key={i} fill={STATUS_PIE_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="overflow-x-auto bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Status Summary</p>
                  <div className="space-y-2">
                    {statusBreakdown.map(({ name, value }) => (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-gray-600">{name}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Order #', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-amber-50/30">
                        <td className="px-4 py-2.5 font-mono text-xs">{row.order_number || `#${row.id}`}</td>
                        <td className="px-4 py-2.5 font-semibold">{formatCurrency(row.total_amount || 0)}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{row.status}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabItem>

          {/* Inventory Tab */}
          <TabItem title="Inventory">
            <div className="p-4">
              <DateFilter />
              <div className="bg-gray-50 rounded-xl p-5 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">Stock Levels by Product</p>
                {inventoryData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventoryData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="current_stock" fill="#10B981" radius={[0, 4, 4, 0]} name="Stock" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Product', 'On Hand', 'Reserved', 'Available', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((row, i) => {
                      const avail = (row.current_stock || 0) - (row.reserved_stock || 0);
                      return (
                        <tr key={i} className="border-t border-gray-50 hover:bg-amber-50/30">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{row.product_name}</td>
                          <td className="px-4 py-2.5 font-semibold">{row.current_stock || 0}</td>
                          <td className="px-4 py-2.5 text-amber-600">{row.reserved_stock || 0}</td>
                          <td className={`px-4 py-2.5 font-semibold ${avail <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {avail}
                          </td>
                          <td className="px-4 py-2.5 capitalize text-gray-500 text-xs">{row.status || 'in_stock'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabItem>

          {/* Movements Tab */}
          <TabItem title="Movements">
            <div className="p-4">
              <DateFilter />
              <div className="bg-gray-50 rounded-xl p-5 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">Stock In/Out Over Time</p>
                {movementsData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={movementsData}>
                      <defs>
                        <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="stock_in" stroke="#10B981" fill="url(#inGrad)" name="Stock In" strokeWidth={2} />
                      <Area type="monotone" dataKey="stock_out" stroke="#EF4444" fill="url(#outGrad)" name="Stock Out" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Date', 'Product', 'Type', 'Qty', 'Reference'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movementsData.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-amber-50/30">
                        <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(row.created_at || row.date)}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{row.product_name || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            row.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {row.movement_type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold">{row.quantity || 0}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{row.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabItem>
        </Tabs>
      </div>
    </div>
  );
}
