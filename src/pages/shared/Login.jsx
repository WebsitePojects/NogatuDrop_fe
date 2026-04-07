import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';

const POSTER   = '/assets/nogatuPoster_login.png';
const LOGO     = '/assets/dropshipping_nogatu_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const role = userData?.role_slug;
      if (role === 'super_admin')         navigate('/main/dashboard');
      else if (role === 'mobile_stockist') navigate('/mobile/dashboard');
      else                                navigate('/stockist/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Always light — login page never enters dark mode */
    <div className="flex min-h-screen" style={{ colorScheme: 'light', background: '#ffffff' }}>

      {/* ── Left panel: full-height poster ────────────────────────── */}
      <div className="hidden lg:block lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-shrink-0">
        <img
          src={POSTER}
          alt="Nogatu"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* subtle dark overlay so logo text reads clearly */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Brand tag bottom-left */}
        <div className="absolute bottom-10 left-10 text-white">
          <div className="flex items-center gap-3 mb-3">
            <img src={LOGO} alt="Nogatu" className="w-10 h-10 rounded-xl shadow-lg" />
            <div>
              <p className="text-xs font-semibold tracking-widest text-amber-300 uppercase">NCDMS</p>
              <p className="text-lg font-bold leading-tight">Nogatu Centralized<br />Distribution</p>
            </div>
          </div>
          <p className="text-sm text-white/60 max-w-xs leading-relaxed">
            From province to doorstep — inventory, orders,<br />and deliveries in one place.
          </p>
        </div>
      </div>

      {/* ── Right panel: clean form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white">

        {/* Mobile logo (shown below lg) */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <img src={LOGO} alt="Nogatu" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-bold text-gray-900 text-sm">NCDMS</p>
            <p className="text-xs text-gray-400">Distribution System</p>
          </div>
        </div>

        <div className="w-full max-w-[360px]">

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
            Welcome back.
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Sign in to your account to continue
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 tracking-wide uppercase">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-0 py-2.5 bg-transparent border-0 border-b-2 border-gray-200 focus:border-amber-500 focus:outline-none text-gray-900 text-sm placeholder-gray-300 transition-colors"
                style={{ colorScheme: 'light' }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-500 tracking-wide uppercase">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-0 py-2.5 pr-8 bg-transparent border-0 border-b-2 border-gray-200 focus:border-amber-500 focus:outline-none text-gray-900 text-sm placeholder-gray-300 transition-colors"
                  style={{ colorScheme: 'light' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="fill-white" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 mt-8">
            New Stockist?{' '}
            <Link to="/apply" className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
              Apply here
            </Link>
          </p>

          <p className="text-center text-xs text-gray-300 mt-10">
            Nogatu Alliance · Prince IT Solutions · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
