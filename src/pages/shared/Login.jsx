import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { FiArrowLeft, FiArrowUpRight } from 'react-icons/fi';
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
      sessionStorage.setItem('nogatu_show_notifications', '1');
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
        <div className="z-10 liquid-card login-force-light bg-[#381f11]/90 rounded-[2rem] p-8 max-w-[420px] w-full shadow-2xl relative">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100 transition hover:bg-white/10"
            >
              <FiArrowLeft className="text-sm" />
              Back
            </Link>
            <a
              href="https://nogatualliance.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 transition hover:text-amber-200"
            >
              Stockist Application
              <FiArrowUpRight className="text-sm" />
            </a>
          </div>

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
              <label htmlFor="login-email" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                autoComplete="email"
                className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder:text-[#d4bca4]/45 focus:border-amber-400 focus:ring-0 focus:outline-none"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 pr-11 text-white placeholder:text-[#d4bca4]/45 focus:border-amber-400 focus:ring-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#d4bca4] hover:text-white transition-colors focus:outline-none rounded-md"
                  tabIndex={-1}
                >
                  {showPw ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium tracking-wide text-amber-400 transition-colors hover:text-amber-300 focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full flex justify-center gap-2 items-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
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
            <p className="text-[13px] text-[#d4bca4]">Stockist applications now start through the Nogatu Alliance portal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
