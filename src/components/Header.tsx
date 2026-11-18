import { Bell, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AppTab, UserProfile } from '../types';
import { enToBnDigits } from '../utils/landRecords';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export function Header({
  activeTab,
  onSelectTab,
  user,
  profile,
  isAdmin,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenAuth,
  onSignOut,
}: HeaderProps) {
  const navItems: { id: AppTab; label: string; adminOnly?: boolean }[] = [
    { id: 'search', label: 'খতিয়ান অনুসন্ধান' },
    { id: 'maps', label: 'মৌজা ম্যাপ' },
    { id: 'services', label: 'সেবা সমূহ' },
    { id: 'guide', label: 'নির্দেশিকা' },
    { id: 'contact', label: 'যোগাযোগ' },
    { id: 'dashboard', label: 'প্রোফাইল ও ব্যালেন্স' },
    { id: 'admin', label: 'সুপার অ্যাডমিন', adminOnly: true },
  ];

  const visibleNavs = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-base tracking-tight">
            MT
          </div>
          <div className="leading-tight">
            <span className="block text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Mondol Telecom
            </span>
            <span className="block text-[11px] text-slate-500">
              অনলাইন ভূমি সেবা পোর্টাল
            </span>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {visibleNavs.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.adminOnly && <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`নোটিফিকেশন প্যানেল (${enToBnDigits(unreadNotificationCount)} টি অপঠিত)`}
            title="লাইভ নোটিফিকেশন প্যানেল"
            className="relative p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs">
                {unreadNotificationCount > 9
                  ? `${enToBnDigits(9)}+`
                  : enToBnDigits(unreadNotificationCount)}
              </span>
            )}
          </button>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold font-mono tabular-nums transition-colors cursor-pointer"
                title="আপনার বর্তমান ব্যালেন্স"
              >
                ৳{enToBnDigits((profile?.balance ?? 0).toFixed(0))}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">লগআউট</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন / একাউন্ট</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet navigation row */}
      <div className="lg:hidden border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {visibleNavs.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 bg-white border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
