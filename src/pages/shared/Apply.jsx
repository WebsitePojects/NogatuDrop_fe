import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiCheck, HiArrowLeft, HiArrowRight, HiUpload } from 'react-icons/hi';
import { FiUser, FiFileText, FiCheckSquare } from 'react-icons/fi';
import api from '@/services/api';
import { APPLICATIONS } from '@/services/endpoints';
import { ToastContainer, useToast } from '@/components/Toast';

const STEPS = [
  { num: 1, label: 'Personal Info', icon: FiUser },
  { num: 2, label: 'Documents', icon: FiFileText },
  { num: 3, label: 'Review', icon: FiCheckSquare },
];

const INITIAL_FORM = {
  applicant_name: '',
  business_name: '',
  email: '',
  phone: '',
  address: '',
  region: '',
  requested_level: '',
  message: '',
  id_document: null,
  business_permit: null,
};

export default function Apply() {
  const { toasts, showToast, dismiss } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const canProceed = () => {
    if (step === 1) {
      return form.applicant_name.trim() && form.email.trim() && form.phone.trim() &&
        form.address.trim() && form.requested_level;
    }
    if (step === 2) return true; // documents optional but encouraged
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) { showToast('Please fill in all required fields', 'warning'); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') formData.append(k, v);
      });
      await api.post(APPLICATIONS.SUBMIT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-black/30 text-white placeholder-white/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-400 focus:bg-black/40 focus:ring-4 focus:ring-amber-400/10 focus:outline-none transition-all shadow-inner";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-amber-500/70 mb-1.5";

  if (success) {
    return (
      <div className="landing-shell relative min-h-screen overflow-x-hidden text-[#f8efe4] flex items-center justify-center px-4 py-12" style={{ colorScheme: 'light' }}>
        <div className="page-noise pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-80 [background:radial-gradient(circle_at_8%_16%,rgba(255,205,129,0.26),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(255,174,82,0.18),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(97,51,21,0.32),transparent_40%)]" />
        <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(rgba(255,199,129,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,199,129,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/20 blur-[100px] pointer-events-none"></div>

        <div className="liquid-card glass-nav backdrop-blur-xl bg-[#2e1a0f]/40 border border-orange-200/20 rounded-3xl p-10 max-w-[420px] w-full text-center relative z-10 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 border border-amber-400/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <HiCheck className="w-9 h-9 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
          <p className="text-[#d4bca4] mb-2 text-sm leading-relaxed">
            Thank you, <strong className="text-amber-400">{form.applicant_name}</strong>. We'll review your application and contact you at{' '}
            <strong className="text-amber-400">{form.email}</strong>.
          </p>
          <p className="text-xs text-white/40 mb-8 italic">Expected response: 2–3 business days</p>
          
          <div className="bg-black/30 border border-white/5 rounded-2xl p-5 text-sm text-left shadow-inner">
            <p className="font-semibold text-amber-400/90 mb-3 text-[13px] uppercase tracking-wider">Next Steps</p>
            <ul className="space-y-2.5 text-[13px] text-white/60">
              <li className="flex items-start gap-2"><span className="text-amber-500/50 mt-0.5">•</span> Our team will verify your application</li>
              <li className="flex items-start gap-2"><span className="text-amber-500/50 mt-0.5">•</span> You will receive an email with the decision</li>
              <li className="flex items-start gap-2"><span className="text-amber-500/50 mt-0.5">•</span> If approved, your account credentials will be sent</li>
            </ul>
          </div>
          
          <Link to="/" className="inline-flex items-center gap-1.5 mt-8 text-amber-500 hover:text-amber-400 text-sm font-semibold transition-colors group">
            <HiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden text-[#f8efe4] py-8 lg:py-12 px-4" style={{ colorScheme: 'light' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="page-noise pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-80 [background:radial-gradient(circle_at_8%_16%,rgba(255,205,129,0.26),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(255,174,82,0.18),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(97,51,21,0.32),transparent_40%)]" />
      <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(rgba(255,199,129,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,199,129,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="absolute top-[20%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-600/10 blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#1e1613] rounded-full">
            <img src="/assets/dropshipping_nogatu_logo.png" alt="Nogatu" className="h-12 w-12 rounded-full border border-orange-200/20 object-cover shadow-[0_0_20px_rgba(255,190,100,0.15)] transition-transform hover:scale-105 mx-auto" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Become a Nogatu Stockist</h1>
          <p className="text-[#d4bca4] text-sm max-w-md mx-auto leading-relaxed">
            Complete the Distributor-Trader Agreement application to join the Nogatu network.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center flex-wrap gap-y-4 mb-6 relative z-10">
          {STEPS.map((s, i) => {
            const isDone = step > s.num;
            const isActive = step === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isDone ? 'bg-amber-500 text-[#2e1a0f] shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-100' :
                    isActive ? 'bg-black/40 border-2 border-amber-400/80 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-110' :
                    'bg-black/20 border border-white/10 text-white/20 scale-95'
                  }`}>
                    {isDone ? <HiCheck className="w-5 h-5 font-bold" /> : <Icon size={isActive ? 20 : 18} />}
                  </div>
                  <p className={`text-[11px] mt-3 font-semibold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-amber-400' : isDone ? 'text-amber-500/70' : 'text-white/20'}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-10 sm:w-20 mx-2 sm:mx-4 mb-7 relative flex items-center">
                    <div className="absolute inset-0 h-0.5 bg-white/5 rounded-full" />
                    <div className={`h-0.5 rounded-full transition-all duration-700 ease-out ${step > s.num ? 'w-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'w-0 bg-transparent'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="liquid-card glass-nav backdrop-blur-xl bg-[#2e1a0f]/40 border border-orange-200/20 rounded-3xl p-5 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative z-10 transition-all duration-300">
          
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent"></div>
          
          {/* Step 1: Personal/Business Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-white mb-1">Personal & Business Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className={labelClass}>Applicant Name *</label>
                  <input
                    className={inputClass}
                    placeholder="Your full legal name"
                    value={form.applicant_name}
                    onChange={e => set('applicant_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Business Name <span className="opacity-50 font-normal lowercase tracking-normal">(optional)</span></label>
                  <input
                    className={inputClass}
                    placeholder="If applicable"
                    value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="+63 9XX XXX XXXX"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Address *</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Street, barangay, city, province"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Region / Province *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Region III - Central Luzon"
                    value={form.region}
                    onChange={e => set('region', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Requested Level *</label>
                  <select 
                    className={inputClass}
                    value={form.requested_level} 
                    onChange={e => set('requested_level', e.target.value)}
                  >
                    <option value="" className="bg-[#1e110a] text-white">Select level…</option>
                    <option value="provincial_stockist" className="bg-[#1e110a] text-white">Provincial Stockist</option>
                    <option value="city_stockist" className="bg-[#1e110a] text-white">City Stockist</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Additional Notes <span className="opacity-50 font-normal lowercase tracking-normal">(optional)</span></label>
                  <textarea
                    rows={3}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell us about your distribution network, territory coverage, experience…"
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-1">Upload Documents</h2>
                <p className="text-[13px] text-[#d4bca4] leading-relaxed">
                  Upload supporting documents to expedite your application. Optional but strongly recommended.
                </p>
              </div>

              <div className="space-y-4">
                {/* ID Document */}
                <div>
                  <label className={labelClass}>Government-Issued ID</label>
                  <label className={`flex items-center gap-4 w-full p-5 border border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${
                    form.id_document ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-white/20 bg-black/20 hover:border-amber-400/40 hover:bg-black/40'
                  }`}>
                    <div className={`p-3 rounded-xl transition-colors ${form.id_document ? 'bg-amber-500/20' : 'bg-white/5 group-hover:bg-amber-500/10'}`}>
                      <HiUpload className={`w-6 h-6 transition-colors ${form.id_document ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-400/70'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${form.id_document ? 'text-amber-300' : 'text-white/80'}`}>
                        {form.id_document ? form.id_document.name : 'Click to upload Government ID'}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1">JPG, PNG or PDF up to 5MB</p>
                    </div>
                    {form.id_document && <HiCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => set('id_document', e.target.files[0] || null)}
                    />
                  </label>
                </div>

                {/* Business Permit */}
                <div>
                  <label className={labelClass}>Business Permit / DTI Registration</label>
                  <label className={`flex items-center gap-4 w-full p-5 border border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${
                    form.business_permit ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-white/20 bg-black/20 hover:border-amber-400/40 hover:bg-black/40'
                  }`}>
                    <div className={`p-3 rounded-xl transition-colors ${form.business_permit ? 'bg-amber-500/20' : 'bg-white/5 group-hover:bg-amber-500/10'}`}>
                      <HiUpload className={`w-6 h-6 transition-colors ${form.business_permit ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-400/70'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${form.business_permit ? 'text-amber-300' : 'text-white/80'}`}>
                        {form.business_permit ? form.business_permit.name : 'Click to upload Business Permit'}
                      </p>
                      <p className="text-[11px] text-white/40 mt-1">JPG, PNG or PDF up to 5MB</p>
                    </div>
                    {form.business_permit && <HiCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => set('business_permit', e.target.files[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-black/30 border-l-2 border-amber-500/30 rounded-r-xl p-4 shadow-inner">
                <p className="text-[12px] text-[#d4bca4]/80 leading-relaxed">
                  Your documents will only be used for application verification and will be handled securely in accordance with Nogatu's privacy policy.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-1">Review Your Application</h2>
                <p className="text-[13px] text-[#d4bca4]">Please verify your information before submitting.</p>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 shadow-inner text-sm">
                {[
                  { label: 'Applicant Name', value: form.applicant_name },
                  { label: 'Business Name', value: form.business_name || '—' },
                  { label: 'Email', value: form.email },
                  { label: 'Phone', value: form.phone },
                  { label: 'Address', value: form.address },
                  { label: 'Region', value: form.region },
                  { label: 'Requested Level', value: form.requested_level.replace('_', ' ') || '—' },
                  { label: 'ID Document', value: form.id_document ? form.id_document.name : 'Not uploaded' },
                  { label: 'Business Permit', value: form.business_permit ? form.business_permit.name : 'Not uploaded' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:gap-4 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <span className="text-[11px] uppercase tracking-wider text-amber-500/50 w-40 flex-shrink-0 font-semibold mb-0 sm:pt-1">{label}</span>
                    <span className={`text-sm flex-1 ${value === 'Not uploaded' ? 'text-white/30 italic' : value === '—' ? 'text-white/30' : 'text-white/90'}`}>{value}</span>
                  </div>
                ))}
              </div>

              {form.message && (
                <div className="bg-black/20 border border-white/10 rounded-2xl p-4 shadow-inner">
                  <p className="text-[11px] uppercase tracking-wider text-amber-500/50 font-semibold mb-1">Additional Notes</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{form.message}</p>
                </div>
              )}

              <p className="text-[11px] text-white/30 text-center px-2 mt-2">
                By submitting, you agree to Nogatu's terms and conditions.
              </p>
            </div>
          )}

          {/* Navigation Buttons inside Card */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            <div>
              {step > 1 ? (
                <button 
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#d4bca4] hover:text-white transition-all rounded-xl hover:bg-white/5 group"
                  onClick={() => setStep(s => s - 1)}
                >
                  <HiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  Back
                </button>
              ) : (
                <Link to="/login" className="text-[13px] font-medium text-amber-500/80 hover:text-amber-400 focus:outline-none focus:underline transition-colors hidden sm:block">
                  Already have an account?
                </Link>
              )}
            </div>

            {step < 3 ? (
              <button 
                className="btn-amber inline-flex items-center text-sm font-semibold px-8 py-3 rounded-xl transition-all group" 
                onClick={handleNext}
              >
                Next Step
                <HiArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                className="btn-amber inline-flex items-center text-sm font-semibold px-8 py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Spinner size="sm" className="mr-2" light={true} />
                ) : (
                  <HiCheck className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
                )}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
          {step === 1 && (
            <div className="mt-6 text-center sm:hidden">
              <Link to="/login" className="text-[13px] font-medium text-amber-500/80 hover:text-amber-400 focus:outline-none focus:underline transition-colors">
                Already have an account? Log in
              </Link>
            </div>
          )}
        </div>
        
        {/* Footer text */}
        <div className="absolute -bottom-12 inset-x-0 text-center pointer-events-none">
          <p className="text-xs text-white/30 pb-16">Nogatu Alliance · Prince IT Solutions · 2026</p>
        </div>
      </div>
    </div>
  );
}
