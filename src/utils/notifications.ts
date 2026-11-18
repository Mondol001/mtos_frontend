import type {
  AppNotification,
  PricingSettings,
} from '../types';
import { enToBnDigits } from './landRecords';

export type NotificationDraft = Omit<AppNotification, 'id' | 'createdAt'>;

export function buildPricingChangeNotifications(
  prev: PricingSettings,
  next: Omit<PricingSettings, 'updatedAt'>,
  nowMs: number = Date.now()
): NotificationDraft[] {
  const list: NotificationDraft[] = [];

  if (next.khatianPrice !== prev.khatianPrice) {
    const dropped = next.khatianPrice < prev.khatianPrice;
    list.push({
      title: dropped
        ? 'খতিয়ান আনলক ফি কমেছে!'
        : 'খতিয়ান আনলক ফি বেড়েছে',
      message: dropped
        ? `খতিয়ান এবং দাগ অনুসন্ধান আনলক চার্জ ৳${enToBnDigits(prev.khatianPrice)} থেকে কমিয়ে ৳${enToBnDigits(next.khatianPrice)} করা হয়েছে।`
        : `খতিয়ান এবং দাগ অনুসন্ধান আনলক চার্জ ৳${enToBnDigits(prev.khatianPrice)} থেকে বাড়িয়ে ৳${enToBnDigits(next.khatianPrice)} করা হয়েছে।`,
      category: dropped ? 'rate_drop' : 'rate_increase',
      oldPrice: prev.khatianPrice,
      newPrice: next.khatianPrice,
      targetTab: 'search',
      createdAtMs: nowMs,
    });
  }

  if (next.defaultMapPrice !== prev.defaultMapPrice) {
    const dropped = next.defaultMapPrice < prev.defaultMapPrice;
    list.push({
      title: dropped
        ? 'মৌজা ম্যাপ মূল্য কমেছে!'
        : 'মৌজা ম্যাপ মূল্য বেড়েছে',
      message: dropped
        ? `ডিফল্ট মৌজা ম্যাপের মূল্য ৳${enToBnDigits(prev.defaultMapPrice)} থেকে কমিয়ে ৳${enToBnDigits(next.defaultMapPrice)} করা হয়েছে।`
        : `ডিফল্ট মৌজা ম্যাপের মূল্য ৳${enToBnDigits(prev.defaultMapPrice)} থেকে বাড়িয়ে ৳${enToBnDigits(next.defaultMapPrice)} করা হয়েছে।`,
      category: dropped ? 'rate_drop' : 'rate_increase',
      oldPrice: prev.defaultMapPrice,
      newPrice: next.defaultMapPrice,
      targetTab: 'maps',
      createdAtMs: nowMs + 1,
    });
  }

  if (next.unlockDurationMinutes !== prev.unlockDurationMinutes) {
    list.push({
      title: 'খতিয়ান দেখার সময়সীমা পরিবর্তন',
      message: `আনলক করা খতিয়ান দেখার সময়সীমা ${enToBnDigits(prev.unlockDurationMinutes)} মিনিট থেকে পরিবর্তন করে ${enToBnDigits(next.unlockDurationMinutes)} মিনিট করা হয়েছে।`,
      category: 'service_status',
      targetTab: 'search',
      createdAtMs: nowMs + 2,
    });
  }

  if (next.khatianServiceEnabled !== prev.khatianServiceEnabled) {
    list.push({
      title: next.khatianServiceEnabled
        ? 'খতিয়ান আনলক সেবা চালু হয়েছে'
        : 'খতিয়ান আনলক সেবা সাময়িকভাবে বন্ধ',
      message: next.khatianServiceEnabled
        ? 'খতিয়ান এবং দাগ অনুসন্ধান আনলক সেবা পুনরায় চালু করা হয়েছে।'
        : 'অ্যাডমিন কর্তৃক খতিয়ান আনলক সেবা সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      category: 'service_status',
      targetTab: 'search',
      createdAtMs: nowMs + 3,
    });
  }

  if (next.mapServiceEnabled !== prev.mapServiceEnabled) {
    list.push({
      title: next.mapServiceEnabled
        ? 'মৌজা ম্যাপ ক্রয় সেবা চালু হয়েছে'
        : 'মৌজা ম্যাপ ক্রয় সেবা সাময়িকভাবে বন্ধ',
      message: next.mapServiceEnabled
        ? 'মৌজা ম্যাপ ক্রয় ও ডাউনলোড সেবা পুনরায় চালু করা হয়েছে।'
        : 'অ্যাডমিন কর্তৃক মৌজা ম্যাপ ক্রয় সেবা সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      category: 'service_status',
      targetTab: 'maps',
      createdAtMs: nowMs + 4,
    });
  }

  return list;
}

export function buildMapPriceChangeNotification(
  mapTitle: string,
  oldPrice: number,
  newPrice: number,
  nowMs: number = Date.now()
): NotificationDraft | null {
  if (oldPrice === newPrice) return null;
  const dropped = newPrice < oldPrice;
  return {
    title: dropped
      ? `"${mapTitle}" ম্যাপের দাম কমেছে!`
      : `"${mapTitle}" ম্যাপের দাম বেড়েছে`,
    message: dropped
      ? `"${mapTitle}" মৌজা ম্যাপের মূল্য ৳${enToBnDigits(oldPrice)} থেকে কমিয়ে ৳${enToBnDigits(newPrice)} করা হয়েছে।`
      : `"${mapTitle}" মৌজা ম্যাপের মূল্য ৳${enToBnDigits(oldPrice)} থেকে বাড়িয়ে ৳${enToBnDigits(newPrice)} করা হয়েছে।`,
    category: dropped ? 'rate_drop' : 'rate_increase',
    oldPrice,
    newPrice,
    targetTab: 'maps',
    createdAtMs: nowMs,
  };
}

export function buildServicePriceChangeNotification(
  serviceTitle: string,
  oldPrice: number,
  newPrice: number,
  nowMs: number = Date.now()
): NotificationDraft | null {
  if (oldPrice === newPrice) return null;
  const dropped = newPrice < oldPrice;
  return {
    title: dropped
      ? `"${serviceTitle}" সেবার ফি কমেছে!`
      : `"${serviceTitle}" সেবার ফি বেড়েছে`,
    message: dropped
      ? `"${serviceTitle}" সেবার চার্জ ৳${enToBnDigits(oldPrice)} থেকে কমিয়ে ৳${enToBnDigits(newPrice)} করা হয়েছে।`
      : `"${serviceTitle}" সেবার চার্জ ৳${enToBnDigits(oldPrice)} থেকে বাড়িয়ে ৳${enToBnDigits(newPrice)} করা হয়েছে।`,
    category: dropped ? 'rate_drop' : 'rate_increase',
    oldPrice,
    newPrice,
    targetTab: 'services',
    createdAtMs: nowMs,
  };
}

export function buildServiceStatusNotification(
  serviceTitle: string,
  isActive: boolean,
  nowMs: number = Date.now()
): NotificationDraft {
  return {
    title: isActive
      ? `"${serviceTitle}" সেবা চালু হয়েছে`
      : `"${serviceTitle}" সেবা বন্ধ করা হয়েছে`,
    message: isActive
      ? `এখন থেকে "${serviceTitle}" সেবার জন্য আবেদন করতে পারবেন।`
      : `"${serviceTitle}" সেবাটি সাময়িকভাবে বন্ধ রাখা হয়েছে।`,
    category: 'service_status',
    targetTab: 'services',
    createdAtMs: nowMs,
  };
}

export function buildNewServiceNotification(
  serviceTitle: string,
  price: number,
  nowMs: number = Date.now()
): NotificationDraft {
  return {
    title: `নতুন সেবা যুক্ত: ${serviceTitle}`,
    message: `পোর্টালে নতুন "${serviceTitle}" সেবা যুক্ত হয়েছে। ফি: ৳${enToBnDigits(price)}।`,
    category: 'service_status',
    newPrice: price,
    targetTab: 'services',
    createdAtMs: nowMs,
  };
}

export function isNotificationUnread(
  notification: AppNotification,
  readIds: ReadonlySet<string>,
  clearedBeforeMs: number
): boolean {
  if (notification.isPersonal) {
    return !notification.read && !readIds.has(notification.id);
  }
  if (notification.createdAtMs <= clearedBeforeMs) return false;
  return !readIds.has(notification.id);
}

export function countUnreadNotifications(
  notifications: AppNotification[],
  readIds: ReadonlySet<string>,
  clearedBeforeMs: number
): number {
  let count = 0;
  for (const n of notifications) {
    if (isNotificationUnread(n, readIds, clearedBeforeMs)) {
      count++;
    }
  }
  return count;
}

export function buildPersonalPaymentNotification(params: {
  approved: boolean;
  amount: number;
  trxId: string;
  note?: string;
  nowMs?: number;
}): NotificationDraft {
  const { approved, amount, trxId, note, nowMs = Date.now() } = params;
  return {
    title: approved
      ? `বিকাশ ফান্ড অনুমোদিত (+৳${enToBnDigits(amount)})`
      : `বিকাশ পেমেন্ট অনুরোধ বাতিল (TrxID: ${trxId})`,
    message: approved
      ? `TrxID ${trxId} যাচাই সম্পন্ন হয়েছে এবং আপনার ওয়ালেটে ৳${enToBnDigits(amount)} যোগ করা হয়েছে।`
      : `আপনার ৳${enToBnDigits(amount)} (TrxID: ${trxId}) পেমেন্ট অনুরোধ বাতিল করা হয়েছে${note ? `। কারণ: ${note}` : '।'}`,
    category: 'payment_update',
    targetTab: 'dashboard',
    createdAtMs: nowMs,
  };
}

export function buildPersonalServiceOrderNotification(params: {
  serviceTitle: string;
  status: 'accepted' | 'completed' | 'cancelled' | 'rejected';
  amountPaid: number;
  refunded?: boolean;
  note?: string;
  deliveryUrl?: string;
  nowMs?: number;
}): NotificationDraft {
  const {
    serviceTitle,
    status,
    amountPaid,
    refunded,
    note,
    deliveryUrl,
    nowMs = Date.now(),
  } = params;

  if (status === 'accepted') {
    return {
      title: `সেবার কাজ গৃহীত: ${serviceTitle}`,
      message: `অ্যাডমিন "${serviceTitle}" কাজটি গ্রহণ করেছেন এবং আপনার ব্যালেন্স থেকে ৳${enToBnDigits(amountPaid)} কাটা হয়েছে${note ? `। নোট: ${note}` : '।'}`,
      category: 'order_update',
      targetTab: 'services',
      createdAtMs: nowMs,
    };
  }
  if (status === 'completed') {
    return {
      title: `সেবা সম্পন্ন হয়েছে: ${serviceTitle}`,
      message: `আপনার "${serviceTitle}" সেবাটি সম্পন্ন হয়েছে${deliveryUrl ? ' এবং ডেলিভারি ফাইল/লিংক যুক্ত করা হয়েছে' : ''}${note ? `। নোট: ${note}` : '।'}`,
      category: 'order_update',
      targetTab: 'dashboard',
      createdAtMs: nowMs,
    };
  }
  return {
    title: `সেবার আবেদন বাতিল: ${serviceTitle}`,
    message: refunded
      ? `"${serviceTitle}" কাজটি সম্পন্ন করা সম্ভব না হওয়ায় বাতিল করা হয়েছে এবং ৳${enToBnDigits(amountPaid)} আপনার ওয়ালেটে রিফান্ড করা হয়েছে${note ? `। কারণ: ${note}` : '।'}`
      : `"${serviceTitle}" আবেদনটি বাতিল করা হয়েছে (কোনো টাকা কাটা হয়নি)${note ? `। কারণ: ${note}` : '।'}`,
    category: 'order_update',
    targetTab: 'dashboard',
    createdAtMs: nowMs,
  };
}

export function formatRelativeTimeBn(
  createdAtMs: number,
  nowMs: number = Date.now()
): string {
  const diffSec = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));
  if (diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${enToBnDigits(diffMin)} মিনিট আগে`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${enToBnDigits(diffHr)} ঘণ্টা আগে`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${enToBnDigits(diffDay)} দিন আগে`;
  return new Date(createdAtMs).toLocaleDateString('bn-BD');
}
