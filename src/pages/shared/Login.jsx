import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FaFacebook, FaPhone, FaGlobe } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { ROLE_SLUGS } from '@/utils/constants';
import WelcomePopup from './WelcomePopup';

const LOGIN_POSTER = '/assets/nogatuPoster_login.png';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [portalType, setPortalType] = useState('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password, portalType);
      setLoggedInUser(userData);
      setShowWelcome(true);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    setShowWelcome(false);
    if (loggedInUser?.role_slug === ROLE_SLUGS.SUPER_ADMIN) {
      navigate('/main/dashboard');
    } else {
      navigate('/partner/dashboard');
    }
  };

  return (
    <>
      <div className="flex min-h-screen">
        {/* Left panel - poster only (no cards/overlay) */}
        <img
          src={LOGIN_POSTER}
          alt="Nogatu poster"
          className="hidden lg:block h-screen w-auto shrink-0"
        />

        {/* Right panel - login form */}
        <div
          className="flex-1 min-w-0 flex items-center justify-center p-8"
          style={{ background: 'linear-gradient(to bottom, #FFF8E8, #FFFBF0)' }}
        >
          <div className="w-full max-w-sm">
            {/* Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold" style={{ color: '#FF8C00' }}>Welcome!</h2>
              <p className="text-sm text-gray-500 mt-1">Inventory Management System</p>
            </div>

            {/* Portal toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPortalType('main')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                style={
                  portalType === 'main'
                    ? { borderColor: '#FF8C00', background: '#FF8C00', color: '#fff' }
                    : { borderColor: '#FF8C00', background: 'transparent', color: '#FF8C00' }
                }
              >
                Main System
              </button>
              <button
                type="button"
                onClick={() => setPortalType('partner')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                style={
                  portalType === 'partner'
                    ? { borderColor: '#FF8C00', background: '#FF8C00', color: '#fff' }
                    : { borderColor: '#FF8C00', background: 'transparent', color: '#FF8C00' }
                }
              >
                Partner Portal
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm bg-white text-black placeholder:text-gray-500 caret-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 pr-11 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm bg-white text-black placeholder:text-gray-500 caret-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-bold rounded-lg uppercase tracking-widest transition-all disabled:opacity-50 text-sm"
                style={{ background: '#FF8C00' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'LOGIN'
                )}
              </button>
            </form>

            {/* Social Icons */}
            <div className="mt-8 flex justify-center gap-8">
              <a href="#" className="text-gray-500 hover:text-blue-600 transition-colors">
                <FaFacebook className="text-2xl" />
              </a>
              <a href="#" className="text-gray-500 hover:text-green-600 transition-colors">
                <FaPhone className="text-2xl" />
              </a>
              <a href="#" className="text-gray-500 hover:text-orange-600 transition-colors">
                <FaGlobe className="text-2xl" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <WelcomePopup
        isOpen={showWelcome}
        user={loggedInUser}
        onProceed={handleProceed}
      />
    </>
  );
};

export default Login;
