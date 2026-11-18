import { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Megaphone,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import type { AppNotification, AppTab, ContactMessage } from '../../types';
import { enToBnDigits } from '../../utils/landRecords';

interface AdminNotificationsTabProps {
  notifications: AppNotification[];
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onSendAnnouncement: (
    title: string,
    message: string,
    targetTab?: AppTab
  ) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
}

export function AdminNotificationsTab({
  notifications,
  busyId,
  setBusyId,
  setStatusMsg,
  onSendAnnouncement,
  onDeleteNotification,
}: AdminNotificationsTabProps) {
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceTab, setAnnounceTab] = useState<'none' | AppTab>('none');

  return (
    <div className="space-y-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!announceTitle.trim() || !announceMsg.trim()) return;
          setBusyId('announce');
          setStatusMsg(null);
          try {
            await onSendAnnouncement(
              announceTitle.trim(),
              announceMsg.trim(),
              announceTab === 'none' ? undefined : announceTab
            );
            setAnnounceTitle('');
            setAnnounceMsg('');
            setStatusMsg('সকল ব্যবহারকারীর কাছে লাইভ নোটিফিকেশন পাঠানো হয়েছে।');
          } finally {
            setBusyId(null);
          }
        }}
        className="border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            সকল ব্যবহারকারীকে লাইভ নোটিফিকেশন পাঠান
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          এছাড়াও আপনি মূল্য, ম্যাপের দাম, সেবা ফি বা লক সময়সীমা পরিবর্তন করলে
          স্বয়ংক্রিয়ভাবে লাইভ নোটিফিকেশন চলে যাবে।
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="নোটিফিকেশন শিরোনাম (যেমন: বিশেষ ছাড়!)"
            value={announceTitle}
            onChange={(e) => setAnnounceTitle(e.target.value)}
            className="sm:col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <select
            value={announceTab}
            onChange={(e) => setAnnounceTab(e.target.value as 'none' | AppTab)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="none">লিঙ্ক ছাড়া</option>
            <option value="search">খতিয়ান অনুসন্ধান পাতা</option>
            <option value="maps">মৌজা ম্যাপ পাতা</option>
            <option value="services">সেবা সমূহ পাতা</option>
          </select>
        </div>
        <textarea
          rows={2}
          required
          placeholder="বিস্তারিত বার্তা লিখুন..."
          value={announceMsg}
          onChange={(e) => setAnnounceMsg(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 text-sm"
        />
        <button
          type="submit"
          disabled={busyId === 'announce'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          লাইভ নোটিফিকেশন পাঠান
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-emerald-700" />
          প্রকাশিত নোটিফিকেশনসমূহ ({enToBnDigits(notifications.length)} টি)
        </h3>
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            এখনো কোনো নোটিফিকেশন পাঠানো হয়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {notifications.map((ntf) => (
              <div
                key={ntf.id}
                className="p-3.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-900">
                    {ntf.title}
                  </div>
                  <p className="text-xs text-slate-600">{ntf.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteNotification(ntf.id)}
                  aria-label="নোটিফিকেশন মুছুন"
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminMessagesTabProps {
  contactMessages: ContactMessage[];
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onResolveContactMessage: (msgId: string) => Promise<void>;
  onDeleteContactMessage: (msgId: string) => Promise<void>;
}

export function AdminMessagesTab({
  contactMessages,
  busyId,
  setBusyId,
  setStatusMsg,
  onResolveContactMessage,
  onDeleteContactMessage,
}: AdminMessagesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-emerald-700" />
        <h2 className="text-base font-bold text-slate-900">
          ব্যবহারকারীদের পাঠানো যোগাযোগ বার্তা ({enToBnDigits(contactMessages.length)} টি)
        </h2>
      </div>

      {contactMessages.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          এখনো কোনো যোগাযোগ বার্তা জমা হয়নি।
        </p>
      ) : (
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
          {contactMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {msg.name}
                  </span>
                  <span className="text-xs font-mono text-emerald-800 font-semibold">
                    {msg.phone}
                  </span>
                  {msg.email && (
                    <span className="text-xs text-slate-500">({msg.email})</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      msg.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {msg.status === 'resolved' ? 'সমাধান হয়েছে' : 'নতুন বার্তা'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  বিষয়: {msg.subject}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-line">
                  {msg.message}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {msg.status !== 'resolved' && (
                  <button
                    type="button"
                    disabled={busyId === msg.id}
                    onClick={async () => {
                      setBusyId(msg.id);
                      try {
                        await onResolveContactMessage(msg.id);
                        setStatusMsg('বার্তাটি সমাধান সম্পন্ন হিসেবে চিহ্নিত হয়েছে।');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    সমাধান সম্পন্ন
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteContactMessage(msg.id);
                    setStatusMsg('বার্তাটি মুছে ফেলা হয়েছে।');
                  }}
                  aria-label="বার্তা মুছুন"
                  className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
