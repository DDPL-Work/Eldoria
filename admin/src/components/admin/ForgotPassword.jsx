import { useState, useRef, useEffect } from 'react';
import api, { authAPI as rawAuthAPI } from '../../services/api';

const authAPI = rawAuthAPI || api?.authAPI || api?.auth;

// ==================== SVGs MATCHING UNTITLED UI REFERENCE ====================

// Step 1: Fingerprint in rounded badge
const FingerprintIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-700"
  >
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
  </svg>
);

// Step 2: Mail envelope in rounded badge
const MailIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-700"
  >
    <rect width="20" height="16" x="2" y="4" rx="3" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

// Step 3: Password dots [...] in rounded badge
const PasswordDotsIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-700"
  >
    <rect width="20" height="15" x="2" y="4.5" rx="3.5" />
    <circle cx="7" cy="12" r="1.25" fill="currentColor" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    <circle cx="17" cy="12" r="1.25" fill="currentColor" />
  </svg>
);

// Step 4: Success check badge
const CheckCircleIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-emerald-600"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// Left Arrow for "Back to log in"
const ArrowLeftIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// Show / Hide Password Eye
const EyeIcon = ({ visible }) => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

export function ForgotPassword({ onBackToLogin }) {
  // Steps: 'email' (Step 1) | 'otp' (Step 2) | 'new-password' (Step 3) | 'success' (Step 4)
  const [step, setStep] = useState('email');

  // Form Fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP code
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmPassFocused, setConfirmPassFocused] = useState(false);

  // Refs for OTP inputs
  const otpInputRefs = useRef([]);

  // Resend Cooldown Timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Calculate 4-segment Password Strength (Replica of Image 3)
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // ==============================================================
  // STEP 1: REQUEST PASSWORD RESET (POST /api/v1/admin/forgot-password)
  // ==============================================================
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your administrator email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authAPI.forgotPassword(cleanEmail);

      const otpValue = res?.data?.otp || res?.otp;
      if (otpValue) {
        setInfoMsg(`Verification code: ${otpValue}`);
      } else {
        setInfoMsg(`Verification code sent to ${cleanEmail}`);
      }

      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const message =
        err?.data?.message ||
        err?.message ||
        'Unable to send reset instructions. Please check email address.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================================
  // STEP 2: HANDLE OTP INPUTS & VERIFICATION (POST /api/v1/admin/verify-otp)
  // ==============================================================
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const fullCode = otp.join('').trim();
    if (fullCode.length < 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await authAPI.verifyForgotOtp({
        email: cleanEmail,
        otp: fullCode,
      });

      const token =
        res?.data?.verificationToken ||
        res?.verificationToken ||
        '';
      if (token) {
        setVerificationToken(token);
      }

      setErrorMsg('');
      setStep('new-password');
    } catch (err) {
      const message =
        err?.data?.message ||
        err?.message ||
        'Invalid or expired verification code. Please check and try again.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await authAPI.forgotPassword(email.trim().toLowerCase());
      setResendCooldown(60);
      const otpValue = res?.data?.otp || res?.otp;
      if (otpValue) {
        setInfoMsg(`New Verification code: ${otpValue}`);
      } else {
        setInfoMsg('A new verification code has been sent to your email.');
      }
    } catch (err) {
      setErrorMsg(err?.data?.message || err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================================
  // STEP 3: SET NEW PASSWORD (POST /api/v1/admin/reset-password)
  // ==============================================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const fullCode = otp.join('').trim();
      const cleanEmail = email.trim().toLowerCase();
      await authAPI.resetPassword({
        email: cleanEmail,
        otp: fullCode,
        verificationToken: verificationToken || undefined,
        newPassword,
        confirmPassword,
      });

      setStep('success');
    } catch (err) {
      const message =
        err?.data?.message ||
        err?.message ||
        'Failed to reset password. Please verify the code and try again.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">

      {/* ============================================================== */}
      {/* STEP 1: FORGOT PASSWORD (IMAGE 1 REPLICA) */}
      {/* ============================================================== */}
      {step === 'email' && (
        <div key="step-email" className="flex flex-col items-center text-center animate-slide-in-right">
          {/* Top Badge Icon (Fingerprint inside rounded rectangle) */}
          <div className="w-14 h-14 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-center mb-6 hover:shadow-sm transition-shadow">
            <FingerprintIcon />
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
            Forgot password?
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-[15px] text-slate-500 font-medium mt-2 mb-8 leading-relaxed">
            No worries, we'll send you reset instructions.
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRequestOtp} className="w-full space-y-6 text-left">
            <div>
              <label
                htmlFor="forgot-email-input"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2"
              >
                Email
              </label>
              <input
                id="forgot-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Enter your email"
                required
                autoFocus
                className={`w-full h-12 lg:h-[52px] px-4 rounded-xl outline-none text-sm lg:text-[15px] font-semibold text-slate-900 bg-white placeholder-slate-400 placeholder:font-normal transition-all duration-200 ${
                  emailFocused
                    ? 'border-2 border-[#0B1E36] ring-3 ring-[#0B1E36]/10 shadow-2xs'
                    : 'border border-slate-300 hover:border-slate-400'
                }`}
              />
            </div>

            {/* Theme Primary Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 lg:h-[52px] rounded-2xl bg-[#0B1E36] hover:bg-[#182D49] text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <span>Reset password</span>
              )}
            </button>
          </form>

          {/* Back to log in link */}
          <div className="mt-8">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B1E36] transition cursor-pointer"
            >
              <ArrowLeftIcon />
              <span>Back to log in</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: PASSWORD RESET / OTP (IMAGE 2 REPLICA) */}
      {/* ============================================================== */}
      {step === 'otp' && (
        <div key="step-otp" className="flex flex-col items-center text-center animate-slide-in-right">
          {/* Top Badge Icon (Envelope inside rounded rectangle) */}
          <div className="w-14 h-14 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-center mb-6 hover:shadow-sm transition-shadow">
            <MailIcon />
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
            Password reset
          </h1>

          {/* Subtitle with email */}
          <p className="text-sm sm:text-[15px] text-slate-500 font-medium mt-2 mb-8 leading-relaxed">
            We sent a code to <span className="text-[#0B1E36] font-bold">{email}</span>
          </p>

          {/* Development OTP Banner */}
          {infoMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* OTP Verification Form */}
          <form onSubmit={handleVerifyOtp} className="w-full space-y-6">
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-1">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 sm:w-14 h-14 sm:h-16 text-center text-2xl sm:text-3xl font-extrabold text-[#0B1E36] rounded-xl border border-slate-300 focus:border-[#0B1E36] focus:ring-3 focus:ring-[#0B1E36]/10 outline-none transition shadow-2xs"
                />
              ))}
            </div>

            {/* Primary Continue Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 lg:h-[52px] rounded-2xl bg-[#0B1E36] hover:bg-[#182D49] text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {/* Resend Link */}
          <div className="mt-6 text-xs sm:text-sm text-slate-500 font-medium">
            <span>Didn't receive the email? </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
              className="font-bold text-[#0B1E36] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
            >
              {resendCooldown > 0 ? `Click to resend (${resendCooldown}s)` : 'Click to resend'}
            </button>
          </div>

          {/* Back to log in link */}
          <div className="mt-8">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B1E36] transition cursor-pointer"
            >
              <ArrowLeftIcon />
              <span>Back to log in</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: SET NEW PASSWORD (IMAGE 3 REPLICA) */}
      {/* ============================================================== */}
      {step === 'new-password' && (
        <div key="step-new-pass" className="flex flex-col items-center text-center animate-slide-in-right">
          {/* Top Badge Icon (Password dots [...] inside rounded rectangle) */}
          <div className="w-14 h-14 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-center mb-6 hover:shadow-sm transition-shadow">
            <PasswordDotsIcon />
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
            Set new password
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-[15px] text-slate-500 font-medium mt-2 mb-8 leading-relaxed">
            Must be at least 8 characters.
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <div className="w-full mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Password Form */}
          <form onSubmit={handleResetPassword} className="w-full space-y-5 text-left">
            {/* Field 1: Password */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className={`w-full h-12 lg:h-[52px] px-4 pr-11 rounded-xl outline-none text-sm lg:text-[15px] font-semibold text-slate-900 bg-white placeholder-slate-400 placeholder:font-normal transition-all duration-200 ${
                    passFocused
                      ? 'border-2 border-[#0B1E36] ring-3 ring-[#0B1E36]/10 shadow-2xs'
                      : 'border border-slate-300 hover:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition"
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>

              {/* 4-Segment Password Strength Bar (Exact replica of Image 3) */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      passwordStrength >= seg
                        ? passwordStrength <= 1
                          ? 'bg-rose-500'
                          : passwordStrength <= 2
                          ? 'bg-amber-500'
                          : passwordStrength === 3
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Field 2: Confirm Password */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmPassFocused(true)}
                  onBlur={() => setConfirmPassFocused(false)}
                  placeholder="••••••••"
                  required
                  className={`w-full h-12 lg:h-[52px] px-4 pr-11 rounded-xl outline-none text-sm lg:text-[15px] font-semibold text-slate-900 bg-white placeholder-slate-400 placeholder:font-normal transition-all duration-200 ${
                    confirmPassFocused
                      ? 'border-2 border-[#0B1E36] ring-3 ring-[#0B1E36]/10 shadow-2xs'
                      : 'border border-slate-300 hover:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition"
                  aria-label="Toggle confirm password visibility"
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 lg:h-[52px] rounded-2xl bg-[#0B1E36] hover:bg-[#182D49] text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting password...</span>
                  </>
                ) : (
                  <span>Reset password</span>
                )}
              </button>
            </div>
          </form>

          {/* Back to log in link */}
          <div className="mt-8">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B1E36] transition cursor-pointer"
            >
              <ArrowLeftIcon />
              <span>Back to log in</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 4: SUCCESS CONFIRMATION */}
      {/* ============================================================== */}
      {step === 'success' && (
        <div key="step-success" className="flex flex-col items-center text-center animate-slide-in-right">
          {/* Top Success Badge */}
          <div className="w-14 h-14 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-xs flex items-center justify-center mb-6">
            <CheckCircleIcon />
          </div>

          <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
            Password reset successful
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-500 font-medium mt-2 mb-8 leading-relaxed">
            Your password has been successfully updated. You can now sign in with your new credentials.
          </p>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full h-12 lg:h-[52px] rounded-2xl bg-[#0B1E36] hover:bg-[#182D49] text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center"
          >
            Sign In as Admin
          </button>
        </div>
      )}

    </div>
  );
}

export default ForgotPassword;
