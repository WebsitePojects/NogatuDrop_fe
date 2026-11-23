import { useEffect, useState } from 'react';
import { FiUser, FiLock, FiCheckCircle } from 'react-icons/fi';
import api from '@/services/api';
import { MEMBERS } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import PasswordInput from '@/components/PasswordInput';

const inputClass = 'w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-gray-900 placeholder-gray-500';

/**
 * "Nogatu Alliance member? Sign in for the member price." The buyer types their nogatualliance.com username
 * AND password; the server has nogatualliance.com check them and returns a short-lived member pass, which the
 * order must carry for the discount. A username alone gets nothing. The password lives only in this form and
 * is cleared after each try. Hidden entirely while the server has no member check set up.
 *
 * `member` is { pass, username, discountPct, expiresAt } or null; `onChange` receives the next value.
 */
export default function MemberDiscountSignIn({ member, onChange, disabled = false }) {
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const verifying = useSubmitGuard();

  useEffect(() => {
    let active = true;
    api.get(MEMBERS.DISCOUNT)
      .then(({ data }) => { if (active) setConfig(data.data); })
      .catch(() => { if (active) setConfig({ enabled: false }); });
    return () => { active = false; };
  }, []);

  if (!config?.enabled) return null;

  const verify = () => verifying.run(async () => {
    setError('');
    if (!username.trim() || !password) { setError('Enter your Nogatu Alliance username and password.'); return; }
    try {
      const { data } = await api.post(MEMBERS.VERIFY, { username: username.trim(), password });
      onChange({
        pass: data.data.member_pass,
        username: data.data.username,
        discountPct: data.data.discount_pct,
        expiresAt: Date.now() + data.data.expires_in_seconds * 1000,
      });
      setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'We could not check your membership. Please try again.');
    } finally {
      setPassword('');
    }
  });

  if (member) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
        <span className="flex items-center gap-2">
          <FiCheckCircle className="h-4 w-4 shrink-0" />
          Member price for <strong>{member.username}</strong>: {member.discountPct}% off products
        </span>
        <button type="button" disabled={disabled} onClick={() => onChange(null)} className="text-xs font-semibold text-emerald-900 underline disabled:opacity-50">
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="text-left text-sm font-semibold text-amber-800 hover:underline disabled:opacity-50">
        Nogatu Alliance member? Sign in for {config.discount_pct}% off products
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-xs text-gray-700">
        Sign in with your nogatualliance.com username and password. We only check that you are an active member; your password is not kept.
      </p>
      <div className="relative">
        <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input id="memberUsername" type="text" autoComplete="off" aria-label="Nogatu Alliance username" placeholder="Nogatu Alliance username"
          maxLength={100} disabled={disabled || verifying.submitting} value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
      </div>
      <div className="relative">
        <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <PasswordInput id="memberPassword" autoComplete="off" aria-label="Nogatu Alliance password" placeholder="Nogatu Alliance password"
          maxLength={200} disabled={disabled || verifying.submitting} value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } }} className={inputClass.replace(' pr-4', '')} />
      </div>
      {error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={verify} disabled={disabled || verifying.submitting}
          className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50">
          {verifying.submitting ? 'Checking…' : 'Check membership'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(''); setPassword(''); }} disabled={verifying.submitting}
          className="text-sm text-gray-600 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
