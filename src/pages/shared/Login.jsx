import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Label, TextInput, Spinner, Alert } from 'flowbite-react';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const role = userData?.role_slug;
      if (role === 'super_admin') {
        navigate('/main/dashboard');
      } else if (role === 'mobile_stockist') {
        navigate('/mobile/dashboard');
      } else {
        navigate('/stockist/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col items-center justify-center p-12 text-white"
        style={{ background: 'linear-gradient(160deg, #1C0A00 0%, #4A1E00 100%)' }}
      >
        <img src={BRAND_LOGO} alt="Nogatu Logo" className="w-20 h-20 rounded-2xl mb-6 shadow-xl" />
        <h1 className="text-4xl font-bold mb-2 text-center leading-tight">NCDMS</h1>
        <p className="text-amber-300 text-lg font-medium mb-3 text-center">
          Nogatu Centralized Distribution
        </p>
        <p className="text-white/50 text-sm text-center max-w-xs leading-relaxed">
          Manage inventory, orders, and deliveries across all distribution levels — from province to doorstep.
        </p>
        <div className="mt-12 flex gap-6 text-white/30 text-xs">
          <span>Nogatu Alliance</span>
          <span>·</span>
          <span>Prince IT Solutions</span>
          <span>·</span>
          <span>2026</span>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ background: '#FFF8F0' }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src={BRAND_LOGO} alt="Nogatu" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="font-bold text-gray-900">NCDMS</p>
              <p className="text-xs text-gray-500">Distribution System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

          {error && (
            <Alert color="failure" icon={HiOutlineExclamationCircle} className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" value="Email address" className="mb-1.5" />
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password" value="Password" className="mb-1.5" />
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <HiOutlineEyeOff className="w-5 h-5" />
                  ) : (
                    <HiOutlineEye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              color="warning"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New Stockist?{' '}
            <Link to="/apply" className="text-amber-600 hover:text-amber-700 font-semibold">
              Apply here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
