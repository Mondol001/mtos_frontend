import { AlertCircle, Check, Wallet, X } from 'lucide-react';
import { enToBnDigits } from '../utils/landRecords';

interface ConfirmDebitModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  itemLabel: string;
  amount: number;
  currentBalance: number;
  alertMessage?: string;
  summaryDebitLabel?: string;
  summaryRemainingLabel?: string;
  confirmLabel?: string;
  note?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDebitModal({
  isOpen,
  title,
  subtitle = 'টাকা কাটার পূর্বে সম্মতি দিন',
  itemLabel,
  amount,
  currentBalance,
  alertMessage,
  summaryDebitLabel = 'চার্জ কাটা হবে:',
  summaryRemainingLabel = 'কাটার পর অবশিষ্ট ব্যালেন্স:',
  confirmLabel,
  note,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDebitModalProps) {
  if (!isOpen) return null;

  const remainingBalance = Math.max(0, Math.round((currentBalance - amount) * 100) / 100);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-debit-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="confirm-debit-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                {title}
              </h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <span>
            {alertMessage ?? (
              <>
                আপনার একাউন্ট থেকে{' '}
                <strong className="font-mono text-rose-700">
                  ৳{enToBnDigits(amount)}
                </strong>{' '}
                কেটে নেওয়া হবে। আপনি কি এই লেনদেনে রাজি আছেন?
              </>
            )}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">সেবা / আইটেম:</span>
            <span className="font-semibold text-slate-900 text-right">
              {itemLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">বর্তমান ব্যালেন্স:</span>
            <span className="font-mono font-semibold text-slate-800">
              ৳{enToBnDigits(currentBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">{summaryDebitLabel}</span>
            <span className="font-mono font-bold text-rose-700">
              -৳{enToBnDigits(amount)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-700">
              {summaryRemainingLabel}
            </span>
            <span className="font-mono font-bold text-emerald-800">
              ৳{enToBnDigits(remainingBalance)}
            </span>
          </div>
        </div>

        {note && (
          <p className="text-xs text-slate-600 leading-relaxed">{note}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            না, বাতিল করুন
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {loading
              ? 'প্রক্রিয়াধীন...'
              : confirmLabel || `হ্যাঁ, রাজি আছি (৳${enToBnDigits(amount)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
