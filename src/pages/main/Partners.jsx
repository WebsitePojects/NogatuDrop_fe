import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiMapPin, FiMail, FiPhone } from 'react-icons/fi';
import api from '@/services/api';
import { PARTNERS } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { PARTNER_TYPES } from '@/utils/constants';

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    partner_type: 'distributor',
    credit_limit: '',
  });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PARTNERS.LIST, { params: { limit: 50 } });
      setPartners(data.data || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(PARTNERS.CREATE, {
        ...form,
        credit_limit: Number(form.credit_limit) || 0,
      });
      setShowModal(false);
      fetchPartners();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add partner');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setForm({ business_name: '', email: '', phone: '', address: '', partner_type: 'distributor', credit_limit: '' });
    setShowModal(true);
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">PARTNERS MANAGEMENT</h1>
          <p className="text-sm text-gray-500 mt-1">Manage distributor and reseller accounts</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiPlus />Add a Partner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No partners found</div>
      ) : (
        <div className="space-y-4">
          {partners.map((partner) => {
            const typeBadge = PARTNER_TYPES[partner.partner_type] || PARTNER_TYPES.distributor;
            const creditUsed = Number(partner.credit_used || 0);
            const creditLimit = Number(partner.credit_limit || 1);
            const creditPct = Math.min(Math.round((creditUsed / creditLimit) * 100), 100);

            return (
              <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                {/* Partner Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{partner.business_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeBadge.bg} ${typeBadge.text}`}>
                        {typeBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
                  {partner.address && (
                    <div className="flex items-center gap-1.5">
                      <FiMapPin className="text-orange-500" />
                      <span>{partner.address}</span>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center gap-1.5">
                      <FiMail className="text-orange-500" />
                      <span>{partner.email}</span>
                    </div>
                  )}
                  {partner.phone && (
                    <div className="flex items-center gap-1.5">
                      <FiPhone className="text-orange-500" />
                      <span>{partner.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Total Orders</p>
                    <p className="text-sm font-bold text-gray-800">{partner.total_orders ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Spent</p>
                    <p className="text-sm font-bold text-gray-800">{(partner.total_spent || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pending</p>
                    <p className="text-sm font-bold text-gray-800">{partner.pending_orders ?? 0}</p>
                  </div>
                </div>

                {/* Credit Utilization */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-gray-500">Credit Utilization</p>
                    <p className="text-xs text-gray-500">
                      {creditUsed.toLocaleString()} / {creditLimit.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${creditPct}%`,
                        backgroundColor: creditPct >= 90 ? '#ef4444' : creditPct >= 70 ? '#f59e0b' : '#FF8C00',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{creditPct}% of credit limit used</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Partner Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ADD NEW PARTNER</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new partner account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Business Name</label>
            <input required type="text" placeholder="Business Name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input required type="email" placeholder="juan.delacruz@nogatu.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" placeholder="+63 912 345 6789" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input type="text" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Partner Type</label>
            <select value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })} className={inputCls}>
              <option value="distributor">Distributor</option>
              <option value="reseller">Reseller</option>
              <option value="retailer">Retailer</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Credit Limit</label>
            <input type="number" min="0" placeholder="Amount" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Adding...' : 'ADD PARTNER'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Partners;
