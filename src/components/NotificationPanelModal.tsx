import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BellOff,
  CheckCheck,
  Megaphone,
  Power,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { AppNotification, AppTab } from '../types';
import { enToBnDigits } from '../utils/landRecords';
import {
  formatRelativeTimeBn,
  isNotificationUnread,
} from '../utils/notifications';

interface NotificationPanelModalProps {
  isOpen: boolean;
  notifications: AppNotification[];
  readIds: ReadonlySet<string>;
  clearedBeforeMs: number;
  unreadCount: number;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: AppTab) => void;
}

export function NotificationPanelModal({
  isOpen,
  notifications,
  readIds,
  clearedBeforeMs,
  unreadCount,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab,
}: NotificationPanelModalProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-panel-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white h-full max-w-md w-full flex flex-col shadow-2xl border-l border-slate-200">
        {/* Pinned Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="notification-panel-title"
                className="text-base font-bold text-slate-900"
              >
                নোটিফিকেশন প্যানেল
              </h2>
              <p className="text-[11px] text-slate-500">
                লাইভ রেট পরিবর্তন ও সেবা আপডেট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-emerald-800 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                সব পঠিত
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="নোটিফিকেশন প্যানেল বন্ধ করুন"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Notification Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  এখনো কোনো নোটিফিকেশন নেই
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  সুপার অ্যাডমিন খতিয়ান, মৌজা ম্যাপ বা যেকোনো সেবার মূল্য কমালে বা
                  বাড়ালে এখানে সাথে সাথে লাইভ বিজ্ঞপ্তি দেখতে পাবেন।
                </p>
              </div>
            </div>
          ) : (
            notifications.map((item) => {
              const unread = isNotificationUnread(
                item,
                readIds,
                clearedBeforeMs
              );

              const badgeConfig =
                item.category === 'rate_drop'
                  ? {
                      label: 'রেট কমেছে',
                      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      iconBg: 'bg-emerald-100 text-emerald-700',
                      Icon: TrendingDown,
                    }
                  : item.category === 'rate_increase'
                    ? {
                        label: 'রেট বেড়েছে',
                        bg: 'bg-amber-50 text-amber-800 border-amber-200',
                        iconBg: 'bg-amber-100 text-amber-800',
                        Icon: TrendingUp,
                      }
                    : item.category === 'service_status'
                      ? {
                          label: 'সেবা আপডেট',
                          bg: 'bg-sky-50 text-sky-800 border-sky-200',
                          iconBg: 'bg-sky-100 text-sky-700',
                          Icon: Power,
                        }
                      : item.category === 'payment_update'
                        ? {
                            label: 'ব্যালেন্স / পেমেন্ট',
                            bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            iconBg: 'bg-emerald-100 text-emerald-700',
                            Icon: Bell,
                          }
                        : item.category === 'order_update'
                          ? {
                              label: 'আবেদন আপডেট',
                              bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                              iconBg: 'bg-indigo-100 text-indigo-700',
                              Icon: Bell,
                            }
                          : item.category === 'account_alert'
                            ? {
                                label: 'একাউন্ট সতর্কতা',
                                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                                iconBg: 'bg-rose-100 text-rose-700',
                                Icon: Bell,
                              }
                            : {
                                label: 'ঘোষণা',
                                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                                iconBg: 'bg-slate-100 text-slate-700',
                                Icon: Megaphone,
                              };

              const IconComp = badgeConfig.Icon;

              return (
                <article
                  key={item.id}
                  className={`p-4 transition-colors ${
                    unread ? 'bg-emerald-50/45' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badgeConfig.iconBg}`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${badgeConfig.bg}`}
                        >
                          {badgeConfig.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTimeBn(item.createdAtMs, nowMs)}
                          </span>
                          {unread && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-600"
                              title="অপঠিত"
                            />
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.message}
                      </p>

                      {typeof item.oldPrice === 'number' &&
                        typeof item.newPrice === 'number' && (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-mono tabular-nums">
                            <span className="line-through text-slate-400">
                              ৳{enToBnDigits(item.oldPrice)}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span
                              className={`font-bold ${
                                item.category === 'rate_drop'
                                  ? 'text-emerald-700'
                                  : 'text-amber-800'
                              }`}
                            >
                              ৳{enToBnDigits(item.newPrice)}
                            </span>
                          </div>
                        )}

                      <div className="flex items-center gap-3 pt-1">
                        {unread && (
                          <button
                            type="button"
                            onClick={() => onMarkRead(item.id)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            পঠিত চিহ্নিত করুন
                          </button>
                        )}
                        {item.targetTab && (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkRead(item.id);
                              onNavigateTab(item.targetTab!);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            সেবাটি দেখুন
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
