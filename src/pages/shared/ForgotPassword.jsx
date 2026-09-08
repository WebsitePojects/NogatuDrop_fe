import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiOutlineEye, HiOutlineEyeOff, HiCheckCircle } from 'react-icons/hi';
import { FiArrowLeft } from 'react-icons/fi';
import api from '@/services/api';
import { AUTH } from '@/services/endpoints';

const POSTER = '/assets/nogatuPoster_login.png';
const LOGO = '/assets/dropshipping_nogatu_logo.png';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Backend contract (src/controllers/authController.js on the API):
//   POST /auth/forgot-password { email }      -> always 200, generic message (no account enumeration)
//   POST /auth/reset-password  { email, otp, new_password } -> 400 with a specific message on bad code/password
const STEP = { REQUEST: 'request', RESET: 'reset', DONE: 'done' };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.REQUEST);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Three independent buttons (send code / reset / resend) each get their own
  // loading flag so disabling one never blocks the others.
  const [requestLoading, setRequestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');

  // Refs (not just the state above) guard against a second request firing:
  // two clicks/Enter-presses can both read the pre-update `loading` value
  // before React re-renders the disabled button, so the lock has to be
  // synchronous and independent of the render cycle.
  const requestLockRef = useRef(false);
  const resetLockRef = useRef(false);
  const resendLockRef = useRef(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (requestLockRef.current) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    requestLockRef.current = true;
    setRequestLoading(true);
    setError('');
    try {
      await api.post(AUTH.FORGOT_PASSWORD, { email: trimmedEmail });
      setEmail(trimmedEmail);
      setStep(STEP.RESET);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the reset code. Please try again.');
    } finally {
      requestLockRef.current = false;
      setRequestLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendLockRef.current) return;
    resendLockRef.current = true;
    setResendLoading(true);
    setError('');
    setResendNotice('');
    try {
      await api.post(AUTH.FORGOT_PASSWORD, { email });
      setResendNotice('A new code is on its way.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the code. Please try again.');
    } finally {
      resendLockRef.current = false;
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetLockRef.current) return;

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    resetLockRef.current = true;
    setResetLoading(true);
    setError('');
    try {
      await api.post(AUTH.RESET_PASSWORD, {
        email,
        otp: trimmedOtp,
        new_password: newPassword,
      });
      setStep(STEP.DONE);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.');
    } finally {
      resetLockRef.current = false;
      setResetLoading(false);
    }
  };

  const handleUseDifferentEmail = () => {
    // Going back to step 1 invalidates the in-progress code entry — clear it
    // so a stale OTP/password can't be resubmitted against a new email.
    setStep(STEP.REQUEST);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setResendNotice('');
  };

  return (
    <div className="flex min-h-screen bg-black" style={{ colorScheme: 'light' }}>
      {/* LEFT PANEL */}
      <div className="lg:w-[50%] hidden lg:block relative bg-gray-900 overflow-hidden">
        <img
          src={POSTER}
          alt="Nogatu Account Recovery"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 lg:p-20 text-white z-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white text-shadow-sm">
            Account<br />Recovery
          </h2>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            We'll email you a one-time code so you can get straight back into your Nogatu account.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 landing-shell relative flex items-center justify-center bg-[#1e1613] text-[#f8efe4]">
        {/* Background Textures (match Login.jsx) */}
        <div className="page-noise pointer-events-none absolute inset-0 z-0 opacity-50" />
        <div className="absolute inset-0 pointer-events-none opacity-80 z-0 [background:radial-gradient(circle_at_8%_16%,rgba(255,205,129,0.26),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(255,174,82,0.18),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(97,51,21,0.32),transparent_40%)]" />
        <div className="absolute inset-0 pointer-events-none z-0 [background-image:linear-gradient(rgba(255,199,129,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,199,129,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />

        {/* Form Container */}
        <div className="z-10 liquid-card login-force-light bg-[#381f11]/90 rounded-[2rem] p-8 max-w-[420px] w-full shadow-2xl relative">
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100 transition hover:bg-white/10"
          >
            <FiArrowLeft className="text-sm" />
            Back to Sign In
          </Link>

          <div className="mb-8 mt-6 flex flex-col items-center justify-center text-center">
            <img
              src={LOGO}
              alt="Nogatu Logo"
              className="mb-5 h-16 w-16 rounded-full border border-orange-200/20 object-cover shadow-[0_0_20px_rgba(255,190,100,0.15)]"
            />
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-500/80">NCDMS</p>
            <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {step === STEP.DONE ? 'Password Reset' : 'Reset Your Password'}
            </h1>

            {step === STEP.REQUEST && (
              <p className="text-sm text-[#d4bca4] leading-relaxed">
                Enter the email on your account and we&rsquo;ll send you a 6-digit code to reset your password.
              </p>
            )}
            {step === STEP.RESET && (
              <p className="text-sm text-[#d4bca4] leading-relaxed">
                We sent a 6-digit code to <span className="font-semibold text-white">{email}</span>.
                {' '}Check your spam folder if it doesn&rsquo;t show up in a minute.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200 shadow-inner">
              <span className="shrink-0 text-red-500 mt-0.5">⚠️</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {step === STEP.REQUEST && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="fp-email" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                  Email Address
                </label>
                <input
                  id="fp-email"
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

              <button
                type="submit"
                disabled={requestLoading}
                className="mt-6 w-full flex justify-center gap-2 items-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requestLoading ? (
                  <>
                    <Spinner size="sm" light={true} />
                    <span>Sending code...</span>
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          )}

          {step === STEP.RESET && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="fp-otp" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                  6-Digit Code
                </label>
                <input
                  id="fp-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 tracking-[0.4em] text-white placeholder:text-[#d4bca4]/45 focus:border-amber-400 focus:ring-0 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fp-new-password" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="fp-new-password"
                    name="newPassword"
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 pr-11 text-white placeholder:text-[#d4bca4]/45 focus:border-amber-400 focus:ring-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#d4bca4] hover:text-white transition-colors focus:outline-none rounded-md"
                    tabIndex={-1}
                  >
                    {showPw ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fp-confirm-password" className="block text-[11px] font-bold uppercase tracking-wider text-amber-500/80">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="fp-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 pr-11 text-white placeholder:text-[#d4bca4]/45 focus:border-amber-400 focus:ring-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((v) => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#d4bca4] hover:text-white transition-colors focus:outline-none rounded-md"
                    tabIndex={-1}
                  >
                    {showConfirmPw ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {resendNotice && <p className="text-xs text-emerald-300">{resendNotice}</p>}

              <button
                type="submit"
                disabled={resetLoading}
                className="mt-2 w-full flex justify-center gap-2 items-center rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resetLoading ? (
                  <>
                    <Spinner size="sm" light={true} />
                    <span>Resetting password...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-[11px] font-medium tracking-wide">
                <button
                  type="button"
                  onClick={handleUseDifferentEmail}
                  className="text-amber-400 transition-colors hover:text-amber-300 focus:outline-none focus:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-amber-400 transition-colors hover:text-amber-300 focus:outline-none focus:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendLoading ? 'Resending...' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === STEP.DONE && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                <HiCheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-sm leading-relaxed text-[#d4bca4]">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-2 w-full rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
