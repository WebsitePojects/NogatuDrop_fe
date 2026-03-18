import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FiShoppingCart, FiClipboard, FiBarChart2, FiDownload } from 'react-icons/fi';
import api from '@/services/api';
import { DASHBOARD } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

const Dashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [kpiRes, ordersRes] = await Promise.all([
        api.get(DASHBOARD.KPIS),
        api.get(DASHBOARD.RECENT_ORDERS),
      ]);
      setKpis(kpiRes.data.data || {});
      setRecentOrders(ordersRes.data.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Purchase History - line chart data (Mon-Sun)
  const purchaseHistory = [
    { day: 'Mon', value: 400 },
    { day: 'Tue', value: 320 },
    { day: 'Wed', value: 180 },
    { day: 'Thu', value: 80 },
    { day: 'Fri', value: 140 },
    { day: 'Sat', value: 260 },
    { day: 'Sun', value: 300 },
  ];

  // Rates - stacked bar chart
  const ratesData = [
    { name: 'Q1', a: 200, b: 150, c: 100 },
    { name: 'Q2', a: 180, b: 200, c: 120 },
    { name: 'Q3', a: 220, b: 130, c: 160 },
    { name: 'Q4', a: 260, b: 180, c: 140 },
    { name: 'Q5', a: 200, b: 160, c: 110 },
    { name: 'Q6', a: 240, b: 190, c: 130 },
  ];

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>WELCOME, PARTNER!</h1>
            <p className="text-sm text-gray-500 mt-1">Here's your account overview</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <FiDownload className="text-gray-600" />
            Export as PDF
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: loading ? '—' : formatCurrency(kpis?.total_revenue || 0) },
            { label: 'Inventory Value', value: loading ? '—' : formatCurrency(kpis?.inventory_value || 0) },
            { label: 'Pending Orders', value: loading ? '—' : (kpis?.pending_orders ?? 0) },
            { label: 'Active Partners', value: loading ? '—' : (kpis?.active_partners ?? 0) },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/partner/cart')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all"
              style={{ background: '#4A3000', color: '#fff', borderColor: '#4A3000' }}
            >
              <FiShoppingCart className="text-lg" />
              SHOPPING CART
            </button>
            <button
              onClick={() => navigate('/partner/orders')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all bg-white hover:bg-gray-50"
              style={{ borderColor: '#ccc', color: '#333' }}
            >
              <FiClipboard className="text-lg" />
              ORDERS
            </button>
            <button
              onClick={() => navigate('/partner/reports')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all bg-white hover:bg-gray-50"
              style={{ borderColor: '#ccc', color: '#333' }}
            >
              <FiBarChart2 className="text-lg" />
              REPORTS
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Purchase History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Purchase History</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={purchaseHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  dot={{ fill: '#FF8C00', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Rates</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="a" stackId="s" fill="#FF8C00" />
                <Bar dataKey="b" stackId="s" fill="#6C9BD2" />
                <Bar dataKey="c" stackId="s" fill="#E8C4A0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Recent Orders</p>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No recent orders.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(order.total_amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
