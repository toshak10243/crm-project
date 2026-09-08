import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';
import { Shield, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const SuperAdminChangePassword = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password strength checks
  const passwordChecks = [
    { label: 'At least 8 characters', valid: form.newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(form.newPassword) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(form.newPassword) },
    { label: 'One number', valid: /\d/.test(form.newPassword) },
    { label: 'One special character', valid: /[@$!%*?&]/.test(form.newPassword) },
  ];

  const isPasswordStrong = passwordChecks.every((c) => c.valid);

  const changeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccess('Password changed successfully! Please login again.');
      setTimeout(() => {
        logout();
        navigate('/super-admin/login');
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (!isPasswordStrong) {
      setError('Password does not meet requirements');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    changeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-8 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Secure Your Account
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-12">
            Choose a strong password to protect your Super Admin account.
          </p>

          {/* Password tips */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left space-y-3">
            <p className="text-white font-semibold text-sm mb-4">Password Requirements</p>
            {passwordChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-3">
                {check.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                )}
                <p className={`text-sm ${check.valid ? 'text-green-400' : 'text-slate-400'}`}>
                  {check.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

            <div className="mb-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
                SECURITY
              </p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Change Password
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Update your password to keep your account secure
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={show.current ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, current: !show.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={show.new ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, new: !show.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {show.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Mobile password checks */}
                {form.newPassword && (
                  <div className="lg:hidden mt-3 space-y-1.5">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-2">
                        {check.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        )}
                        <p className={`text-xs ${check.valid ? 'text-green-600' : 'text-slate-400'}`}>
                          {check.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, confirm: !show.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator */}
                {form.confirmPassword && (
                  <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${form.newPassword === form.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                    {form.newPassword === form.confirmPassword ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5" /> Passwords do not match</>
                    )}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={changeMutation.isPending || !isPasswordStrong || form.newPassword !== form.confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-2"
              >
                {changeMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminChangePassword;