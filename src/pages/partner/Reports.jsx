import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';

const Reports = () => {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [kpis, setKpis] = useState({ total_orders: 0, total_spent: 0, avg_order_value: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [purchasesRes, productsRes] = await Promise.all([
        api.get(REPORTS.PURCHASES),
        api.get(REPORTS.PRODUCTS),
      ]);

      const purchaseData = Array.isArray(purchasesRes?.data?.data?.purchases)
        ? purchasesRes.data.data.purchases
        : [];
      const productData = Array.isArray(productsRes?.data?.data?.products)
        ? productsRes.data.data.products
        : [];

      setPurchases(purchaseData);
      setProducts(productData);

      // Derive KPIs from purchases data
      const totalOrders = purchaseData.length;
      const totalSpent = purchaseData.reduce((s, d) => s + Number(d.total_amount || d.amount || d.total || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      setKpis({ total_orders: totalOrders, total_spent: totalSpent, avg_order_value: avgOrderValue });
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Monthly spend trend data
  const monthlyData = Array.isArray(purchases) && purchases.length > 0
    ? purchases.map((d) => ({
        month: d.month || d.label || d.period || (d.created_at ? d.created_at.slice(0, 7) : 'N/A'),
        spend: Number(d.total_amount || d.amount || d.total || 0),
      }))
    : [
        { month: 'Sep', spend: 380 },
        { month: 'Oct', spend: 420 },
        { month: 'Nov', spend: 310 },
        { month: 'Dec', spend: 180 },
        { month: 'Jan', spend: 90 },
        { month: 'Feb', spend: 230 },
        { month: 'Mar', spend: 314 },
        { month: 'Apr', spend: 274 },
      ];

  // Purchase by product - stacked bar
  const productBarData = Array.isArray(products) && products.length > 0
    ? products.map((p) => ({
        name: p.product_name || p.name,
        value: Number(p.total_amount || p.amount || 0),
        qty: Number(p.total_qty || p.quantity || 0),
      }))
    : [];

  // Quantity by product - horizontal bar
  const qtyData = Array.isArray(products) && products.length > 0
    ? products.map((p) => ({
        name: p.product_name || p.name,
        qty: Number(p.total_qty || p.quantity || 0),
      }))
    : [];

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>PURCHASE REPORTS</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze your purchasing patterns</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {loading ? '—' : kpis.total_orders}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {loading ? '—' : formatCurrency(kpis.total_spent)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">Average Order Value</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {loading ? '—' : formatCurrency(kpis.avg_order_value)}
            </p>
          </div>
        </div>

        {/* Monthly Spend Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend Trend</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#9C27B0" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#9C27B0"
                strokeWidth={2}
                fill="url(#spendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Purchase by Product */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Purchase by Product</p>
            {productBarData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Amount" fill="#FF8C00" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quantity Purchased by Product - Horizontal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Quantity Purchased by Product</p>
            {qtyData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={qtyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="qty" name="Quantity" fill="#8BC34A" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
