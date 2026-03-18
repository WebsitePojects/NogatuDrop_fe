import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { FiDownload } from 'react-icons/fi';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';

const Reports = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(REPORTS.REVENUE);
        const weekly = Array.isArray(data?.data?.weekly_trend) ? data.data.weekly_trend : [];
        const normalized = weekly.map((row) => ({
          label: row.week_label,
          revenue: Number(row.revenue || 0),
          order_count: Number(row.order_count || 0),
        }));
        setRevenueData(normalized);
      } catch {
        setRevenueData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">REPORTS AND ANALYTICS</h1>
          <p className="text-sm text-gray-500 mt-1">Business insights and performance metrics</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <FiDownload /> + Export
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Revenue Trend - Area Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#d946ef"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                  dot={{ fill: '#d946ef', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Revenue - Stacked Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="revenue" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} name="Revenue" />
                <Bar dataKey="order_count" stackId="a" fill="#f9a8d4" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
