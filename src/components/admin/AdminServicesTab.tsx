import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Power,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { PricingSettings, ServiceItem, ServiceOrder } from '../../types';
import {
  shouldDebitOnServiceAccept,
  shouldRefundOnServiceCancel,
  validateUnlockDuration,
} from '../../utils/billing';
import { bnToEnDigits, enToBnDigits } from '../../utils/landRecords';

interface AdminServicesTabProps {
  pricing: PricingSettings;
  services: ServiceItem[];
  serviceOrders: ServiceOrder[];
  unlockDurationInput: string;
  setUnlockDurationInput: (v: string) => void;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onSavePricing: (next: Omit<PricingSettings, 'updatedAt'>) => Promise<void>;
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
}

export function AdminServicesTab({
  pricing,
  services,
  serviceOrders,
  unlockDurationInput,
  setUnlockDurationInput,
  busyId,
  setBusyId,
  setStatusMsg,
  onSavePricing,
  onAddService,
  onToggleService,
  onUpdateServicePrice,
  onDeleteService,
  onAcceptServiceOrder,
  onCompleteServiceOrder,
  onCancelServiceOrder,
}: AdminServicesTabProps) {
  const [svcTitle, setSvcTitle] = useState('');
  const [svcCategory, setSvcCategory] = useState('ভূমি সেবা');
  const [svcPrice, setSvcPrice] = useState('100');
  const [svcDelivery, setSvcDelivery] = useState('২৪ ঘণ্টার মধ্যে');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcPlaceholder, setSvcPlaceholder] = useState(
    'মৌজা, খতিয়ান নং, দাগ নং ও মোবাইল নম্বর লিখুন'
  );
  const [svcActive, setSvcActive] = useState(true);
  const [svcPriceEdits, setSvcPriceEdits] = useState<Record<string, string>>({});
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
  const [orderDeliveryUrls, setOrderDeliveryUrls] = useState<
    Record<string, string>
  >({});

  async function handleToggleCoreService(field: 'khatian' | 'map') {
    setStatusMsg(null);
    setBusyId(`toggle-${field}`);
    try {
      const nextKhatian =
        field === 'khatian'
          ? !pricing.khatianServiceEnabled
          : pricing.khatianServiceEnabled;
      const nextMap =
        field === 'map' ? !pricing.mapServiceEnabled : pricing.mapServiceEnabled;
      await onSavePricing({
        khatianPrice: pricing.khatianPrice,
        defaultMapPrice: pricing.defaultMapPrice,
        bkashNumber: pricing.bkashNumber,
        bkashAccountType: pricing.bkashAccountType,
        unlockDurationMinutes: pricing.unlockDurationMinutes,
        khatianServiceEnabled: nextKhatian,
        mapServiceEnabled: nextMap,
      });
      setStatusMsg(
        field === 'khatian'
          ? `খতিয়ান আনলক সেবা ${nextKhatian ? 'চালু' : 'বন্ধ'} করা হয়েছে।`
          : `মৌজা ম্যাপ সেবা ${nextMap ? 'চালু' : 'বন্ধ'} করা হয়েছে।`
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickDurationSubmit(e: React.FormEvent) {
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
        khatianPrice: pricing.khatianPrice,
        defaultMapPrice: pricing.defaultMapPrice,
        bkashNumber: pricing.bkashNumber,
        bkashAccountType: pricing.bkashAccountType,
        unlockDurationMinutes: durCheck.minutes,
        khatianServiceEnabled: pricing.khatianServiceEnabled,
        mapServiceEnabled: pricing.mapServiceEnabled,
      });
      setStatusMsg('আনলক সময়সীমা সফলভাবে আপডেট করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  async function handleServiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!svcTitle.trim()) return;
    setStatusMsg(null);
    setBusyId('add-service');
    try {
      await onAddService({
        title: svcTitle.trim(),
        category: svcCategory.trim() || 'ভূমি সেবা',
        description: svcDesc.trim(),
        price: Math.max(0, Number(bnToEnDigits(svcPrice)) || 0),
        deliveryInfo: svcDelivery.trim(),
        inputPlaceholder: svcPlaceholder.trim(),
        isActive: svcActive,
      });
      setSvcTitle('');
      setSvcDesc('');
      setStatusMsg('নতুন সেবা সফলভাবে যোগ করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Core Services ON/OFF & Timer Control */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          মূল সেবা চালু / বন্ধ ও খতিয়ান লক সময়সীমা
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">
                খতিয়ান ও দাগ অনুসন্ধান আনলক
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                অবস্থা:{' '}
                <strong
                  className={
                    pricing.khatianServiceEnabled
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }
                >
                  {pricing.khatianServiceEnabled ? 'চালু আছে' : 'বন্ধ আছে'}
                </strong>
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === 'toggle-khatian'}
              onClick={() => handleToggleCoreService('khatian')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                pricing.khatianServiceEnabled
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {pricing.khatianServiceEnabled ? 'সেবা বন্ধ করুন' : 'সেবা চালু করুন'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">
                মৌজা ম্যাপ ক্রয় ও ডাউনলোড
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                অবস্থা:{' '}
                <strong
                  className={
                    pricing.mapServiceEnabled ? 'text-emerald-700' : 'text-rose-700'
                  }
                >
                  {pricing.mapServiceEnabled ? 'চালু আছে' : 'বন্ধ আছে'}
                </strong>
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === 'toggle-map'}
              onClick={() => handleToggleCoreService('map')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                pricing.mapServiceEnabled
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {pricing.mapServiceEnabled ? 'সেবা বন্ধ করুন' : 'সেবা চালু করুন'}
            </button>
          </div>

          <form
            onSubmit={handleQuickDurationSubmit}
            className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                খতিয়ান পুনরায় লক সময় (মিনিট)
              </label>
              <input
                type="text"
                value={unlockDurationInput}
                onChange={(e) => setUnlockDurationInput(e.target.value)}
                className="mt-2 w-full h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'pricing'}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              সময় সংরক্ষণ করুন
            </button>
          </form>
        </div>
      </div>

      {/* Add New Custom Service */}
      <form
        onSubmit={handleServiceSubmit}
        className="border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h2 className="text-base font-bold text-slate-900">
          নতুন সেবা যোগ করুন (Add New Service)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="সেবার নাম (যেমন: নামজারি আবেদন)"
            value={svcTitle}
            onChange={(e) => setSvcTitle(e.target.value)}
            className="sm:col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="ক্যাটাগরি (যেমন: ভূমি সেবা)"
            value={svcCategory}
            onChange={(e) => setSvcCategory(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="ফি (৳)"
            value={svcPrice}
            onChange={(e) => setSvcPrice(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="ডেলিভারি সময় (যেমন: ২৪ ঘণ্টার মধ্যে)"
            value={svcDelivery}
            onChange={(e) => setSvcDelivery(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="গ্রাহকের কাছ থেকে কী তথ্য লাগবে (নির্দেশনা)"
            value={svcPlaceholder}
            onChange={(e) => setSvcPlaceholder(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <textarea
          rows={2}
          placeholder="সেবার সংক্ষিপ্ত বিবরণ..."
          value={svcDesc}
          onChange={(e) => setSvcDesc(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={svcActive}
              onChange={(e) => setSvcActive(e.target.checked)}
            />
            প্রকাশের সাথে সাথেই সেবাটি চালু রাখুন
          </label>
          <button
            type="submit"
            disabled={busyId === 'add-service'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন সেবা যোগ করুন
          </button>
        </div>
      </form>

      {/* Manage Added Services */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          যোগকৃত সেবাসমূহ ({enToBnDigits(services.length)} টি)
        </h2>
        {services.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            এখনো কোনো অতিরিক্ত সেবা যোগ করা হয়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {svc.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        svc.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {svc.isActive ? 'চালু' : 'বন্ধ'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {svc.category} · ফি: ৳{enToBnDigits(svc.price)}
                    {svc.deliveryInfo ? ` · ${svc.deliveryInfo}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder={String(svc.price)}
                    value={svcPriceEdits[svc.id] ?? ''}
                    onChange={(e) =>
                      setSvcPriceEdits((prev) => ({
                        ...prev,
                        [svc.id]: e.target.value,
                      }))
                    }
                    className="w-20 h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const nextPrice = Number(
                        bnToEnDigits(svcPriceEdits[svc.id] ?? '')
                      );
                      if (!Number.isFinite(nextPrice) || nextPrice < 0) return;
                      setBusyId(`svc-price-${svc.id}`);
                      try {
                        await onUpdateServicePrice(svc, nextPrice);
                        setStatusMsg(
                          `"${svc.title}" এর নতুন ফি সংরক্ষণ হয়েছে।`
                        );
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    ফি সেভ
                  </button>
                  <button
                    type="button"
                    disabled={busyId === `svc-toggle-${svc.id}`}
                    onClick={async () => {
                      setBusyId(`svc-toggle-${svc.id}`);
                      try {
                        await onToggleService(svc);
                        setStatusMsg(
                          `"${svc.title}" সেবা ${!svc.isActive ? 'চালু' : 'বন্ধ'} করা হয়েছে।`
                        );
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      svc.isActive
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {svc.isActive ? 'অফ করুন' : 'চালু করুন'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteService(svc.id)}
                    aria-label="সেবা মুছুন"
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

      {/* User Service Orders Queue */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          সেবার আবেদনসমূহ ({enToBnDigits(serviceOrders.length)} টি)
        </h2>
        {serviceOrders.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            এখনো কোনো সেবার আবেদন জমা হয়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {serviceOrders.map((order) => {
              const needsDebitOnAccept = shouldDebitOnServiceAccept(order);
              const willRefundOnCancel = shouldRefundOnServiceCancel(order);
              const customNote = orderNotes[order.id] ?? '';
              const customDeliveryUrl = orderDeliveryUrls[order.id] ?? '';

              return (
                <div key={order.id} className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                        <span>{order.serviceTitle}</span>
                        <span className="font-mono text-emerald-700">
                          ৳{enToBnDigits(order.amountPaid)}
                        </span>
                        {order.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold">
                            {needsDebitOnAccept
                              ? 'অপেক্ষমাণ (Accept হলে টাকা কাটবে)'
                              : 'অপেক্ষমাণ (টাকা কাটা হয়েছে)'}
                          </span>
                        )}
                        {order.status === 'accepted' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                            গৃহীত · টাকা কাটা হয়েছে
                          </span>
                        )}
                        {order.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-semibold">
                            সম্পন্ন
                          </span>
                        )}
                        {(order.status === 'cancelled' ||
                          order.status === 'rejected') && (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[11px] font-semibold">
                            বাতিল / রিফান্ড
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        আবেদনকারী: {order.userName || order.userEmail} (
                        {order.userEmail})
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 whitespace-pre-line">
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
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          ডেলিভারি লিংক দেখুন
                        </a>
                      )}
                    </div>

                    {(order.status === 'pending' || order.status === 'accepted') && (
                      <div className="flex flex-col sm:items-end gap-2 shrink-0 md:w-80">
                        <input
                          type="text"
                          value={customNote}
                          onChange={(e) =>
                            setOrderNotes((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          placeholder="নোট লিখুন (ঐচ্ছিক, কাজ সম্পন্ন বা বাতিলের কারণ)"
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                        />

                        {order.status === 'accepted' && (
                          <input
                            type="url"
                            value={customDeliveryUrl}
                            onChange={(e) =>
                              setOrderDeliveryUrls((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            placeholder="ডেলিভারি ফাইল / ডাউনলোড লিংক (ঐচ্ছিক URL)"
                            className="w-full h-9 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50/40 text-xs"
                          />
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={async () => {
                                setBusyId(order.id);
                                setStatusMsg(null);
                                try {
                                  await onAcceptServiceOrder(
                                    order,
                                    customNote.trim() ||
                                      'কাজটি গৃহীত হয়েছে এবং সেবা ফি সমন্বয় করা হয়েছে।'
                                  );
                                  setStatusMsg(
                                    needsDebitOnAccept
                                      ? `${order.userEmail} এর আবেদনটি Accept করা হয়েছে এবং ৳${enToBnDigits(order.amountPaid)} কাটা হয়েছে।`
                                      : `${order.userEmail} এর আবেদনটি Accept করা হয়েছে।`
                                  );
                                } catch (err) {
                                  setStatusMsg(
                                    err instanceof Error
                                      ? err.message
                                      : 'আবেদন Accept করা যায়নি।'
                                  );
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {needsDebitOnAccept
                                ? 'Accept ও টাকা কাটুন'
                                : 'কাজ Accept করুন'}
                            </button>
                          )}

                          {order.status === 'accepted' && (
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={async () => {
                                setBusyId(order.id);
                                setStatusMsg(null);
                                try {
                                  await onCompleteServiceOrder(
                                    order,
                                    customNote.trim() ||
                                      'সেবাটি সফলভাবে সম্পন্ন হয়েছে।',
                                    customDeliveryUrl.trim() || undefined
                                  );
                                  setStatusMsg(
                                    'সেবার কাজটি সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে।'
                                  );
                                } catch (err) {
                                  setStatusMsg(
                                    err instanceof Error
                                      ? err.message
                                      : 'আপডেট করা যায়নি।'
                                  );
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              সম্পন্ন করুন
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={async () => {
                              setBusyId(order.id);
                              setStatusMsg(null);
                              try {
                                await onCancelServiceOrder(
                                  order,
                                  customNote.trim() ||
                                    (willRefundOnCancel
                                      ? 'কাজটি সম্পন্ন করা সম্ভব না হওয়ায় বাতিল ও সম্পূর্ণ টাকা রিফান্ড করা হয়েছে।'
                                      : 'আবেদনটি বাতিল করা হয়েছে (কোনো টাকা কাটা হয়নি)।')
                                );
                                setStatusMsg(
                                  willRefundOnCancel
                                    ? `কাজটি ক্যানসেল করে ${order.userEmail} এর ব্যালেন্সে ৳${enToBnDigits(order.amountPaid)} রিফান্ড করা হয়েছে।`
                                    : `${order.userEmail} এর অপেক্ষমাণ আবেদনটি বাতিল করা হয়েছে।`
                                );
                              } catch (err) {
                                setStatusMsg(
                                  err instanceof Error
                                    ? err.message
                                    : 'কাজটি বাতিল করা যায়নি।'
                                );
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-800 text-xs font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {willRefundOnCancel
                              ? 'কাজ ক্যানসেল ও টাকা রিফান্ড'
                              : 'বাতিল করুন'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
