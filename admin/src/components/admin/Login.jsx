import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import eldoriaLoginImage from '../../assets/eldoria-login-image.png';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useUI();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const isEmailActive = emailFocused || email.trim().length > 0;
  const isPasswordActive = passwordFocused || password.length > 0;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email or employee ID');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(email, password, rememberMe);
      if (showToast) {
        showToast(`Welcome back to Eldoria Care Desk!`);
      }
      navigate('/dashboard');
    }, 350);
  };

  const handleQuickDemo = () => {
    setEmail('admin@eldoria.care');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen overflow-x-hidden bg-white flex flex-col lg:flex-row antialiased font-sans select-none">

      {/* ==================== LEFT HERO PANEL (Full 100vh Edge-to-Edge Image) ==================== */}
      <div className="hidden lg:block lg:w-1/2 h-screen overflow-hidden relative">
        <img
          src={eldoriaLoginImage}
          alt="Eldoria Care at Home Login"
          className="absolute inset-0 w-full h-full object-fill"
        />
      </div>

      {/* ==================== RIGHT LOGIN CANVAS ==================== */}
      <div className="w-full lg:w-1/2 flex-1 min-h-screen lg:h-full bg-white flex flex-col justify-center items-center px-6 sm:px-10 lg:px-11 xl:px-16 py-8 lg:py-0 overflow-y-auto">
        <div className="w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] xl:max-w-[520px] py-4 lg:py-8">

          {/* Logo & Branding Header - ONLY VISIBLE ON MOBILE/TABLET (< lg), HIDDEN ON DESKTOP */}
          <div className="lg:hidden flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 p-1.5 flex items-center justify-center hover:scale-105 transition-transform duration-300">
              <img src="/eldoria-logo.png" alt="Eldoria Logo" className="w-full h-full object-contain"/>
            </div>

            <div className="flex items-center gap-1 mt-2">
              <span className="text-2xl font-extrabold text-[#0B1E36] tracking-tight">
                Eldoria
              </span>
              <span className="text-2xl font-black text-[#F59E0B]">+</span>
            </div>
            <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400 mt-0.5">
              Care at Home · Admin Panel
            </span>
          </div>

          {/* Sign In Title & Subtitle */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-[36px] font-extrabold text-[#0B1E36] tracking-tight leading-tight">
              Sign In
            </h1>
            <p className="text-sm lg:text-[15px] text-slate-500 font-medium mt-1 leading-relaxed">
              Welcome to <span className="text-[#0B1E36] font-bold">Eldoria Admin</span>. Enter your administrator credentials to sign in.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6 pt-2">

            {/* Email Field with Floating Notch Label */}
            <div className="relative">
              <input
                type="text"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder={isEmailActive ? "Enter your Admin Email ID" : ""}
                className={`w-full h-12 lg:h-[52px] px-4 pr-11 rounded-xl outline-none text-sm lg:text-[15px] font-semibold text-slate-900 bg-white placeholder-slate-400 placeholder:font-normal transition-all duration-200 ${
                  emailFocused
                    ? "border-2 border-[#3EA38A] ring-3 ring-[#3EA38A]/15 shadow-2xs"
                    : isEmailActive
                    ? "border border-[#4EBA9F] hover:border-[#3EA38A]"
                    : "border border-[#55BFA4] hover:border-[#3EA38A]"
                }`}
                required
              />
              <label
                htmlFor="login-email"
                className={`absolute left-3.5 z-10 transition-all duration-200 cursor-text select-none ${
                  isEmailActive
                    ? "-top-2.5 bg-white px-1.5 text-xs font-bold " + (emailFocused ? "text-[#1F5647]" : "text-slate-800")
                    : "top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium px-0.5"
                }`}
              >
                Admin Email ID
              </label>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Icon name="mail" size={19} />
              </span>
            </div>

            {/* Password Field with Floating Notch Label */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder={isPasswordActive ? (showPassword ? "Enter your password" : "••••••••••••") : ""}
                className={`w-full h-12 lg:h-[52px] px-4 pr-11 rounded-xl outline-none text-sm lg:text-[15px] font-semibold text-slate-900 bg-white placeholder-slate-400 placeholder:font-normal transition-all duration-200 ${
                  passwordFocused
                    ? "border-2 border-[#3EA38A] ring-3 ring-[#3EA38A]/15 shadow-2xs"
                    : isPasswordActive
                    ? "border border-[#4EBA9F] hover:border-[#3EA38A]"
                    : "border border-[#55BFA4] hover:border-[#3EA38A]"
                }`}
                required
              />
              <label
                htmlFor="login-password"
                className={`absolute left-3.5 z-10 transition-all duration-200 cursor-text select-none ${
                  isPasswordActive
                    ? "-top-2.5 bg-white px-1.5 text-xs font-bold " + (passwordFocused ? "text-[#1F5647]" : "text-slate-800")
                    : "top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium px-0.5"
                }`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition p-1 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={20} />
              </button>
            </div>

            {/* Keep me signed in & Forgot Password */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0B1E36] accent-[#0B1E36] focus:ring-[#0B1E36] cursor-pointer"
                />
                <span className="font-semibold text-slate-600">Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Please contact system administrator to reset credentials: admin@eldoria.care')}
                className="font-semibold text-slate-500 hover:text-[#0B1E36] transition cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 lg:h-[52px] rounded-2xl bg-[#0B1E36] hover:bg-[#182D49] text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In as Admin</span>
                )}
              </button>
            </div>

            {/* Quick Demo Helper */}
            <div className="text-center pt-1.5">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2.5 sm:py-3 px-3 rounded-xl bg-amber-50 text-[#B45309] hover:bg-amber-100/80 font-bold text-xs sm:text-[13px] transition cursor-pointer border border-amber-200/60 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>⚡</span>
                <span className="truncate">Auto-fill Admin Demo Credentials (admin@eldoria.care)</span>
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  );
}