export type SurveyType = string;

export interface Mouja {
  id: string;
  name: string;
  jlNo: string;
  upazila: string;
  district: string;
  division: string;
  surveyTypes: SurveyType[];
  isBuiltIn?: boolean;
}

export interface KhatianRecord {
  id: string;
  moujaId: string;
  surveyType: SurveyType;
  khatianNo: string;
  owners: string[];
  fatherOrHusband: string;
  dags: string[];
  landAcres: string;
  page?: number;
  isBuiltIn?: boolean;
}

export interface KhatianPreview {
  id: string;
  moujaId: string;
  surveyType: SurveyType;
  khatianNo: string;
  firstOwnerName: string;
  firstDagNo: string;
  extraOwnersCount: number;
  extraDagsCount: number;
  hasFatherInfo: boolean;
  hasLandArea: boolean;
  page?: number;
  matchedDags?: string[];
  isBuiltIn?: boolean;
}

export interface MoujaMapItem {
  id: string;
  moujaId: string;
  moujaName: string;
  jlNo: string;
  surveyType: SurveyType;
  sheetNo: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isBuiltIn?: boolean;
}

export type AccountStatus = 'active' | 'disabled' | 'banned' | 'suspended';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  balance: number;
  accountStatus?: AccountStatus;
  banExpiresAtMs?: number | null;
  restrictionReason?: string;
  restrictedAtMs?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UnlockedKhatian {
  id: string;
  userId: string;
  moujaId: string;
  surveyType: SurveyType;
  khatianNo: string;
  amountPaid: number;
  durationMinutes?: number;
  expiresAtMs?: number;
  createdAt?: unknown;
}

export interface PurchasedMap {
  id: string;
  userId: string;
  mapId: string;
  amountPaid: number;
  createdAt?: unknown;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  bkashNumber: string;
  trxId: string;
  status: PaymentStatus;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type WalletTxType =
  | 'deposit'
  | 'khatian_unlock'
  | 'map_purchase'
  | 'service_debit'
  | 'service_refund';

export type WalletTxDirection = 'credit' | 'debit';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTxType;
  direction: WalletTxDirection;
  amount: number;
  balanceAfter: number;
  title: string;
  referenceId?: string;
  createdAtMs: number;
  createdAt?: unknown;
}

export interface PricingSettings {
  khatianPrice: number;
  defaultMapPrice: number;
  bkashNumber: string;
  bkashAccountType: string;
  unlockDurationMinutes: number;
  khatianServiceEnabled: boolean;
  mapServiceEnabled: boolean;
  updatedAt?: unknown;
}

export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  deliveryInfo: string;
  inputPlaceholder: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ServiceOrderStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  amountPaid: number;
  paymentDeducted?: boolean;
  details: string;
  status: ServiceOrderStatus;
  adminNote: string;
  deliveryUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AppTab =
  | 'search'
  | 'maps'
  | 'services'
  | 'guide'
  | 'contact'
  | 'dashboard'
  | 'admin';

export type NotificationCategory =
  | 'rate_drop'
  | 'rate_increase'
  | 'service_status'
  | 'announcement'
  | 'payment_update'
  | 'order_update'
  | 'account_alert';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  oldPrice?: number;
  newPrice?: number;
  targetTab?: AppTab;
  userId?: string;
  isPersonal?: boolean;
  read?: boolean;
  createdAtMs: number;
  createdAt?: unknown;
}

export interface ContactMessage {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'resolved';
  createdAtMs: number;
  createdAt?: unknown;
}
