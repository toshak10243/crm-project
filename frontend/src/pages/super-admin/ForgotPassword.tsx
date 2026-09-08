import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Shield, ArrowLeft, Mail } from 'lucide-react';

type Step = 'identifier' | 'otp' | 'reset';

const SuperAdminForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Step 1 -- Send OTP
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super-admin/auth/forgot-password', { identifier });
      return res.data;
    },
    onSuccess: (data) => {
      setUserId(data.data.userId);
      setMaskedEmail(data.data.email || '');
      setStep('otp');
      setResendTimer(60);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Something went wrong');
    },
  });

  // Resend OTP
  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super-admin/auth/resend-otp', { userId });
      return res.data;
    },
    onSuccess: () => {
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
      setSuccess('OTP resent successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    },
  });

  // Step 2 -- Verify OTP (just move to next step)
  const handleOtpVerify = () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }
    setStep('reset');
    setError('');
  };

  // Step 3 -- Reset Password
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super-admin/auth/reset-password', {
        userId,
        otp: otp.join(''),
        newPassword,
        confirmPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/super-admin/login'), 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to reset password');
    },
  });

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
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
            Account Recovery
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Reset your Super Admin password securely with OTP verification.
          </p>

          {/* Steps indicator */}
          <div className="mt-12 space-y-4">
            {[
              { num: 1, label: 'Enter your identifier', active: step === 'identifier' },
              { num: 2, label: 'Verify OTP from email', active: step === 'otp' },
              { num: 3, label: 'Set new password', active: step === 'reset' },
            ].map((s) => (
              <div key={s.num} className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all ${s.active ? 'bg-blue-600/20 border border-blue-500/30' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.active ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                  {s.num}
                </div>
                <p className="text-white text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Back button */}
          <button
            onClick={() => step === 'identifier' ? navigate('/super-admin/login') : setStep(step === 'reset' ? 'otp' : 'identifier')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'identifier' ? 'Back to Login' : 'Go Back'}
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

            {/* Success message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
                {success}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Step 1 -- Identifier */}
            {step === 'identifier' && (
              <>
                <div className="mb-8">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">STEP 1 OF 3</p>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password</h2>
                  <p className="text-slate-500 text-sm mt-1">Enter your email, phone or username to receive OTP</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email / Phone / Username
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                    />
                  </div>

                  <button
                    onClick={() => { setError(''); sendOtpMutation.mutate(); }}
                    disabled={sendOtpMutation.isPending || !identifier}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {sendOtpMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send OTP
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 2 -- OTP */}
            {step === 'otp' && (
              <>
                <div className="mb-8">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">STEP 2 OF 3</p>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Enter OTP</h2>
                  {maskedEmail && (
                    <p className="text-slate-500 text-sm mt-1">
                      OTP sent to <span className="font-medium text-slate-700">{maskedEmail}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  {/* OTP Boxes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      6-Digit OTP
                    </label>
                    <div className="flex gap-3 justify-center">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-12 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Resend OTP */}
                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-sm text-slate-400">
                        Resend OTP in <span className="font-semibold text-slate-600">{resendTimer}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={() => resendOtpMutation.mutate()}
                        disabled={resendOtpMutation.isPending}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-60"
                      >
                        {resendOtpMutation.isPending ? 'Resending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleOtpVerify}
                    disabled={otp.join('').length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Verify OTP
                  </button>
                </div>
              </>
            )}

            {/* Step 3 -- Reset Password */}
            {step === 'reset' && (
              <>
                <div className="mb-8">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">STEP 3 OF 3</p>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
                  <p className="text-slate-500 text-sm mt-1">Choose a strong password for your account</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                    />
                  </div>

                  {/* Password match indicator */}
                  {confirmPassword && (
                    <p className={`text-xs font-medium ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}

                  <button
                    onClick={() => { setError(''); resetMutation.mutate(); }}
                    disabled={resetMutation.isPending || !newPassword || newPassword !== confirmPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {resetMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminForgotPassword;