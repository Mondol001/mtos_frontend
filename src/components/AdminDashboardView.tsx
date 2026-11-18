import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import type {
  AccountStatus,
  AppNotification,
  AppTab,
  ContactMessage,
  KhatianRecord,
  Mouja,
  MoujaMapItem,
  PaymentRequest,
  PricingSettings,
  ServiceItem,
  ServiceOrder,
  UserProfile,
} from '../types';
import { validateUnlockDuration } from '../utils/billing';
import { bnToEnDigits, enToBnDigits } from '../utils/landRecords';
import { AdminStatsCards } from './admin/AdminStatsCards';
import { AdminPaymentsTab } from './admin/AdminPaymentsTab';
import { AdminServicesTab } from './admin/AdminServicesTab';
import { AdminMoujasTab } from './admin/AdminMoujasTab';
import { AdminMapsTab } from './admin/AdminMapsTab';
import { AdminMessagesTab, AdminNotificationsTab } from './admin/AdminCommsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';

interface AdminDashboardViewProps {
  pricing: PricingSettings;
  paymentRequests: PaymentRequest[];
  users: UserProfile[];
  moujas: Mouja[];
  maps: MoujaMapItem[];
  services: ServiceItem[];
  serviceOrders: ServiceOrder[];
  notifications: AppNotification[];
  contactMessages: ContactMessage[];
  builtInRecordCount?: number;
  customKhatianCount?: number;
  onApprovePayment: (req: PaymentRequest) => Promise<void>;
  onRejectPayment: (req: PaymentRequest, note: string) => Promise<void>;
  onSavePricing: (next: Omit<PricingSettings, 'updatedAt'>) => Promise<void>;
  onAddMouja: (mouja: Omit<Mouja, 'id'>) => Promise<void>;
  onAddKhatian: (record: Omit<KhatianRecord, 'id'>) => Promise<void>;
  onBulkAddKhatians: (records: Omit<KhatianRecord, 'id'>[]) => Promise<void>;
  onSaveMap: (map: MoujaMapItem) => Promise<void>;
  onDeleteMap: (mapId: string) => Promise<void>;
  onAddService: (
    service: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onToggleService: (service: ServiceItem) => Promise<void>;
  onUpdateServicePrice: (service: ServiceItem, nextPrice: number) => Promise<void>;
  onDeleteService: (serviceId: string) => Promise<void>;
  onAcceptServiceOrder: (order: ServiceOrder, note: string) => Promise<void>;
  onCompleteServiceOrder: (
    order: ServiceOrder,
    note: string,
    deliveryUrl?: string
  ) => Promise<void>;
  onCancelServiceOrder: (order: ServiceOrder, note: string) => Promise<void>;
  onSendAnnouncement: (
    title: string,
    message: string,
    targetTab?: AppTab
  ) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onResolveContactMessage: (msgId: string) => Promise<void>;
  onDeleteContactMessage: (msgId: string) => Promise<void>;
  onUpdateUserStatus: (
    targetUser: UserProfile,
    nextStatus: AccountStatus,
    options?: { banDurationHours?: number; reason?: string }
  ) => Promise<void>;
}

export function AdminDashboardView({
  pricing,
  paymentRequests,
  users,
  moujas,
  maps,
  services,
  serviceOrders,
  notifications,
  contactMessages,
  builtInRecordCount = 2031,
  customKhatianCount = 0,
  onApprovePayment,
  onRejectPayment,
  onSavePricing,
  onAddMouja,
  onAddKhatian,
  onBulkAddKhatians,
  onSaveMap,
  onDeleteMap,
  onAddService,
  onToggleService,
  onUpdateServicePrice,
  onDeleteService,
  onAcceptServiceOrder,
  onCompleteServiceOrder,
  onCancelServiceOrder,
  onSendAnnouncement,
  onDeleteNotification,
  onResolveContactMessage,
  onDeleteContactMessage,
  onUpdateUserStatus,
}: AdminDashboardViewProps) {
  const [adminTab, setAdminTab] = useState<
    | 'payments'
    | 'pricing'
    | 'services'
    | 'moujas'
    | 'maps'
    | 'notifications'
    | 'messages'
    | 'users'
  >('payments');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Pricing & lock duration form
  const [khatianPrice, setKhatianPrice] = useState(String(pricing.khatianPrice));
  const [defaultMapPrice, setDefaultMapPrice] = useState(
    String(pricing.defaultMapPrice)
  );
  const [unlockDurationInput, setUnlockDurationInput] = useState(
    String(pricing.unlockDurationMinutes)
  );
  const [bkashNumber, setBkashNumber] = useState(pricing.bkashNumber);
  const [bkashAccountType, setBkashAccountType] = useState(
    pricing.bkashAccountType
  );

  useEffect(() => {
    setKhatianPrice(String(pricing.khatianPrice));
    setDefaultMapPrice(String(pricing.defaultMapPrice));
    setUnlockDurationInput(String(pricing.unlockDurationMinutes));
    setBkashNumber(pricing.bkashNumber);
    setBkashAccountType(pricing.bkashAccountType);
  }, [
    pricing.khatianPrice,
    pricing.defaultMapPrice,
    pricing.unlockDurationMinutes,
    pricing.bkashNumber,
    pricing.bkashAccountType,
  ]);

  const pendingPayments = paymentRequests.filter((p) => p.status === 'pending');
  const activeServiceOrdersCount = serviceOrders.filter(
    (o) => o.status === 'pending' || o.status === 'accepted'
  ).length;
  const newContactMessagesCount = contactMessages.filter(
    (m) => m.status === 'new'
  ).length;

  async function handlePricingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    const durCheck = validateUnlockDuration(unlockDurationInput);
    if (!durCheck.valid) {
      setStatusMsg(durCheck.error || 'সঠিক মিনিট লিখুন (১–১৪৪০)।');
      return;
    }
    setBusyId('pricing');
    try {
      await onSavePricing({
        khatianPrice: Number(bnToEnDigits(khatianPrice)) || 10,
        defaultMapPrice: Number(bnToEnDigits(defaultMapPrice)) || 300,
        unlockDurationMinutes: durCheck.minutes,
        khatianServiceEnabled: pricing.khatianServiceEnabled,
        mapServiceEnabled: pricing.mapServiceEnabled,
        bkashNumber: bkashNumber.trim(),
        bkashAccountType: bkashAccountType.trim() || 'Personal (Send Money)',
      });
      setStatusMsg('মূল্য, আনলক মেয়াদ ও বিকাশ সেটিংস সফলভাবে আপডেট করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              সুপার অ্যাডমিন কন্ট্রোল প্যানেল
            </h1>
            <p className="text-xs text-slate-500">
              পেমেন্ট অনুমোদন · মূল্য নিয়ন্ত্রণ · মৌজা ও খতিয়ান ব্যবস্থাপনা
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-600 font-medium">
          অপেক্ষমাণ পেমেন্ট:{' '}
          <strong className="text-amber-700 font-mono tabular-nums">
            {enToBnDigits(pendingPayments.length)}
          </strong>{' '}
          টি · মোট ব্যবহারকারী:{' '}
          <strong className="text-slate-900 font-mono tabular-nums">
            {enToBnDigits(users.length)}
          </strong>{' '}
          জন
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <AdminStatsCards
        users={users}
        paymentRequests={paymentRequests}
        serviceOrders={serviceOrders}
        moujas={moujas}
        contactMessages={contactMessages}
        builtInRecordCount={builtInRecordCount}
        customKhatianCount={customKhatianCount}
      />

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
          {statusMsg}
        </div>
      )}

      {/* Admin Sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center gap-4 overflow-x-auto">
          {[
            { id: 'payments', label: `বিকাশ পেমেন্ট (${enToBnDigits(pendingPayments.length)})` },
            { id: 'services', label: `সেবা ও আবেদন (${enToBnDigits(activeServiceOrdersCount)})` },
            { id: 'pricing', label: 'মূল্য ও বিকাশ সেটিংস' },
            { id: 'moujas', label: 'মৌজা ও খতিয়ান যোগ' },
            { id: 'maps', label: 'মৌজা ম্যাপ নিয়ন্ত্রণ' },
            { id: 'notifications', label: `নোটিফিকেশন (${enToBnDigits(notifications.length)})` },
            { id: 'messages', label: `যোগাযোগ বার্তা (${enToBnDigits(newContactMessagesCount)})` },
            { id: 'users', label: `ব্যবহারকারী (${enToBnDigits(users.length)})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAdminTab(tab.id as typeof adminTab)}
              className={`py-3.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                adminTab === tab.id
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {adminTab === 'payments' && (
            <AdminPaymentsTab
              paymentRequests={paymentRequests}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onApprovePayment={onApprovePayment}
              onRejectPayment={onRejectPayment}
            />
          )}

          {adminTab === 'pricing' && (
            <form onSubmit={handlePricingSubmit} className="max-w-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    প্রতি খতিয়ান আনলক মূল্য (৳)
                  </label>
                  <input
                    type="text"
                    value={khatianPrice}
                    onChange={(e) => setKhatianPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    ডিফল্ট মৌজা ম্যাপ মূল্য (৳)
                  </label>
                  <input
                    type="text"
                    value={defaultMapPrice}
                    onChange={(e) => setDefaultMapPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    খতিয়ান আনলক মেয়াদ (মিনিট)
                  </label>
                  <input
                    type="text"
                    value={unlockDurationInput}
                    onChange={(e) => setUnlockDurationInput(e.target.value)}
                    placeholder="10"
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    অফলাইন বিকাশ রিসিভ নম্বর
                  </label>
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    একাউন্টের ধরন
                  </label>
                  <input
                    type="text"
                    value={bkashAccountType}
                    onChange={(e) => setBkashAccountType(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                খতিয়ান ফি, মৌজা ম্যাপ মূল্য বা আনলক মেয়াদ পরিবর্তন করে সংরক্ষণ করলে
                সকল ব্যবহারকারীর কাছে সাথে সাথে <strong>লাইভ নোটিফিকেশন</strong>{' '}
                পৌঁছে যাবে।
              </div>

              <button
                type="submit"
                disabled={busyId === 'pricing'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                সেটিংস সংরক্ষণ করুন
              </button>
            </form>
          )}

          {adminTab === 'services' && (
            <AdminServicesTab
              pricing={pricing}
              services={services}
              serviceOrders={serviceOrders}
              unlockDurationInput={unlockDurationInput}
              setUnlockDurationInput={setUnlockDurationInput}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onSavePricing={onSavePricing}
              onAddService={onAddService}
              onToggleService={onToggleService}
              onUpdateServicePrice={onUpdateServicePrice}
              onDeleteService={onDeleteService}
              onAcceptServiceOrder={onAcceptServiceOrder}
              onCompleteServiceOrder={onCompleteServiceOrder}
              onCancelServiceOrder={onCancelServiceOrder}
            />
          )}

          {adminTab === 'moujas' && (
            <AdminMoujasTab
              moujas={moujas}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onAddMouja={onAddMouja}
              onAddKhatian={onAddKhatian}
              onBulkAddKhatians={onBulkAddKhatians}
            />
          )}

          {adminTab === 'maps' && (
            <AdminMapsTab
              moujas={moujas}
              maps={maps}
              pricing={pricing}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onSaveMap={onSaveMap}
              onDeleteMap={onDeleteMap}
            />
          )}

          {adminTab === 'notifications' && (
            <AdminNotificationsTab
              notifications={notifications}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onSendAnnouncement={onSendAnnouncement}
              onDeleteNotification={onDeleteNotification}
            />
          )}

          {adminTab === 'messages' && (
            <AdminMessagesTab
              contactMessages={contactMessages}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onResolveContactMessage={onResolveContactMessage}
              onDeleteContactMessage={onDeleteContactMessage}
            />
          )}

          {adminTab === 'users' && (
            <AdminUsersTab
              users={users}
              busyId={busyId}
              setBusyId={setBusyId}
              setStatusMsg={setStatusMsg}
              onUpdateUserStatus={onUpdateUserStatus}
            />
          )}
        </div>
      </div>
    </section>
  );
}
