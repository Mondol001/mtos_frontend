import {
  Banknote,
  Briefcase,
  Clock,
  Database,
  MessageSquare,
  Users,
} from 'lucide-react';
import type {
  ContactMessage,
  Mouja,
  PaymentRequest,
  ServiceOrder,
  UserProfile,
} from '../../types';
import { getEffectiveUserRestriction } from '../../utils/billing';
import { enToBnDigits } from '../../utils/landRecords';

interface AdminStatsCardsProps {
  users: UserProfile[];
  paymentRequests: PaymentRequest[];
  serviceOrders: ServiceOrder[];
  moujas: Mouja[];
  contactMessages: ContactMessage[];
  builtInRecordCount?: number;
  customKhatianCount?: number;
}

export function AdminStatsCards({
  users,
  paymentRequests,
  serviceOrders,
  moujas,
  contactMessages,
  builtInRecordCount = 2031,
  customKhatianCount = 0,
}: AdminStatsCardsProps) {
  const nowMs = Date.now();
  const restrictedCount = users.filter(
    (u) => getEffectiveUserRestriction(u, nowMs).isBlocked
  ).length;

  const pendingPayments = paymentRequests.filter((p) => p.status === 'pending');
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const approvedPayments = paymentRequests.filter((p) => p.status === 'approved');
  const approvedTotal = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const activeOrders = serviceOrders.filter(
    (o) => o.status === 'pending' || o.status === 'accepted'
  ).length;

  const unreadMessages = contactMessages.filter((m) => m.status === 'new').length;
  const totalKhatians = builtInRecordCount + customKhatianCount;

  const cards = [
    {
      label: 'মোট ব্যবহারকারী',
      value: `${enToBnDigits(users.length)} জন`,
      sub:
        restrictedCount > 0
          ? `সীমাবদ্ধ: ${enToBnDigits(restrictedCount)} জন`
          : 'সকল একাউন্ট সক্রিয়',
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'অপেক্ষমাণ বিকাশ',
      value: `${enToBnDigits(pendingPayments.length)} টি`,
      sub: `মোট ৳${enToBnDigits(pendingAmount)}`,
      icon: Clock,
      accent:
        pendingPayments.length > 0
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-slate-50 text-slate-600 border-slate-200',
    },
    {
      label: 'মোট অনুমোদিত ডিপোজিট',
      value: `৳${enToBnDigits(approvedTotal)}`,
      sub: `${enToBnDigits(approvedPayments.length)} টি সফল পেমেন্ট`,
      icon: Banknote,
      accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'সক্রিয় সেবা অর্ডার',
      value: `${enToBnDigits(activeOrders)} টি`,
      sub: `মোট আবেদন ${enToBnDigits(serviceOrders.length)} টি`,
      icon: Briefcase,
      accent:
        activeOrders > 0
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-slate-50 text-slate-600 border-slate-200',
    },
    {
      label: 'মৌজা ও খতিয়ান ডাটা',
      value: `${enToBnDigits(totalKhatians)} টি`,
      sub: `${enToBnDigits(moujas.length)} টি মৌজায় সংরক্ষিত`,
      icon: Database,
      accent: 'bg-slate-50 text-slate-700 border-slate-200',
    },
    {
      label: 'অপঠিত যোগাযোগ বার্তা',
      value: `${enToBnDigits(unreadMessages)} টি`,
      sub: `সর্বমোট ${enToBnDigits(contactMessages.length)} টি বার্তা`,
      icon: MessageSquare,
      accent:
        unreadMessages > 0
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-50 text-slate-600 border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                {card.label}
              </span>
              <span
                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.accent}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {card.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{card.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
