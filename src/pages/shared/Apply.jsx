import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, TextInput, Textarea, Select, Label, Spinner } from 'flowbite-react';
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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiCheck className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-2">
            Thank you, <strong>{form.applicant_name}</strong>. We'll review your application and contact you at{' '}
            <strong>{form.email}</strong>.
          </p>
          <p className="text-sm text-gray-400 mb-6">Expected response: 2–3 business days</p>
          <div className="space-y-2">
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 text-left">
              <p className="font-semibold mb-1">Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
                <li>Our team will verify your application</li>
                <li>You will receive an email with the decision</li>
                <li>If approved, your account credentials will be sent</li>
              </ul>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 mt-6 text-amber-600 hover:text-amber-700 text-sm font-medium">
            <HiArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4" style={{ colorScheme: 'light' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Nogatu Stockist</h1>
          <p className="text-gray-500 text-sm">
            Complete the Distributor-Trader Agreement application to join the Nogatu network.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => {
            const isDone = step > s.num;
            const isActive = step === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isDone ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-amber-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isDone ? <HiCheck className="w-5 h-5" /> : <Icon size={18} />}
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${isActive ? 'text-amber-600' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 mb-5 transition-colors ${step > s.num ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Step 1: Personal/Business Info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Personal & Business Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label value="Applicant Name *" className="mb-1.5" />
                  <TextInput
                    placeholder="Your full legal name"
                    value={form.applicant_name}
                    onChange={e => set('applicant_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label value="Business / Company Name" className="mb-1.5" />
                  <TextInput
                    placeholder="Business name (if applicable)"
                    value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label value="Email Address *" className="mb-1.5" />
                  <TextInput
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label value="Phone Number *" className="mb-1.5" />
                  <TextInput
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label value="Full Address *" className="mb-1.5" />
                  <Textarea
                    rows={2}
                    placeholder="Street, barangay, city, province"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </div>
                <div>
                  <Label value="Region / Province *" className="mb-1.5" />
                  <TextInput
                    placeholder="e.g. Region III - Central Luzon"
                    value={form.region}
                    onChange={e => set('region', e.target.value)}
                  />
                </div>
                <div>
                  <Label value="Requested Stockist Level *" className="mb-1.5" />
                  <Select value={form.requested_level} onChange={e => set('requested_level', e.target.value)}>
                    <option value="">Select level…</option>
                    <option value="provincial_stockist">Provincial Stockist</option>
                    <option value="city_stockist">City Stockist</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label value="Message / Additional Notes" className="mb-1.5" />
                  <Textarea
                    rows={3}
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
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Documents</h2>
              <p className="text-sm text-gray-500">
                Upload supporting documents to expedite your application. These are optional but strongly recommended.
              </p>

              {/* ID Document */}
              <div>
                <Label value="Government-Issued ID" className="mb-1.5" />
                <label className={`flex items-center gap-3 w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  form.id_document ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-amber-400 hover:bg-amber-50/30'
                }`}>
                  <HiUpload className={`w-5 h-5 ${form.id_document ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {form.id_document ? form.id_document.name : 'Click to upload Government ID'}
                    </p>
                    <p className="text-xs text-gray-400">JPG, PNG or PDF, max 5MB</p>
                  </div>
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
                <Label value="Business Permit / DTI Registration" className="mb-1.5" />
                <label className={`flex items-center gap-3 w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  form.business_permit ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-amber-400 hover:bg-amber-50/30'
                }`}>
                  <HiUpload className={`w-5 h-5 ${form.business_permit ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {form.business_permit ? form.business_permit.name : 'Click to upload Business Permit'}
                    </p>
                    <p className="text-xs text-gray-400">JPG, PNG or PDF, max 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => set('business_permit', e.target.files[0] || null)}
                  />
                </label>
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                Your documents will only be used for application verification and will be handled securely in accordance with Nogatu's privacy policy.
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Review Your Application</h2>
              <p className="text-sm text-gray-500 mb-4">Please verify your information before submitting.</p>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
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
                  <div key={label} className="flex gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500 w-36 flex-shrink-0 font-medium pt-0.5">{label}</span>
                    <span className="text-sm text-gray-800 flex-1">{value}</span>
                  </div>
                ))}
              </div>

              {form.message && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Additional Notes:</p>
                  <p className="text-sm text-gray-700">{form.message}</p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                By submitting, you agree to Nogatu's terms and conditions and confirm that all information provided is accurate.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <div>
            {step > 1 && (
              <Button color="gray" onClick={() => setStep(s => s - 1)}>
                <HiArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
            )}
            {step === 1 && (
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 py-2">
                Already have an account? Log in
              </Link>
            )}
          </div>

          {step < 3 ? (
            <Button color="warning" onClick={handleNext}>
              Next Step
              <HiArrowRight className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <Button
              color="success"
              onClick={handleSubmit}
              disabled={submitting}
              isProcessing={submitting}
            >
              <HiCheck className="mr-2 w-4 h-4" />
              Submit Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
