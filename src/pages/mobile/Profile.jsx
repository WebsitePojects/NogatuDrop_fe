import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextInput, Label, Spinner } from 'flowbite-react';
import { HiUser, HiMail, HiPhone, HiPencil, HiX, HiCheck } from 'react-icons/hi';
import { FiLogOut } from 'react-icons/fi';
import { ToastContainer, useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { USERS } from '@/services/endpoints';

export default function MobileProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.put(USERS.UPDATE(user.id), { name: form.name, phone: form.phone });
      showToast('Profile updated successfully', 'success');
      setEditing(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = (user?.name || 'M')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white min-h-screen pb-24">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="px-4 py-8">
        {/* Avatar */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-3xl font-bold text-orange-500">{initials}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">Mobile Stockist</p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-5">
          {[
            { icon: HiUser, label: 'Name', value: user?.name },
            { icon: HiMail, label: 'Email', value: user?.email },
            { icon: HiPhone, label: 'Phone', value: user?.phone || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Edit Profile</h3>
            {editing ? (
              <button
                onClick={() => { setEditing(false); setForm({ name: user?.name || '', phone: user?.phone || '' }); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX size={18} />
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-orange-500 text-sm font-medium hover:text-orange-600"
              >
                <HiPencil size={14} />
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <Label value="Full Name" className="mb-1.5 text-xs" />
                <TextInput
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  sizing="sm"
                />
              </div>
              <div>
                <Label value="Phone Number" className="mb-1.5 text-xs" />
                <TextInput
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                  sizing="sm"
                />
              </div>
              <Button
                color="warning"
                size="sm"
                className="w-full mt-2"
                onClick={handleSave}
                disabled={saving}
              >
                <HiCheck className="mr-1.5 w-4 h-4" />
                Save Changes
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Tap Edit to update your name and phone number.</p>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-200 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-60"
        >
          {loggingOut ? (
            <Spinner size="sm" color="failure" />
          ) : (
            <FiLogOut size={16} />
          )}
          {loggingOut ? 'Logging out…' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}
