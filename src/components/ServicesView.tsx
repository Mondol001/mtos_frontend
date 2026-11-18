import { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileSearch,
  Map as MapIcon,
  PauseCircle,
  Send,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AppTab,
  PricingSettings,
  ServiceItem,
  ServiceOrder,
} from '../types';
import { canAfford } from '../utils/billing';
import { enToBnDigits } from '../utils/landRecords';
import { ConfirmDebitModal } from './ConfirmDebitModal';

interface ServicesViewProps {
  services: ServiceItem[];
  serviceOrders: ServiceOrder[];
  pricing: PricingSettings;
  userBalance: number | null;
  isSignedIn: boolean;
  onOrderService: (service: ServiceItem, details: string) => Promise<void>;
  onCancelOrder: (order: ServiceOrder) => Promise<void>;
  onOpenAuth: (reason?: string) => void;
  onGoToAddFund: () => void;
  onNavigateTab: (tab: AppTab) => void;
}

export function ServicesView({
  services,
  serviceOrders,
  pricing,
  userBalance,
  isSignedIn,
  onOrderService,
  onCancelOrder,
  onOpenAuth,
  onGoToAddFund,
  onNavigateTab,
}: ServicesViewProps) {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null
  );
  const [orderDetails, setOrderDetails] = useState('');
  const [pendingOrder, setPendingOrder] = useState<{
    service: ServiceItem;
    details: string;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ServiceOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    showAddFund?: boolean;
  } | null>(null);

  function handleOpenOrder(service: ServiceItem) {
    setFeedback(null);
    if (!service.isActive) {
      setFeedback({
        type: 'error',
        text: `"${service.title}" সেবাটি বর্তমানে অ্যাডমিন কর্তৃক বন্ধ রাখা হয়েছে।`,
      });
      return;
    }
    if (!isSignedIn) {
      onOpenAuth(
        `"${service.title}" সেবার জন্য আবেদন করতে আপনার একাউন্টে লগইন করুন।`
      );
      return;
    }
    const balance = userBalance ?? 0;
    if (!canAfford(balance, service.price)) {
      setFeedback({
        type: 'error',
        text: `এই সেবার জন্য ৳${enToBnDigits(service.price)} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳${enToBnDigits(balance)}।`,
        showAddFund: true,
      });
      return;
    }
    setOrderDetails('');
    setSelectedService(service);
  }

  function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService) return;
    const cleanDetails = orderDetails.trim();
    if (cleanDetails.length < 2) {
      setFeedback({
        type: 'error',
        text: 'সেবার প্রয়োজনীয় তথ্য (দাগ/খতিয়ান/মোবাইল নম্বর) লিখুন।',
      });
      return;
    }

    const balance = userBalance ?? 0;
    if (!canAfford(balance, selectedService.price)) {
      setFeedback({
        type: 'error',
        text: `এই সেবার জন্য ৳${enToBnDigits(selectedService.price)} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳${enToBnDigits(balance)}।`,
        showAddFund: true,
      });
      setSelectedService(null);
      return;
    }

    setFeedback(null);
    setPendingOrder({
      service: selectedService,
      details: cleanDetails,
    });
  }

  async function handleConfirmServiceOrder() {
    const target = pendingOrder;
    if (!target) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onOrderService(target.service, target.details);
      setFeedback({
        type: 'success',
        text: `"${target.service.title}" সেবার আবেদন জমা হয়েছে। এখন কোনো টাকা কাটা হয়নি—অ্যাডমিন কাজটি Accept করলে ৳${enToBnDigits(target.service.price)} কাটা হবে এবং কাজ সম্পন্ন না হলে টাকা রিফান্ড হবে।`,
      });
      setPendingOrder(null);
      setSelectedService(null);
      setOrderDetails('');
    } catch (err) {
      setPendingOrder(null);
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmUserCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setFeedback(null);
    try {
      await onCancelOrder(cancelTarget);
      setFeedback({
        type: 'success',
        text: `"${cancelTarget.serviceTitle}" আবেদনটি বাতিল করা হয়েছে (কোনো টাকা কাটা হয়নি)।`,
      });
      setCancelTarget(null);
    } catch (err) {
      setCancelTarget(null);
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'আবেদন বাতিল করা যায়নি। আবার চেষ্টা করুন।',
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          অনলাইন ভূমি ও ডিজিটাল সেবা সমূহ
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          এখান থেকে Mondol Telecom Online Services-এর সকল চালু সেবার অবস্থা দেখুন
          এবং প্রয়োজনীয় সেবার জন্য সরাসরি আবেদন করুন।
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <p className="text-sm font-medium">{feedback.text}</p>
          {feedback.showAddFund && (
            <button
              type="button"
              onClick={onGoToAddFund}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              ফান্ড যোগ করুন (বিকাশ)
            </button>
          )}
        </div>
      )}

      {/* Core Portal Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  খতিয়ান এবং দাগ অনুসন্ধান
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    pricing.khatianServiceEnabled
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {pricing.khatianServiceEnabled ? 'চালু আছে' : 'বন্ধ আছে'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                চার্জ: ৳{enToBnDigits(pricing.khatianPrice)} · আনলক মেয়াদ:{' '}
                {enToBnDigits(pricing.unlockDurationMinutes)} মিনিট (মেয়াদ শেষে লক)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('search')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
          >
            খুলুন
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  মৌজা ম্যাপ ক্রয় ও ডাউনলোড
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    pricing.mapServiceEnabled
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {pricing.mapServiceEnabled ? 'চালু আছে' : 'বন্ধ আছে'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                মূল্য: ৳{enToBnDigits(pricing.defaultMapPrice)} থেকে শুরু · তাৎক্ষণিক
                ডাউনলোড
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('maps')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
          >
            খুলুন
          </button>
        </div>
      </div>

      {/* Admin-Added Dynamic Services */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          অতিরিক্ত সেবাসমূহ ({enToBnDigits(services.length)} টি)
        </h2>

        {services.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              এখনো কোনো অতিরিক্ত সেবা যুক্ত করা হয়নি
            </p>
            <p className="text-xs text-slate-500">
              সুপার অ্যাডমিন প্যানেল থেকে নতুন সেবা যুক্ত করলে তা এখানে প্রদর্শিত হবে।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <article
                key={service.id}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  service.isActive
                    ? 'border-slate-200'
                    : 'border-slate-200 bg-slate-50/70 opacity-85'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {service.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        service.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {service.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          চালু
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3 h-3" />
                          সাময়িকভাবে বন্ধ
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {service.title}
                  </h3>
                  {service.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                  {service.deliveryInfo && (
                    <p className="text-xs text-emerald-700 font-medium">
                      সময়: {service.deliveryInfo}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      সেবা ফি
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                      ৳{enToBnDigits(service.price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenOrder(service)}
                    disabled={!service.isActive}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {service.isActive ? (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        আবেদন করুন
                      </>
                    ) : (
                      'সেবা বন্ধ আছে'
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* User's Service Orders */}
      {isSignedIn && serviceOrders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">
              আপনার সেবার আবেদনসমূহ ({enToBnDigits(serviceOrders.length)} টি)
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {serviceOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                      className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                    >
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
                      কাজ গৃহীত হয়েছে (৳{enToBnDigits(order.amountPaid)} কাটা হয়েছে)
                    </span>
                  )}
                  {order.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Clock className="w-4 h-4" />
                        {order.paymentDeducted === false
                          ? `অপেক্ষমাণ (Accept হলে ৳${enToBnDigits(order.amountPaid)} কাটবে)`
                          : `অপেক্ষমাণ (৳${enToBnDigits(order.amountPaid)} পরিশোধিত)`}
                      </span>
                      {order.paymentDeducted === false && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          বাতিল করুন
                        </button>
                      )}
                    </div>
                  )}
                  {(order.status === 'cancelled' || order.status === 'rejected') && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                      <XCircle className="w-4 h-4" />
                      {order.adminNote
                        ? 'কাজ বাতিল ও টাকা রিফান্ড / কাটা হয়নি'
                        : 'আবেদন বাতিল করা হয়েছে'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Order Modal */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedService.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  সেবা ফি: ৳{enToBnDigits(selectedService.price)} (অ্যাডমিন কাজটি
                  Accept করলে ব্যালেন্স থেকে কাটা হবে; না করতে পারলে রিফান্ড হবে)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label
                  htmlFor="service-order-details"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  প্রয়োজনীয় তথ্য লিখুন
                </label>
                <textarea
                  id="service-order-details"
                  rows={4}
                  required
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  placeholder={
                    selectedService.inputPlaceholder ||
                    'মৌজার নাম, খতিয়ান নং, দাগ নং ও আপনার মোবাইল নম্বর লিখুন...'
                  }
                  className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting
                    ? 'জমা হচ্ছে...'
                    : `আবেদন জমা দিন (৳${enToBnDigits(selectedService.price)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDebitModal
        isOpen={Boolean(pendingOrder)}
        title="সেবার আবেদনের সম্মতি"
        subtitle="কাজ গৃহীত (Accept) হলে টাকা কাটা হবে"
        itemLabel={pendingOrder ? pendingOrder.service.title : ''}
        amount={pendingOrder?.service.price ?? 0}
        currentBalance={userBalance ?? 0}
        alertMessage={
          pendingOrder
            ? `এখনই টাকা কাটা হবে না। অ্যাডমিন "${pendingOrder.service.title}" কাজটি Accept করলে আপনার একাউন্ট থেকে ৳${enToBnDigits(pendingOrder.service.price)} কাটা হবে। কাজটি সম্পন্ন করা সম্ভব না হলে Cancel করলে সম্পূর্ণ টাকা ফেরত পাবেন।`
            : undefined
        }
        summaryDebitLabel="Accept হলে চার্জ কাটা হবে:"
        summaryRemainingLabel="Accept পরবর্তী সম্ভাব্য ব্যালেন্স:"
        confirmLabel="হ্যাঁ, আবেদন জমা দিন"
        note={
          pendingOrder?.service.deliveryInfo
            ? `সম্ভাব্য সময়: ${pendingOrder.service.deliveryInfo} · Accept হওয়ার আগ পর্যন্ত আপনি আবেদন বাতিল করতে পারবেন।`
            : 'অ্যাডমিন কাজ Accept করার আগ পর্যন্ত আপনি আবেদন বাতিল করতে পারবেন।'
        }
        loading={submitting}
        onConfirm={handleConfirmServiceOrder}
        onCancel={() => setPendingOrder(null)}
      />

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-service-order-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="cancel-service-order-title"
                  className="text-base sm:text-lg font-bold text-slate-900"
                >
                  সেবার আবেদন বাতিল করুন
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {cancelTarget.serviceTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিতভাবে এই আবেদনটি বাতিল করতে চান? এই আবেদনটি এখনো
              Accept না হওয়ায় আপনার একাউন্ট থেকে কোনো টাকা কাটা হয়নি।
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                onClick={handleConfirmUserCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                {cancelling ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
