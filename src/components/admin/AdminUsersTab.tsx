import { useState } from 'react';
import {
  Ban,
  PauseCircle,
  Search,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import type { AccountStatus, UserProfile } from '../../types';
import {
  formatBanRemainingBn,
  getEffectiveUserRestriction,
  SUPER_ADMIN_EMAIL,
} from '../../utils/billing';
import { bnToEnDigits, enToBnDigits } from '../../utils/landRecords';

interface AdminUsersTabProps {
  users: UserProfile[];
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onUpdateUserStatus: (
    targetUser: UserProfile,
    nextStatus: AccountStatus,
    options?: { banDurationHours?: number; reason?: string }
  ) => Promise<void>;
}

export function AdminUsersTab({
  users,
  busyId,
  setBusyId,
  setStatusMsg,
  onUpdateUserStatus,
}: AdminUsersTabProps) {
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | AccountStatus
  >('all');
  const [modTarget, setModTarget] = useState<UserProfile | null>(null);
  const [modStatus, setModStatus] = useState<AccountStatus>('disabled');
  const [modBanHours, setModBanHours] = useState('24');
  const [modReason, setModReason] = useState('');
  const [modError, setModError] = useState<string | null>(null);

  const nowMs = Date.now();
  const q = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    const eff = getEffectiveUserRestriction(u, nowMs);
    if (userStatusFilter !== 'all' && eff.effectiveStatus !== userStatusFilter) {
      return false;
    }
    if (!q) return true;
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="নাম বা ইমেইল দিয়ে ব্যবহারকারী খুঁজুন..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: 'সকল' },
                { id: 'active', label: 'সক্রিয়' },
                { id: 'banned', label: 'সাময়িক ব্যান' },
                { id: 'suspended', label: 'সাসপেন্ড' },
                { id: 'disabled', label: 'ডিজেবল' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setUserStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                  userStatusFilter === f.id
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            কোনো ব্যবহারকারী পাওয়া যায়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {filteredUsers.map((u) => {
              const isProtectedAdmin =
                (u.email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
              const restriction = getEffectiveUserRestriction(u, nowMs);
              const isRestricted = restriction.isBlocked;

              return (
                <div
                  key={u.uid}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {u.displayName || 'নামবিহীন ব্যবহারকারী'}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 font-mono tabular-nums bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ৳{enToBnDigits((u.balance ?? 0).toFixed(0))}
                      </span>
                      {isProtectedAdmin ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-700 text-white">
                          সুপার অ্যাডমিন (সুরক্ষিত)
                        </span>
                      ) : restriction.effectiveStatus === 'active' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          সক্রিয়
                        </span>
                      ) : restriction.effectiveStatus === 'banned' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          সাময়িক ব্যান · বাকি:{' '}
                          {formatBanRemainingBn(restriction.remainingMs)}
                        </span>
                      ) : restriction.effectiveStatus === 'suspended' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          সাসপেন্ড
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                          ডিজেবল
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    {isRestricted && restriction.reason && (
                      <div className="text-xs text-rose-700">
                        কারণ: {restriction.reason}
                      </div>
                    )}
                  </div>

                  {!isProtectedAdmin && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {isRestricted && (
                        <button
                          type="button"
                          disabled={busyId === `mod-${u.uid}`}
                          onClick={async () => {
                            setBusyId(`mod-${u.uid}`);
                            setStatusMsg(null);
                            try {
                              await onUpdateUserStatus(u, 'active');
                              setStatusMsg(
                                `${u.displayName || u.email} এর একাউন্ট পুনরায় সক্রিয় করা হয়েছে।`
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          সক্রিয় করুন
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === `mod-${u.uid}`}
                        onClick={() => {
                          setModTarget(u);
                          setModStatus('disabled');
                          setModReason(u.restrictionReason || '');
                          setModError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        ডিজেবল
                      </button>

                      <button
                        type="button"
                        disabled={busyId === `mod-${u.uid}`}
                        onClick={() => {
                          setModTarget(u);
                          setModStatus('banned');
                          setModBanHours('24');
                          setModReason(u.restrictionReason || '');
                          setModError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        সাময়িক ব্যান
                      </button>

                      <button
                        type="button"
                        disabled={busyId === `mod-${u.uid}`}
                        onClick={() => {
                          setModTarget(u);
                          setModStatus('suspended');
                          setModReason(u.restrictionReason || '');
                          setModError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        সাসপেন্ড
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Moderation Confirmation Dialog */}
      {modTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modStatus === 'disabled'
                    ? 'একাউন্ট ডিজেবল করুন'
                    : modStatus === 'banned'
                    ? 'সাময়িক ব্যান দিন'
                    : 'একাউন্ট সাসপেন্ড করুন'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modTarget.displayName || 'ব্যবহারকারী'} ({modTarget.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModTarget(null)}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {modStatus === 'banned' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  ব্যানের সময়সীমা (ঘণ্টা)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { h: '1', label: '১ ঘণ্টা' },
                    { h: '24', label: '২৪ ঘণ্টা' },
                    { h: '72', label: '৩ দিন' },
                    { h: '168', label: '৭ দিন' },
                    { h: '720', label: '৩০ দিন' },
                  ].map((p) => (
                    <button
                      key={p.h}
                      type="button"
                      onClick={() => setModBanHours(p.h)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        modBanHours === p.h
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modBanHours}
                  onChange={(e) => setModBanHours(e.target.value)}
                  placeholder="কাস্টম ঘণ্টা লিখুন (যেমন: 48)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                কারণ / মন্তব্য (ব্যবহারকারী দেখতে পাবেন)
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="যেমন: ভুয়া ট্রানজেকশন আইডি প্রদান বা নীতিমালা ভঙ্গের কারণে সাময়িক ব্যবস্থা নেওয়া হয়েছে।"
                className="w-full p-3 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            {modError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {modError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={busyId === `mod-${modTarget.uid}`}
                onClick={async () => {
                  setModError(null);
                  let banDurationHours: number | undefined;
                  if (modStatus === 'banned') {
                    const parsed = Number(bnToEnDigits(modBanHours).trim());
                    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 8760) {
                      setModError(
                        'সঠিক ঘণ্টা লিখুন (সর্বনিম্ন ১ থেকে সর্বোচ্চ ৮৭৬০ ঘণ্টা)।'
                      );
                      return;
                    }
                    banDurationHours = Math.round(parsed);
                  }
                  const target = modTarget;
                  setBusyId(`mod-${target.uid}`);
                  setStatusMsg(null);
                  try {
                    await onUpdateUserStatus(target, modStatus, {
                      banDurationHours,
                      reason: modReason.trim(),
                    });
                    setStatusMsg(
                      `${target.displayName || target.email} এর একাউন্ট ${
                        modStatus === 'disabled'
                          ? 'ডিজেবল'
                          : modStatus === 'banned'
                          ? 'সাময়িক ব্যান'
                          : 'সাসপেন্ড'
                      } করা হয়েছে।`
                    );
                    setModTarget(null);
                  } finally {
                    setBusyId(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer ${
                  modStatus === 'banned'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : modStatus === 'suspended'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {busyId === `mod-${modTarget.uid}`
                  ? 'সংরক্ষণ হচ্ছে...'
                  : 'নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
