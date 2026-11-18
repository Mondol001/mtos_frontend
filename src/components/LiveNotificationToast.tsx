import { BellRing, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { AppNotification } from '../types';

interface LiveNotificationToastProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onOpenPanel: () => void;
}

export function LiveNotificationToast({
  notification,
  onDismiss,
  onOpenPanel,
}: LiveNotificationToastProps) {
  if (!notification) return null;

  const isDrop = notification.category === 'rate_drop';
  const isIncrease = notification.category === 'rate_increase';

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isDrop
                ? 'bg-emerald-100 text-emerald-700'
                : isIncrease
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-100 text-sky-700'
            }`}
          >
            {isDrop ? (
              <TrendingDown className="w-4 h-4" />
            ) : isIncrease ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <BellRing className="w-4 h-4" />
            )}
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              লাইভ নোটিফিকেশন
            </span>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {notification.title}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="বিজ্ঞপ্তি বন্ধ করুন"
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {notification.message}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          ঠিক আছে
        </button>
        <button
          type="button"
          onClick={() => {
            onDismiss();
            onOpenPanel();
          }}
          className="px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold cursor-pointer"
        >
          নোটিফিকেশন দেখুন
        </button>
      </div>
    </div>
  );
}
