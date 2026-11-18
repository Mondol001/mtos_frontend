import { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Mail, UserPlus, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (name: string, email: string, password: string) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  reasonText?: string;
}

function mapAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('popup-closed-by-user')) {
    return 'লগইন পপআপ বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  }
  if (msg.includes('popup-blocked')) {
    return 'ব্রাউজার পপআপ ব্লক করেছে। পপআপ অনুমতি দিয়ে আবার চেষ্টা করুন।';
  }
  if (
    msg.includes('auth/invalid-credential') ||
    msg.includes('auth/wrong-password') ||
    msg.includes('auth/user-not-found')
  ) {
    return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।';
  }
  if (msg.includes('auth/weak-password')) {
    return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Firebase Console থেকে Email/Password লগইন পদ্ধতি এখনও চালু করা হয়নি।';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
  }
  return 'লগইন সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
}

export function AuthModal({
  isOpen,
  onClose,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onPasswordReset,
  reasonText,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<'email' | 'google' | 'reset' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGoogleLogin() {
    setError(null);
    setInfoMsg(null);
    setLoading('google');
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim()) {
      setError('ইমেইল ঠিকানা লিখুন।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('আপনার পূর্ণ নাম লিখুন।');
      return;
    }

    setLoading('email');
    try {
      if (mode === 'login') {
        await onEmailSignIn(email, password);
      } else {
        await onEmailSignUp(name, email, password);
      }
      onClose();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setInfoMsg(null);
    if (!email.trim()) {
      setError('পাসওয়ার্ড রিসেট লিংক পেতে আগে আপনার ইমেইল লিখুন।');
      return;
    }
    setLoading('reset');
    try {
      await onPasswordReset(email);
      setInfoMsg(
        'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।'
      );
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                আপনার একাউন্টে প্রবেশ করুন
              </h2>
              <p className="text-xs text-slate-500">
                Mondol Telecom Online Services
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
          {reasonText ||
            'খতিয়ানের পুরো তথ্য আনলক করতে, মৌজা ম্যাপ কিনতে এবং বিকাশ পেমেন্টের মাধ্যমে ব্যালেন্স যুক্ত করতে ইমেইল-পাসওয়ার্ড অথবা গুগল একাউন্ট দিয়ে প্রবেশ করুন।'}
        </p>

        {/* Login / Register Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfoMsg(null);
            }}
            className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ইমেইল লগইন
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setInfoMsg(null);
            }}
            className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            নতুন একাউন্ট খুলুন
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            {infoMsg}
          </div>
        )}

        {/* Method 1: Email & Password */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                আপনার নাম
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: মোঃ ইয়াকুব মন্ডল"
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              ইমেইল ঠিকানা
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-700"
              >
                পাসওয়ার্ড
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading !== null}
                  className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  {loading === 'reset' ? 'পাঠানো হচ্ছে...' : 'পাসওয়ার্ড ভুলে গেছেন?'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
                required
                minLength={6}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading !== null}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            {mode === 'login' ? (
              <Mail className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading === 'email'
                ? mode === 'login'
                  ? 'লগইন হচ্ছে...'
                  : 'একাউন্ট তৈরি হচ্ছে...'
                : mode === 'login'
                  ? 'ইমেইল দিয়ে লগইন করুন'
                  : 'নতুন একাউন্ট তৈরি করুন'}
            </span>
          </button>
        </form>

        <div className="relative my-4 flex items-center">
          <div className="grow border-t border-slate-200" />
          <span className="shrink mx-3 text-xs text-slate-400 font-medium">
            অথবা
          </span>
          <div className="grow border-t border-slate-200" />
        </div>

        {/* Method 2: Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading !== null}
          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 text-slate-800 font-semibold text-sm transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-emerald-700" />
          <span>
            {loading === 'google'
              ? 'লগইন হচ্ছে...'
              : 'Google একাউন্ট দিয়ে প্রবেশ করুন'}
          </span>
        </button>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          নিরাপদ Firebase Authentication (Email/Password ও Google) দ্বারা
          সুরক্ষিত।
        </p>
      </div>
    </div>
  );
}
