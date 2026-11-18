import { bnToEnDigits, enToBnDigits } from './landRecords';

export const SUPER_ADMIN_EMAIL = 'mohammadiaqub@gmail.com';
export const DEFAULT_UNLOCK_DURATION_MINUTES = 10;

export function isSuperAdminEmail(email?: string | null, emailVerified?: boolean): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL && emailVerified !== false;
}

export function canAfford(balance: number, price: number): boolean {
  if (!Number.isFinite(balance) || !Number.isFinite(price)) return false;
  if (price < 0 || balance < 0) return false;
  return balance >= price;
}

export function calculateDebitBalance(balance: number, price: number): number {
  if (!canAfford(balance, price)) {
    throw new Error('অপর্যাপ্ত ব্যালেন্স। দয়া করে প্রথমে ফান্ড যোগ করুন।');
  }
  return Math.round((balance - price) * 100) / 100;
}

export function validateBkashPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const en = bnToEnDigits(phone).replace(/[\s\-()]/g, '');
  const cleaned = en.startsWith('+88') ? en.slice(3) : en.startsWith('88') ? en.slice(2) : en;
  if (!/^01[3-9]\d{8}$/.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'সঠিক ১১ সংখ্যার বাংলাদেশি বিকাশ নম্বর দিন (যেমন: 017XXXXXXXX)।',
    };
  }
  return { valid: true, normalized: cleaned };
}

export function validateTrxId(trxId: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = trxId.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,24}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'সঠিক বিকাশ Transaction ID (TrxID) লিখুন (কমপক্ষে ৬ অক্ষর/সংখ্যা)।',
    };
  }
  return { valid: true, normalized };
}

export function validateDepositAmount(amountInput: string | number): {
  valid: boolean;
  amount: number;
  error?: string;
} {
  const en = typeof amountInput === 'number' ? String(amountInput) : bnToEnDigits(amountInput).trim();
  const parsed = Number(en);
  if (!Number.isFinite(parsed) || parsed < 10 || parsed > 50000) {
    return {
      valid: false,
      amount: 0,
      error: 'জমার পরিমাণ সর্বনিম্ন ৳১০ থেকে সর্বোচ্চ ৳৫০,০০০ এর মধ্যে হতে হবে।',
    };
  }
  return { valid: true, amount: Math.round(parsed * 100) / 100 };
}

export function validateUnlockDuration(durationInput: string | number): {
  valid: boolean;
  minutes: number;
  error?: string;
} {
  const en =
    typeof durationInput === 'number'
      ? String(durationInput)
      : bnToEnDigits(durationInput).trim();
  const parsed = Math.round(Number(en));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
    return {
      valid: false,
      minutes: DEFAULT_UNLOCK_DURATION_MINUTES,
      error: 'আনলক সময়সীমা ১ থেকে ১৪৪০ মিনিটের মধ্যে হতে হবে।',
    };
  }
  return { valid: true, minutes: parsed };
}

function extractCreatedAtMs(createdAt: unknown): number | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
    return createdAt;
  }
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (createdAt as { toMillis: () => number }).toMillis();
  }
  return null;
}

export function getUnlockExpiryMs(
  unlock: { expiresAtMs?: number; durationMinutes?: number; createdAt?: unknown } | undefined,
  fallbackDurationMinutes: number = DEFAULT_UNLOCK_DURATION_MINUTES
): number | null {
  if (!unlock) return null;
  if (typeof unlock.expiresAtMs === 'number' && Number.isFinite(unlock.expiresAtMs)) {
    return unlock.expiresAtMs;
  }
  const createdMs = extractCreatedAtMs(unlock.createdAt);
  if (createdMs !== null) {
    const mins =
      typeof unlock.durationMinutes === 'number' && unlock.durationMinutes >= 1
        ? unlock.durationMinutes
        : fallbackDurationMinutes;
    return createdMs + mins * 60_000;
  }
  return null;
}

export function getRemainingUnlockMs(
  unlock: { expiresAtMs?: number; durationMinutes?: number; createdAt?: unknown } | undefined,
  nowMs: number,
  fallbackDurationMinutes: number = DEFAULT_UNLOCK_DURATION_MINUTES
): number {
  const expiryMs = getUnlockExpiryMs(unlock, fallbackDurationMinutes);
  if (expiryMs === null) return 0;
  return Math.max(0, expiryMs - nowMs);
}

export function isUnlockActive(
  unlock: { expiresAtMs?: number; durationMinutes?: number; createdAt?: unknown } | undefined,
  nowMs: number,
  fallbackDurationMinutes: number = DEFAULT_UNLOCK_DURATION_MINUTES
): boolean {
  return getRemainingUnlockMs(unlock, nowMs, fallbackDurationMinutes) > 0;
}

export function formatCountdownBn(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return enToBnDigits(`${hours}:${pad(mins)}:${pad(secs)}`);
  }
  return enToBnDigits(`${pad(mins)}:${pad(secs)}`);
}

export function shouldDebitOnServiceAccept(order: {
  status: string;
  paymentDeducted?: boolean;
}): boolean {
  return order.status === 'pending' && order.paymentDeducted === false;
}

export function shouldRefundOnServiceCancel(order: {
  status: string;
  paymentDeducted?: boolean;
}): boolean {
  if (order.status !== 'pending' && order.status !== 'accepted') return false;
  return order.paymentDeducted !== false;
}

export interface EffectiveUserRestriction {
  isBlocked: boolean;
  effectiveStatus: 'active' | 'disabled' | 'banned' | 'suspended';
  remainingMs: number;
  reason: string;
}

export function getEffectiveUserRestriction(
  profile:
    | {
        accountStatus?: string;
        banExpiresAtMs?: number | null;
        restrictionReason?: string;
      }
    | null
    | undefined,
  nowMs: number = Date.now()
): EffectiveUserRestriction {
  if (!profile || !profile.accountStatus || profile.accountStatus === 'active') {
    return {
      isBlocked: false,
      effectiveStatus: 'active',
      remainingMs: 0,
      reason: '',
    };
  }

  const reason = (profile.restrictionReason || '').trim();

  if (profile.accountStatus === 'banned') {
    const exp = profile.banExpiresAtMs;
    if (typeof exp === 'number' && Number.isFinite(exp)) {
      const remainingMs = exp - nowMs;
      if (remainingMs <= 0) {
        return {
          isBlocked: false,
          effectiveStatus: 'active',
          remainingMs: 0,
          reason: '',
        };
      }
      return {
        isBlocked: true,
        effectiveStatus: 'banned',
        remainingMs,
        reason,
      };
    }
    return {
      isBlocked: true,
      effectiveStatus: 'banned',
      remainingMs: 0,
      reason,
    };
  }

  if (
    profile.accountStatus === 'disabled' ||
    profile.accountStatus === 'suspended'
  ) {
    return {
      isBlocked: true,
      effectiveStatus: profile.accountStatus,
      remainingMs: 0,
      reason,
    };
  }

  return {
    isBlocked: false,
    effectiveStatus: 'active',
    remainingMs: 0,
    reason: '',
  };
}

export function formatBanRemainingBn(remainingMs: number): string {
  if (remainingMs <= 0) return 'মেয়াদ শেষ';
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) {
    return hours > 0
      ? `${enToBnDigits(days)} দিন ${enToBnDigits(hours)} ঘণ্টা`
      : `${enToBnDigits(days)} দিন`;
  }
  if (hours > 0) {
    return mins > 0
      ? `${enToBnDigits(hours)} ঘণ্টা ${enToBnDigits(mins)} মিনিট`
      : `${enToBnDigits(hours)} ঘণ্টা`;
  }
  return `${enToBnDigits(mins)} মিনিট`;
}
