import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';

const POSTER = '/assets/nogatuPoster_login.png';
const LOGO = '/assets/dropshipping_nogatu_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const role = userData?.role_slug;
      if (role === 'super_admin') navigate('/main/dashboard');
      else if (role === 'mobile_stockist') navigate('/mobile/dashboard');
      else navigate('/stockist/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black" style={{ colorScheme: 'light' }}>
      {/* LEFT PANEL */}
      <div className="lg:w-[50%] hidden lg:block relative bg-gray-900 overflow-hidden">
        <img 
          src={POSTER}
          alt="Nogatu Login Poster"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 lg:p-20 text-white z-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white text-shadow-sm">
            Centralized<br />Distribution
          </h2>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Manage your inventory, streamline your drop-shipping operations, and grow your network with the Nogatu platform.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 landing-shell relative flex items-center justify-center bg-[#1e1613] text-[#f8efe4]">
        {/* Background Textures */}
        <div className="page-noise pointer-events-none absolute inset-0 z-0 opacity-50" />
        <div className="absolute inset-0 pointer-events-none opacity-80 z-0 [background:radial-gradient(circle_at_8%_16%,rgba(255,205,129,0.26),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(255,174,82,0.18),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(97,51,21,0.32),transparent_40%)]" />
        <div className="absolute inset-0 pointer-events-none z-0 [background-image:linear-gradient(rgba(255,199,129,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,199,129,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />

        {/* Form Container */}
        <div className="z-10 liquid-card bg-[#381f11]/90 rounded-3xl p-8 max-w-[380px] w-full shadow-2xl relative">
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <Link to="/" className="mb-5 focus:outline-none">
              <img src={LOGO} alt="Nogatu Logo" className="h-16 w-16 rounded-full border border-orange-200/20 object-cover shadow-[0_0_20px_rgba(255,190,100,0.15)] transition-transform hover:scale-105" />
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-500/80 mb-2">NCDMS</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200 shadow-inner">
              <span className="shrink-0 text-red-500 mt-0.5">⚠️</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-[#e9f2ff] text-gray-900 px-4 py-3 rounded-xl border border-transparent focus:ring-4 focus:ring-amber-500/20 focus:outline-none"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium tracking-wide text-amber-400 transition-colors hover:text-amber-300 focus:outline-none focus:underline"
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
                  className="w-full bg-[#e9f2ff] text-gray-900 px-4 py-3 rounded-xl border border-transparent focus:ring-4 focus:ring-amber-500/20 focus:outline-none pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800 transition-colors focus:outline-none rounded-md"
                  tabIndex={-1}
                >
                  {showPw ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full btn-amber flex justify-center gap-2 items-center px-6 py-3.5 text-sm font-semibold rounded-xl"
            >
              {loading ? (
                <>
                  <Spinner size="sm" light={true} />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center pt-6 border-t border-white/5">
            <p className="text-[13px] text-[#d4bca4]">
              New Stockist?{' '}
              <Link to="/apply" className="font-semibold text-amber-500 hover:text-amber-400 focus:outline-none focus:underline transition-colors">
                Apply here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
