import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Lock,
  LogIn,
  MailCheck,
  Map as MapIcon,
  ReceiptText,
  Send,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import type {
  AppNotification,
  Mouja,
  MoujaMapItem,
  PaymentRequest,
  PricingSettings,
  PurchasedMap,
  ServiceOrder,
  UnlockedKhatian,
  UserProfile,
  WalletTransaction,
} from '../types';
import { formatRelativeTimeBn } from '../utils/notifications';
import { enToBnDigits } from '../utils/landRecords';
import {
  formatCountdownBn,
  getRemainingUnlockMs,
  validateBkashPhone,
  validateDepositAmount,
  validateTrxId,
} from '../utils/billing';
import { buildApiUrl } from '../config/api';

interface UserDashboardViewProps {
  isSignedIn: boolean;
  emailVerified: boolean;
  usesPasswordProvider: boolean;
  profile: UserProfile | null;
  pricing: PricingSettings;
  paymentRequests: PaymentRequest[];
  unlockedList: UnlockedKhatian[];
  purchasedMapsList: PurchasedMap[];
  serviceOrders: ServiceOrder[];
  walletTransactions: WalletTransaction[];
  allMaps: MoujaMapItem[];
  moujas: Mouja[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  getAuthToken: () => Promise<string | null>;
  onOpenNotifications: () => void;
  onOpenAuth: (reason?: string) => void;
  onResendVerification: () => Promise<void>;
  onSubmitPayment: (payload: {
    amount: number;
    bkashNumber: string;
    trxId: string;
  }) => Promise<void>;
  onViewUnlockedEntry: (unlockItem: UnlockedKhatian) => Promise<void>;
  onCancelServiceOrder: (order: ServiceOrder) => Promise<void>;
}

export function UserDashboardView({
  isSignedIn,
  emailVerified,
  usesPasswordProvider,
  profile,
  pricing,
  paymentRequests,
  unlockedList,
  purchasedMapsList,
  serviceOrders,
  walletTransactions,
  allMaps,
  moujas,
  notifications,
  unreadNotificationCount,
  getAuthToken,
  onOpenNotifications,
  onOpenAuth,
  onResendVerification,
  onSubmitPayment,
  onViewUnlockedEntry,
  onCancelServiceOrder,
}: UserDashboardViewProps) {
  const [amountInput, setAmountInput] = useState('300');
  const [bkashInput, setBkashInput] = useState('');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copiedBkash, setCopiedBkash] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<
    'payments' | 'khatians' | 'maps' | 'orders' | 'ledger'
  >('payments');

  useEffect(() => {
    if (unlockedList.length === 0) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [unlockedList]);

  useEffect(() => {
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }
    let active = true;
    void getAuthToken().then((t) => {
      if (active) setAuthToken(t);
    });
    return () => {
      active = false;
    };
  }, [isSignedIn, purchasedMapsList, getAuthToken]);

  async function handleCopyBkash() {
    try {
      await navigator.clipboard.writeText(pricing.bkashNumber);
      setCopiedBkash(true);
      setTimeout(() => setCopiedBkash(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  }

  async function handleResendClick() {
    setResendingVerify(true);
    setVerifyMsg(null);
    try {
      await onResendVerification();
      setVerifyMsg(
        'আপনার ইমেইলে পুনরায় ভেরিফিকেশন লিংক পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।'
      );
    } catch (err) {
      setVerifyMsg(
        err instanceof Error
          ? err.message
          : 'ভেরিফিকেশন ইমেইল পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।'
      );
    } finally {
      setResendingVerify(false);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isSignedIn) {
      onOpenAuth('বিকাশ পেমেন্ট ভেরিফাই করতে অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    const amountCheck = validateDepositAmount(amountInput);
    if (!amountCheck.valid) {
      setFormError(amountCheck.error || 'সঠিক পরিমাণ লিখুন।');
      return;
    }
    const phoneCheck = validateBkashPhone(bkashInput);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.error || 'সঠিক বিকাশ নম্বর লিখুন।');
      return;
    }
    const trxCheck = validateTrxId(trxIdInput);
    if (!trxCheck.valid) {
      setFormError(trxCheck.error || 'সঠিক TrxID লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitPayment({
        amount: amountCheck.amount,
        bkashNumber: phoneCheck.normalized,
        trxId: trxCheck.normalized,
      });
      setTrxIdInput('');
      setFormSuccess(
        'আপনার বিকাশ পেমেন্ট অনুরোধটি সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাই করে অনুমোদন দিলে আপনার ব্যালেন্সে টাকা যুক্ত হবে।'
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'পেমেন্ট অনুরোধ পাঠাতে সমস্যা হয়েছে।'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const moujaMapById = new Map(moujas.map((m) => [m.id, m]));
  const mapById = new Map(allMaps.map((m) => [m.id, m]));

  return (
    <section className="space-y-6">
      {/* Top Profile & Balance Summary */}
      {isSignedIn && profile ? (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  {(profile.displayName || profile.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {profile.displayName || 'সম্মানিত ব্যবহারকারী'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  {profile.email} · আনলক খতিয়ান: {enToBnDigits(unlockedList.length)} টি · কেনা ম্যাপ:{' '}
                  {enToBnDigits(purchasedMapsList.length)} টি · সেবা আবেদন:{' '}
                  {enToBnDigits(serviceOrders.length)} টি
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-left sm:text-right shrink-0">
              <div className="text-xs font-medium text-emerald-800">
                বর্তমান ওয়ালেট ব্যালেন্স
              </div>
              <div className="text-2xl font-bold text-emerald-900 font-mono tabular-nums">
                ৳{enToBnDigits(profile.balance.toFixed(0))}
              </div>
            </div>
          </div>

          {usesPasswordProvider && !emailVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-900">
                <MailCheck className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <span className="font-semibold">
                    আপনার ইমেইলটি এখনো ভেরিফাই করা হয়নি।
                  </span>{' '}
                  সুরক্ষার জন্য ইনবক্সে পাঠানো লিংকে ক্লিক করে ইমেইল ভেরিফাই করুন।
                  {verifyMsg && (
                    <p className="mt-1 text-xs font-medium text-emerald-800">
                      {verifyMsg}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleResendClick()}
                disabled={resendingVerify}
                className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                {resendingVerify
                  ? 'পাঠানো হচ্ছে...'
                  : 'ভেরিফিকেশন লিংক আবার পাঠান'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              ব্যবহারকারী প্রোফাইল ও ফান্ড যোগ করুন
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              আপনার ব্যালেন্স দেখতে, বিকাশ পেমেন্ট জমা দিতে এবং আনলক করা খতিয়ান/ম্যাপ
              সংরক্ষণ করতে একাউন্টে লগইন করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenAuth('আপনার প্রোফাইল ও ওয়ালেট ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন।')
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            লগইন / একাউন্ট খুলুন
          </button>
        </div>
      )}

      {/* Offline bKash Add Fund Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                বিকাশ (bKash) অফলাইন পেমেন্ট নির্দেশিকা
              </h2>
              <p className="text-xs text-slate-500">
                টাকা পাঠানোর পর TrxID দিয়ে ভেরিফাই করুন (ডুপ্লিকেট TrxID স্বয়ংক্রিয়ভাবে ব্লক হয়)
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">
              অ্যাডমিন বিকাশ নম্বর · {pricing.bkashAccountType}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums tracking-wide">
                {pricing.bkashNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyBkash}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedBkash ? 'কপি হয়েছে' : 'কপি'}
              </button>
            </div>
          </div>

          <ol className="space-y-2 text-xs sm:text-sm text-slate-600 list-decimal list-inside leading-relaxed">
            <li>
              আপনার বিকাশ অ্যাপ থেকে উপরের নম্বরে <strong>Send Money</strong> করুন।
            </li>
            <li>
              বিকাশ থেকে প্রাপ্ত <strong>Transaction ID (TrxID)</strong> সংরক্ষণ করুন।
            </li>
            <li>
              পাশের ফর্মে টাকার পরিমাণ, আপনার বিকাশ নম্বর ও TrxID লিখে জমা দিন।
            </li>
            <li>
              সুপার অ্যাডমিন যাচাই করে অনুমোদন দিলে আপনার একাউন্টে ব্যালেন্স যুক্ত
              হবে ও নোটিফিকেশন পাবেন।
            </li>
          </ol>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            বর্তমান সেবা চার্জ: খতিয়ান আনলক{' '}
            <strong className="text-slate-900 font-mono">
              ৳{enToBnDigits(pricing.khatianPrice)}
            </strong>{' '}
            · মৌজা ম্যাপ{' '}
            <strong className="text-slate-900 font-mono">
              ৳{enToBnDigits(pricing.defaultMapPrice)}
            </strong>
          </div>
        </div>

        <form
          onSubmit={handlePaymentSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">
            ফান্ড অ্যাড ও ট্রানজেকশন ভেরিফাই ফর্ম
          </h2>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="deposit-amount"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                টাকার পরিমাণ (৳১০ - ৳৫০,০০০)
              </label>
              <input
                id="deposit-amount"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="যেমন: 300"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-700"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[50, 100, 300, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountInput(String(preset))}
                    className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-mono text-slate-700 cursor-pointer"
                  >
                    ৳{enToBnDigits(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="sender-bkash"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                যে বিকাশ নম্বর থেকে টাকা পাঠিয়েছেন
              </label>
              <input
                id="sender-bkash"
                type="tel"
                value={bkashInput}
                onChange={(e) => setBkashInput(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bkash-trxid"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
            >
              বিকাশ Transaction ID (TrxID)
            </label>
            <input
              id="bkash-trxid"
              type="text"
              value={trxIdInput}
              onChange={(e) => setTrxIdInput(e.target.value)}
              placeholder="যেমন: BGH78K91PQ"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono uppercase text-slate-900 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'জমা হচ্ছে...' : 'ভেরিফিকেশনের জন্য জমা দিন'}
          </button>
        </form>
      </div>

      {/* History, Service Orders & Wallet Ledger Tabs */}
      {isSignedIn && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center gap-4 overflow-x-auto">
            {(
              [
                ['payments', `পেমেন্ট ইতিহাস (${enToBnDigits(paymentRequests.length)})`],
                ['ledger', `ওয়ালেট স্টেটমেন্ট (${enToBnDigits(walletTransactions.length)})`],
                ['orders', `সেবার আবেদন (${enToBnDigits(serviceOrders.length)})`],
                ['khatians', `আনলক করা খতিয়ান (${enToBnDigits(unlockedList.length)})`],
                ['maps', `কেনা মৌজা ম্যাপ (${enToBnDigits(purchasedMapsList.length)})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHistoryTab(key)}
                className={`py-3.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                  historyTab === key
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {historyTab === 'payments' && (
              <>
                {paymentRequests.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    এখনো কোনো বিকাশ পেমেন্ট অনুরোধ জমা দেওয়া হয়নি।
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {paymentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                            ৳{enToBnDigits(req.amount)} · TrxID: {req.trxId}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            প্রেরক নম্বর: <span className="font-mono">{req.bkashNumber}</span>
                            {req.adminNote ? ` · অ্যাডমিন নোট: ${req.adminNote}` : ''}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              অনুমোদিত
                            </span>
                          )}
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                              <Clock className="w-4 h-4" />
                              অপেক্ষমাণ (Pending)
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                              <XCircle className="w-4 h-4" />
                              বাতিল
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {historyTab === 'ledger' && (
              <>
                {walletTransactions.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <ReceiptText className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500">
                      এখনো কোনো ওয়ালেট লেনদেন রেকর্ড হয়নি।
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {walletTransactions.map((tx) => {
                      const isCredit = tx.direction === 'credit';
                      return (
                        <div
                          key={tx.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isCredit
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {tx.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {formatRelativeTimeBn(tx.createdAtMs, nowMs)}
                                {tx.referenceId ? ` · রেফ: ${tx.referenceId}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <div
                              className={`text-sm font-bold font-mono tabular-nums ${
                                isCredit ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isCredit ? '+' : '-'}৳{enToBnDigits(tx.amount)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              ব্যালেন্স: ৳{enToBnDigits(tx.balanceAfter)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {historyTab === 'orders' && (
              <>
                {serviceOrders.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <Briefcase className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500">
                      আপনি এখনো কোনো অতিরিক্ত সেবার আবেদন করেননি।
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {serviceOrders.map((order) => (
                      <div
                        key={order.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">
                            {order.serviceTitle} ·{' '}
                            <span className="font-mono text-emerald-700">
                              ৳{enToBnDigits(order.amountPaid)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-line">
                            {order.details}
                          </p>
                          {order.adminNote && (
                            <p className="text-xs text-emerald-800 font-medium">
                              অ্যাডমিন নোট: {order.adminNote}
                            </p>
                          )}
                          {order.deliveryUrl && (
                            <a
                              href={order.deliveryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              ডেলিভারি ফাইল / লিংক দেখুন
                            </a>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col sm:items-end gap-2">
                          {order.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              সম্পন্ন হয়েছে
                            </span>
                          )}
                          {order.status === 'accepted' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              কাজ গৃহীত হয়েছে
                            </span>
                          )}
                          {order.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <Clock className="w-4 h-4" />
                                অপেক্ষমাণ
                              </span>
                              {order.paymentDeducted === false && (
                                <button
                                  type="button"
                                  onClick={() => void onCancelServiceOrder(order)}
                                  className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                                >
                                  বাতিল করুন
                                </button>
                              )}
                            </div>
                          )}
                          {(order.status === 'cancelled' ||
                            order.status === 'rejected') && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                              <XCircle className="w-4 h-4" />
                              বাতিল / রিফান্ড
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {historyTab === 'khatians' && (
              <>
                {unlockedList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    আপনি এখনো কোনো খতিয়ান আনলক করেননি।
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {unlockedList.map((item) => {
                      const mouja = moujaMapById.get(item.moujaId);
                      const remainingMs = getRemainingUnlockMs(
                        item,
                        nowMs,
                        pricing.unlockDurationMinutes
                      );
                      const active = remainingMs > 0;

                      return (
                        <div
                          key={item.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                খতিয়ান নং {item.khatianNo} ({item.surveyType} জরিপ)
                              </div>
                              <div className="text-xs text-slate-500">
                                মৌজা: {mouja?.name || item.moujaId} · পরিশোধিত:{' '}
                                <span className="font-mono">
                                  ৳{enToBnDigits(item.amountPaid)}
                                </span>{' '}
                                ·{' '}
                                {active ? (
                                  <span className="text-amber-700 font-semibold">
                                    বাকি: {formatCountdownBn(remainingMs)}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 font-semibold">
                                    মেয়াদ শেষ (পুনরায় লক)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {active ? (
                            <button
                              type="button"
                              onClick={() => void onViewUnlockedEntry(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer self-start sm:self-center"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              দেখুন ({formatCountdownBn(remainingMs)})
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium self-start sm:self-center">
                              <Lock className="w-3.5 h-3.5" />
                              লক করা
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {historyTab === 'maps' && (
              <>
                {purchasedMapsList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    আপনি এখনো কোনো মৌজা ম্যাপ কেনেননি।
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {purchasedMapsList.map((pm) => {
                      const mapItem = mapById.get(pm.mapId);
                      const downloadUrl = mapItem
                        ? mapItem.isBuiltIn && authToken
                          ? buildApiUrl(`/api/maps/file/${encodeURIComponent(
                              mapItem.id
                            )}?token=${encodeURIComponent(authToken)}&download=1`)
                          : mapItem.imageUrl
                        : undefined;

                      return (
                        <div
                          key={pm.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <MapIcon className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {mapItem?.title || pm.mapId}
                              </div>
                              <div className="text-xs text-slate-500">
                                পরিশোধিত:{' '}
                                <span className="font-mono">
                                  ৳{enToBnDigits(pm.amountPaid)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {mapItem && downloadUrl && (
                            <a
                              href={downloadUrl}
                              download={`${mapItem.id}.jpg`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold self-start sm:self-center"
                            >
                              <Download className="w-3.5 h-3.5" />
                              ডাউনলোড করুন
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Recent Live Rate & Service Notifications */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                সাম্প্রতিক নোটিফিকেশন ও রেট আপডেট
              </h2>
              <p className="text-xs text-slate-500">
                ব্যক্তিগত পেমেন্ট/সেবা আপডেট ও রেট পরিবর্তনের লাইভ বিজ্ঞপ্তি এখানে আসে
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer self-start sm:self-center"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-700" />
            সব নোটিফিকেশন দেখুন
            {unreadNotificationCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px]">
                {enToBnDigits(unreadNotificationCount)}
              </span>
            )}
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            এখনো কোনো নোটিফিকেশন প্রকাশিত হয়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {notifications.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      item.category === 'rate_drop' || item.category === 'payment_update'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.category === 'rate_increase'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {item.category === 'rate_drop' ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : item.category === 'rate_increase' ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.message}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {formatRelativeTimeBn(item.createdAtMs, nowMs)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
