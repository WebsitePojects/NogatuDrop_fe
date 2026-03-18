import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { FiDownload } from 'react-icons/fi';
import api from '@/services/api';
import { REPORTS, DASHBOARD } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { STATUS_BADGE, CHART_COLORS } from '@/utils/constants';

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [inventoryDist, setInventoryDist] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [kpiRes, trendRes, distRes, ordersRes] = await Promise.allSettled([
          api.get(DASHBOARD.KPIS),
          api.get(REPORTS.REVENUE),
          api.get(REPORTS.PRODUCTS),
          api.get(DASHBOARD.RECENT_ORDERS),
        ]);
        if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value.data.data);
        if (trendRes.status === 'fulfilled') setRevenueTrend(trendRes.value.data.data || []);
        if (distRes.status === 'fulfilled') {
          const dist = (distRes.value.data.data || []).map((row) => ({
            name: row.product_name,
            value: Number(row.total_qty || 0),
          }));
          setInventoryDist(dist);
        }
        if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data.data || []);
      } catch {
        // handled individually
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF3E0' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">DASHBOARD</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your inventory and operations</p>
        </div>
        <button
          onClick={() => alert('PDF export not yet configured.')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiDownload className="text-base" />
          Export as PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Revenue', value: formatCurrency(kpis?.total_revenue || 0) },
          { title: 'Inventory Value', value: formatCurrency(kpis?.inventory_value || 0) },
          { title: 'Pending Orders', value: kpis?.pending_orders ?? 0 },
          { title: 'Active Partners', value: kpis?.active_partners ?? 0 },
        ].map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Weekly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF8C00"
                strokeWidth={2.5}
                dot={{ fill: '#FF8C00', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Inventory Distribution by Product</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {inventoryDist.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No recent orders</div>
          ) : (
            recentOrders.map((order) => {
              const sBadge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.partner_name || order.business_name || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(order.total_amount)}</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${sBadge.bg} ${sBadge.text}`}>
                      {sBadge.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
