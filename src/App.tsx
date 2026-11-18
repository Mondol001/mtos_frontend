import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { buildApiUrl } from './config/api';
import {
  BUILTIN_MOUJA_MAPS,
  BUILTIN_MOUJAS,
  DEFAULT_PRICING_SETTINGS,
} from './data/seedCatalog';
import { AlertTriangle, Ban, LogOut, MessageSquare, RefreshCw, ServerOff, X } from 'lucide-react';
import type {
  AccountStatus,
  AppNotification,
  AppTab,
  ContactMessage,
  KhatianPreview,
  KhatianRecord,
  Mouja,
  MoujaMapItem,
  PaymentRequest,
  PricingSettings,
  PurchasedMap,
  ServiceItem,
  ServiceOrder,
  SurveyType,
  UnlockedKhatian,
  UserProfile,
  WalletTransaction,
} from './types';
import {
  calculateDebitBalance,
  canAfford,
  formatBanRemainingBn,
  getEffectiveUserRestriction,
  isSuperAdminEmail,
  shouldDebitOnServiceAccept,
  shouldRefundOnServiceCancel,
} from './utils/billing';
import {
  makeDeterministicKhatianId,
  makeUnlockId,
  normalizeQuery,
} from './utils/landRecords';
import {
  buildMapPriceChangeNotification,
  buildNewServiceNotification,
  buildPersonalPaymentNotification,
  buildPersonalServiceOrderNotification,
  buildPricingChangeNotifications,
  buildServicePriceChangeNotification,
  buildServiceStatusNotification,
  countUnreadNotifications,
  type NotificationDraft,
} from './utils/notifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { KhatianDetailModal } from './components/KhatianDetailModal';
import { KhatianSearchView } from './components/KhatianSearchView';
import { MoujaMapView } from './components/MoujaMapView';
import { ServicesView } from './components/ServicesView';
import { GuideView } from './components/GuideView';
import { ContactView } from './components/ContactView';
import { UserDashboardView } from './components/UserDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { NotificationPanelModal } from './components/NotificationPanelModal';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';

function makeTxId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makePersonalNotifId(): string {
  return `pntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('search');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pricing, setPricing] = useState<PricingSettings>(
    DEFAULT_PRICING_SETTINGS
  );

  // Scoped Search & Catalog state (built-in dataset lives on Node.js backend)
  const [customMoujas, setCustomMoujas] = useState<Mouja[]>([]);
  const [customKhatians, setCustomKhatians] = useState<KhatianRecord[]>([]);
  const [customKhatianCount, setCustomKhatianCount] = useState(0);
  const [builtInRecordCount, setBuiltInRecordCount] = useState(2031);
  const [customMaps, setCustomMaps] = useState<MoujaMapItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const [searchScope, setSearchScope] = useState<{
    moujaId: string;
    surveyType: SurveyType;
    query: string;
    searchField: 'all' | 'dag' | 'khatian' | 'owner';
  }>({
    moujaId: '',
    surveyType: '',
    query: '',
    searchField: 'all',
  });
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({});
  const [serverPreviews, setServerPreviews] = useState<KhatianPreview[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // User ledgers
  const [unlockedMap, setUnlockedMap] = useState<
    Record<string, UnlockedKhatian>
  >({});
  const [purchasedMaps, setPurchasedMaps] = useState<
    Record<string, PurchasedMap>
  >({});
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<
    WalletTransaction[]
  >([]);

  // Admin lists
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  // Notifications state (public broadcasts + personal user alerts)
  const [publicNotifications, setPublicNotifications] = useState<
    AppNotification[]
  >([]);
  const [personalNotifications, setPersonalNotifications] = useState<
    AppNotification[]
  >([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [clearedBeforeMs, setClearedBeforeMs] = useState<number>(0);
  const initialPublicNotifsLoadedRef = useRef(false);
  const initialPersonalNotifsLoadedRef = useRef(false);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  // Server connectivity state
  const [isServerDown, setIsServerDown] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  // Modals & action feedback
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  const [activeDetailRecord, setActiveDetailRecord] =
    useState<KhatianRecord | null>(null);
  const [activeDetailSearchQuery, setActiveDetailSearchQuery] = useState('');
  const [detailError, setDetailError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());

  const isAdmin = useMemo(
    () => isSuperAdminEmail(user?.email, user?.emailVerified),
    [user?.email, user?.emailVerified]
  );

  const usesPasswordProvider = useMemo(
    () =>
      user?.providerData?.some((p) => p.providerId === 'password') ?? false,
    [user?.providerData]
  );

  const getAuthToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const handleScopeChange = useCallback(
    (next: {
      moujaId: string;
      surveyType: SurveyType;
      query: string;
      searchField: 'all' | 'dag' | 'khatian' | 'owner';
    }) => {
      setSearchScope((prev) => {
        if (
          prev.moujaId === next.moujaId &&
          prev.surveyType === next.surveyType &&
          prev.query === next.query &&
          prev.searchField === next.searchField
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (profile?.accountStatus !== 'banned') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [profile?.accountStatus, profile?.banExpiresAtMs]);

  const userRestriction = useMemo(
    () =>
      isAdmin
        ? {
            isBlocked: false,
            effectiveStatus: 'active' as const,
            remainingMs: 0,
            reason: '',
          }
        : getEffectiveUserRestriction(profile, nowMs),
    [isAdmin, profile, nowMs]
  );

  const notifications = useMemo(() => {
    const merged = [...personalNotifications, ...publicNotifications];
    merged.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return merged;
  }, [personalNotifications, publicNotifications]);

  const unreadNotificationCount = useMemo(
    () =>
      countUnreadNotifications(
        notifications,
        readNotificationIds,
        clearedBeforeMs
      ),
    [notifications, readNotificationIds, clearedBeforeMs]
  );

  // Merged catalogs
  const moujas = useMemo(() => {
    const map = new Map<string, Mouja>();
    for (const m of BUILTIN_MOUJAS) map.set(m.id, m);
    for (const m of customMoujas) map.set(m.id, m);
    return Array.from(map.values());
  }, [customMoujas]);

  const allMaps = useMemo(() => {
    const map = new Map<string, MoujaMapItem>();
    for (const m of BUILTIN_MOUJA_MAPS) {
      map.set(m.id, { ...m, price: pricing.defaultMapPrice });
    }
    for (const m of customMaps) {
      map.set(m.id, m);
    }
    return Array.from(map.values());
  }, [customMaps, pricing.defaultMapPrice]);

  // Scoped custom khatian counts per survey within selected mouja
  const customSurveyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rec of customKhatians) {
      counts[rec.surveyType] = (counts[rec.surveyType] || 0) + 1;
    }
    return counts;
  }, [customKhatians]);

  // Fetch built-in server health / record count once and check connectivity
  const checkServerHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(buildApiUrl('/api/health'), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = (await res.json()) as { builtInRecords?: number };
        if (typeof data?.builtInRecords === 'number') {
          setBuiltInRecordCount(data.builtInRecords);
        }
        setIsServerDown(false);
      } else {
        setIsServerDown(true);
      }
    } catch {
      setIsServerDown(true);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    void checkServerHealth();
  }, [checkServerHealth]);

  // Auto-retry polling every 4 seconds when server is down
  useEffect(() => {
    if (!isServerDown) return;
    const timer = setInterval(() => {
      void checkServerHealth();
    }, 4000);
    return () => clearInterval(timer);
  }, [isServerDown, checkServerHealth]);

  // Scoped server survey counts when selected mouja changes
  useEffect(() => {
    const moujaId = searchScope.moujaId;
    if (!moujaId) {
      setServerCounts({});
      return;
    }
    const controller = new AbortController();
    fetch(buildApiUrl(`/api/khatians/counts?moujaId=${encodeURIComponent(moujaId)}`), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { counts: {} }))
      .then((data: { counts?: Record<string, number> }) => {
        setServerCounts(data.counts || {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setServerCounts({});
      });
    return () => controller.abort();
  }, [searchScope.moujaId]);

  // Scoped custom Firestore khatians listener for selected mouja
  useEffect(() => {
    const moujaId = searchScope.moujaId;
    if (!moujaId) {
      setCustomKhatians([]);
      return;
    }
    const qRef = query(
      collection(db, 'khatians'),
      where('moujaId', '==', moujaId)
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setCustomKhatians(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KhatianRecord)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'khatians');
      }
    );
    return () => unsub();
  }, [searchScope.moujaId]);

  // Scoped server preview query when mouja + survey + search changes
  useEffect(() => {
    const { moujaId, surveyType, query: q, searchField } = searchScope;
    if (!moujaId || !surveyType) {
      setServerPreviews([]);
      setLoadingResults(false);
      return;
    }

    const controller = new AbortController();
    setLoadingResults(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        moujaId,
        surveyType,
        query: q,
        searchField,
        limit: '50',
      });
      fetch(buildApiUrl(`/api/khatians/preview?${params.toString()}`), {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data: { items?: KhatianPreview[] }) => {
          if (!controller.signal.aborted) {
            setServerPreviews(data.items || []);
            setLoadingResults(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setServerPreviews([]);
            setLoadingResults(false);
          }
        });
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    searchScope.moujaId,
    searchScope.surveyType,
    searchScope.query,
    searchScope.searchField,
  ]);

  // Auth listener & profile provisioning
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'ব্যবহারকারী',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              balance: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `users/${currentUser.uid}`
          );
        }
      } else {
        setProfile(null);
        setUnlockedMap({});
        setPurchasedMaps({});
        setPaymentRequests([]);
        setServiceOrders([]);
        setWalletTransactions([]);
        setPersonalNotifications([]);
        initialPersonalNotifsLoadedRef.current = false;
        setAllUsers([]);
        setContactMessages([]);
      }
    });
    return () => unsub();
  }, []);

  // Public catalogs & pricing listeners (no upfront full khatians dump!)
  useEffect(() => {
    const unsubPricing = onSnapshot(
      doc(db, 'settings', 'pricing'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PricingSettings>;
          setPricing({
            khatianPrice:
              typeof data.khatianPrice === 'number' ? data.khatianPrice : 10,
            defaultMapPrice:
              typeof data.defaultMapPrice === 'number'
                ? data.defaultMapPrice
                : 300,
            bkashNumber: data.bkashNumber || DEFAULT_PRICING_SETTINGS.bkashNumber,
            bkashAccountType:
              data.bkashAccountType ||
              DEFAULT_PRICING_SETTINGS.bkashAccountType,
            unlockDurationMinutes:
              typeof data.unlockDurationMinutes === 'number' &&
              data.unlockDurationMinutes >= 1
                ? data.unlockDurationMinutes
                : DEFAULT_PRICING_SETTINGS.unlockDurationMinutes,
            khatianServiceEnabled:
              typeof data.khatianServiceEnabled === 'boolean'
                ? data.khatianServiceEnabled
                : true,
            mapServiceEnabled:
              typeof data.mapServiceEnabled === 'boolean'
                ? data.mapServiceEnabled
                : true,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/pricing');
      }
    );

    const unsubMoujas = onSnapshot(
      collection(db, 'moujas'),
      (snap) => {
        setCustomMoujas(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mouja)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'moujas');
      }
    );

    const unsubMaps = onSnapshot(
      collection(db, 'moujaMaps'),
      (snap) => {
        setCustomMaps(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MoujaMapItem)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'moujaMaps');
      }
    );

    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snap) => {
        setServices(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceItem)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'services');
      }
    );

    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAtMs', 'desc'),
      limit(40)
    );

    const unsubNotifications = onSnapshot(
      notificationsQuery,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AppNotification
        );
        setPublicNotifications(list);

        if (!initialPublicNotifsLoadedRef.current) {
          initialPublicNotifsLoadedRef.current = true;
          for (const item of list) {
            seenNotifIdsRef.current.add(item.id);
          }
          return;
        }

        const fresh = list.find(
          (item) =>
            !seenNotifIdsRef.current.has(item.id) &&
            Date.now() - item.createdAtMs < 120_000
        );
        for (const item of list) {
          seenNotifIdsRef.current.add(item.id);
        }
        if (fresh) {
          setLiveToast(fresh);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => {
      unsubPricing();
      unsubMoujas();
      unsubMaps();
      unsubServices();
      unsubNotifications();
    };
  }, []);

  // Load persisted notification read state per user/guest
  useEffect(() => {
    const key = `mtos_notif_read_${user?.uid || 'guest'}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setReadNotificationIds(new Set());
        setClearedBeforeMs(0);
        return;
      }
      const parsed = JSON.parse(raw) as {
        readIds?: string[];
        clearedBeforeMs?: number;
      };
      setReadNotificationIds(new Set(parsed.readIds || []));
      setClearedBeforeMs(
        typeof parsed.clearedBeforeMs === 'number' ? parsed.clearedBeforeMs : 0
      );
    } catch {
      setReadNotificationIds(new Set());
      setClearedBeforeMs(0);
    }
  }, [user?.uid]);

  // Auto-dismiss live toast after 8 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = window.setTimeout(() => setLiveToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [liveToast]);

  function persistNotifState(nextIds: Set<string>, nextClearedMs: number) {
    const key = `mtos_notif_read_${user?.uid || 'guest'}`;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          readIds: Array.from(nextIds).slice(-100),
          clearedBeforeMs: nextClearedMs,
        })
      );
    } catch {
      // Ignore storage failures
    }
  }

  function handleMarkNotificationRead(id: string) {
    const targetPersonal = personalNotifications.find(
      (n) => n.id === id && !n.read
    );
    if (user && targetPersonal) {
      updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
        read: true,
      }).catch(() => {});
    }

    setReadNotificationIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistNotifState(next, clearedBeforeMs);
      return next;
    });
  }

  function handleMarkAllNotificationsRead() {
    if (user) {
      const unreadPersonal = personalNotifications.filter((n) => !n.read);
      if (unreadPersonal.length > 0) {
        const batch = writeBatch(db);
        for (const n of unreadPersonal) {
          batch.update(doc(db, 'users', user.uid, 'notifications', n.id), {
            read: true,
          });
        }
        batch.commit().catch(() => {});
      }
    }

    const latestMs = notifications[0]?.createdAtMs ?? Date.now();
    const nextCleared = Math.max(clearedBeforeMs, latestMs, Date.now());
    const nextIds = new Set(readNotificationIds);
    for (const n of notifications) nextIds.add(n.id);
    setClearedBeforeMs(nextCleared);
    setReadNotificationIds(nextIds);
    persistNotifState(nextIds, nextCleared);
  }

  // Private user listeners (only when authReady && user)
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );

    const unsubUnlocked = onSnapshot(
      collection(db, 'users', user.uid, 'unlockedKhatians'),
      (snap) => {
        const next: Record<string, UnlockedKhatian> = {};
        for (const d of snap.docs) {
          next[d.id] = { id: d.id, ...d.data() } as UnlockedKhatian;
        }
        setUnlockedMap(next);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/unlockedKhatians`
        );
      }
    );

    const unsubPurchased = onSnapshot(
      collection(db, 'users', user.uid, 'purchasedMaps'),
      (snap) => {
        const next: Record<string, PurchasedMap> = {};
        for (const d of snap.docs) {
          next[d.id] = { id: d.id, ...d.data() } as PurchasedMap;
        }
        setPurchasedMaps(next);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/purchasedMaps`
        );
      }
    );

    const unsubWalletTx = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'walletTransactions'),
        orderBy('createdAtMs', 'desc'),
        limit(100)
      ),
      (snap) => {
        setWalletTransactions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WalletTransaction)
        );
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/walletTransactions`
        );
      }
    );

    const unsubPersonalNotifs = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'notifications'),
        orderBy('createdAtMs', 'desc'),
        limit(30)
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AppNotification, 'id'>),
          isPersonal: true,
        }));
        setPersonalNotifications(list);

        if (!initialPersonalNotifsLoadedRef.current) {
          initialPersonalNotifsLoadedRef.current = true;
          for (const item of list) {
            seenNotifIdsRef.current.add(item.id);
          }
          return;
        }

        const fresh = list.find(
          (item) =>
            !seenNotifIdsRef.current.has(item.id) &&
            !item.read &&
            Date.now() - item.createdAtMs < 120_000
        );
        for (const item of list) {
          seenNotifIdsRef.current.add(item.id);
        }
        if (fresh) {
          setLiveToast(fresh);
        }
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user.uid}/notifications`
        );
      }
    );

    const paymentsQuery = isAdmin
      ? query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'paymentRequests'),
          where('userId', '==', user.uid)
        );

    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snap) => {
        setPaymentRequests(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentRequest)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'paymentRequests');
      }
    );

    const serviceOrdersQuery = isAdmin
      ? query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'serviceOrders'),
          where('userId', '==', user.uid)
        );

    const unsubServiceOrders = onSnapshot(
      serviceOrdersQuery,
      (snap) => {
        setServiceOrders(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceOrder)
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'serviceOrders');
      }
    );

    let unsubUsers = () => {};
    let unsubContactMessages = () => {};
    if (isAdmin) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );

      unsubContactMessages = onSnapshot(
        query(
          collection(db, 'contactMessages'),
          orderBy('createdAtMs', 'desc'),
          limit(50)
        ),
        (snap) => {
          setContactMessages(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContactMessage)
          );
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'contactMessages');
        }
      );

      getCountFromServer(collection(db, 'khatians'))
        .then((snap) => setCustomKhatianCount(snap.data().count))
        .catch(() => {});
    }

    return () => {
      unsubProfile();
      unsubUnlocked();
      unsubPurchased();
      unsubWalletTx();
      unsubPersonalNotifs();
      unsubPayments();
      unsubServiceOrders();
      unsubUsers();
      unsubContactMessages();
    };
  }, [authReady, user, isAdmin]);

  async function handleGoogleSignIn() {
    await signInWithPopup(auth, googleProvider);
  }

  async function handleEmailSignIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function handleEmailSignUp(
    name: string,
    email: string,
    password: string
  ) {
    const cleanName = name.trim() || 'ব্যবহারকারী';
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    await updateProfile(cred.user, { displayName: cleanName });
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, {
        displayName: cleanName,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        uid: cred.user.uid,
        displayName: cleanName,
        email: cred.user.email || email.trim(),
        photoURL: cred.user.photoURL || '',
        balance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await sendEmailVerification(cred.user).catch(() => {});
  }

  async function handlePasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async function handleResendVerification() {
    if (!user) return;
    await sendEmailVerification(user);
  }

  async function handleSignOut() {
    await signOut(auth);
    if (activeTab === 'admin') {
      setActiveTab('search');
    }
  }

  function openAuthWithReason(reason?: string) {
    setAuthReason(reason);
    setAuthModalOpen(true);
  }

  async function fetchFullKhatianRecord(
    moujaId: string,
    surveyType: SurveyType,
    khatianNo: string
  ): Promise<KhatianRecord | null> {
    const targetNorm = normalizeQuery(khatianNo);
    const localCustom = customKhatians.find(
      (r) =>
        r.moujaId === moujaId &&
        r.surveyType === surveyType &&
        normalizeQuery(r.khatianNo) === targetNorm
    );
    if (localCustom) return localCustom;

    if (!user) {
      throw new Error('পূর্ণাঙ্গ খতিয়ান দেখতে অনুগ্রহ করে লগইন করুন।');
    }
    const token = await user.getIdToken();
    const res = await fetch(buildApiUrl('/api/khatians/full'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moujaId, surveyType, khatianNo }),
    });

    if (res.ok) {
      const data = (await res.json()) as { record?: KhatianRecord };
      if (data.record) return data.record;
    }

    if (res.status === 404) {
      // Fallback: check Firestore custom khatians outside current search scope (e.g., from Dashboard)
      const qSnap = await getDocs(
        query(
          collection(db, 'khatians'),
          where('moujaId', '==', moujaId),
          where('surveyType', '==', surveyType)
        )
      );
      const foundDoc = qSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as KhatianRecord)
        .find((r) => normalizeQuery(r.khatianNo) === targetNorm);
      if (foundDoc) return foundDoc;
    }

    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errBody.error || 'খতিয়ানের পূর্ণাঙ্গ তথ্য লোড করা যায়নি। পুনরায় চেষ্টা করুন।'
    );
  }

  async function handleUnlockKhatian(target: {
    moujaId: string;
    surveyType: SurveyType;
    khatianNo: string;
  }) {
    if (!user || !profile) return;
    if (userRestriction.isBlocked) {
      throw new Error('আপনার একাউন্ট বর্তমানে সীমাবদ্ধ অবস্থায় রয়েছে।');
    }
    if (!pricing.khatianServiceEnabled) {
      throw new Error('খতিয়ান আনলক সেবা সাময়িকভাবে বন্ধ আছে।');
    }
    const now = Date.now();
    const fee = pricing.khatianPrice;
    const durationMinutes = pricing.unlockDurationMinutes || 10;
    const expiresAtMs = now + durationMinutes * 60_000;
    const nextBalance = calculateDebitBalance(profile.balance, fee);
    const unlockId = makeUnlockId(
      target.moujaId,
      target.surveyType,
      target.khatianNo
    );
    const txId = makeTxId();

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      balance: nextBalance,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', user.uid, 'unlockedKhatians', unlockId), {
      id: unlockId,
      userId: user.uid,
      moujaId: target.moujaId,
      surveyType: target.surveyType,
      khatianNo: target.khatianNo,
      amountPaid: fee,
      durationMinutes,
      expiresAtMs,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', user.uid, 'walletTransactions', txId), {
      id: txId,
      userId: user.uid,
      type: 'khatian_unlock',
      direction: 'debit',
      amount: fee,
      balanceAfter: nextBalance,
      title: `খতিয়ান আনলক: নং ${target.khatianNo} (${target.surveyType})`,
      referenceId: unlockId,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `users/${user.uid}/unlockedKhatians/${unlockId}`
      );
    }
  }

  async function handleViewUnlockedPreview(
    preview: KhatianPreview,
    matchedDagQuery?: string
  ) {
    setDetailError(null);
    try {
      const fullRec = await fetchFullKhatianRecord(
        preview.moujaId,
        preview.surveyType,
        preview.khatianNo
      );
      if (fullRec) {
        setActiveDetailRecord(fullRec);
        setActiveDetailSearchQuery(matchedDagQuery || '');
      }
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : 'খতিয়ান তথ্য লোড করা যায়নি।'
      );
    }
  }

  async function handleViewUnlockedEntry(unlockItem: UnlockedKhatian) {
    setDetailError(null);
    const fullRec = await fetchFullKhatianRecord(
      unlockItem.moujaId,
      unlockItem.surveyType,
      unlockItem.khatianNo
    );
    if (fullRec) {
      setActiveDetailRecord(fullRec);
      setActiveDetailSearchQuery('');
    }
  }

  async function handlePurchaseMap(map: MoujaMapItem) {
    if (!user || !profile) return;
    if (userRestriction.isBlocked) {
      throw new Error('আপনার একাউন্ট বর্তমানে সীমাবদ্ধ অবস্থায় রয়েছে।');
    }
    if (!pricing.mapServiceEnabled) {
      throw new Error('মৌজা ম্যাপ ক্রয় সেবা সাময়িকভাবে বন্ধ আছে।');
    }
    const now = Date.now();
    const nextBalance = calculateDebitBalance(profile.balance, map.price);
    const txId = makeTxId();

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      balance: nextBalance,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', user.uid, 'purchasedMaps', map.id), {
      id: map.id,
      userId: user.uid,
      mapId: map.id,
      amountPaid: map.price,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', user.uid, 'walletTransactions', txId), {
      id: txId,
      userId: user.uid,
      type: 'map_purchase',
      direction: 'debit',
      amount: map.price,
      balanceAfter: nextBalance,
      title: `মৌজা ম্যাপ ক্রয়: ${map.title}`.slice(0, 200),
      referenceId: map.id,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `users/${user.uid}/purchasedMaps/${map.id}`
      );
    }
  }

  async function handleOrderService(service: ServiceItem, details: string) {
    if (!user || !profile) return;
    if (userRestriction.isBlocked) {
      throw new Error('আপনার একাউন্ট বর্তমানে সীমাবদ্ধ অবস্থায় রয়েছে।');
    }
    if (!service.isActive) {
      throw new Error('এই সেবাটি বর্তমানে বন্ধ রাখা হয়েছে।');
    }
    if (!canAfford(profile.balance, service.price)) {
      throw new Error('অপর্যাপ্ত ব্যালেন্স। দয়া করে প্রথমে ফান্ড যোগ করুন।');
    }
    const orderId = `ord-${Date.now()}-${user.uid.slice(0, 6)}`;

    try {
      await setDoc(doc(db, 'serviceOrders', orderId), {
        id: orderId,
        serviceId: service.id,
        serviceTitle: service.title,
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || '',
        amountPaid: service.price,
        paymentDeducted: false,
        details,
        status: 'pending',
        adminNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `serviceOrders/${orderId}`
      );
    }
  }

  async function handleUserCancelServiceOrder(order: ServiceOrder) {
    if (!user || order.userId !== user.uid) return;
    if (userRestriction.isBlocked) {
      throw new Error('আপনার একাউন্ট বর্তমানে সীমাবদ্ধ অবস্থায় রয়েছে।');
    }
    if (order.status !== 'pending' || order.paymentDeducted !== false) {
      throw new Error('এই আবেদনটি এখন আর বাতিল করা সম্ভব নয়।');
    }
    try {
      await updateDoc(doc(db, 'serviceOrders', order.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `serviceOrders/${order.id}`
      );
    }
  }

  async function handleSubmitPayment(payload: {
    amount: number;
    bkashNumber: string;
    trxId: string;
  }) {
    if (!user) return;
    if (userRestriction.isBlocked) {
      throw new Error('আপনার একাউন্ট বর্তমানে সীমাবদ্ধ অবস্থায় রয়েছে।');
    }
    const cleanTrx = payload.trxId.trim().toUpperCase();
    const existingTrxSnap = await getDoc(doc(db, 'usedTrxIds', cleanTrx));
    if (existingTrxSnap.exists()) {
      throw new Error(
        'এই Transaction ID (TrxID) ইতোমধ্যে ব্যবহার করা হয়েছে। সঠিক TrxID দিন।'
      );
    }

    const reqId = `pay-${Date.now()}-${user.uid.slice(0, 6)}`;
    const batch = writeBatch(db);
    batch.set(doc(db, 'paymentRequests', reqId), {
      id: reqId,
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || '',
      amount: payload.amount,
      bkashNumber: payload.bkashNumber,
      trxId: cleanTrx,
      status: 'pending',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'usedTrxIds', cleanTrx), {
      trxId: cleanTrx,
      userId: user.uid,
      paymentRequestId: reqId,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `paymentRequests/${reqId}`
      );
    }
  }

  // Super Admin Actions
  async function handleApprovePayment(req: PaymentRequest) {
    if (!isAdmin) return;
    const now = Date.now();
    const userSnap = await getDoc(doc(db, 'users', req.userId));
    const currentBal = userSnap.exists()
      ? Number(userSnap.data()?.balance ?? 0)
      : 0;
    const nextBalance = Math.round((currentBal + req.amount) * 100) / 100;

    const txId = makeTxId();
    const notifId = makePersonalNotifId();
    const notifDraft = buildPersonalPaymentNotification({
      approved: true,
      amount: req.amount,
      trxId: req.trxId,
      nowMs: now,
    });

    const batch = writeBatch(db);
    batch.update(doc(db, 'paymentRequests', req.id), {
      status: 'approved',
      adminNote: 'যাচাইকৃত ও অনুমোদিত',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', req.userId), {
      balance: increment(req.amount),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', req.userId, 'walletTransactions', txId), {
      id: txId,
      userId: req.userId,
      type: 'deposit',
      direction: 'credit',
      amount: req.amount,
      balanceAfter: nextBalance,
      title: `বিকাশ ফান্ড জমা (TrxID: ${req.trxId})`.slice(0, 200),
      referenceId: req.id,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', req.userId, 'notifications', notifId), {
      id: notifId,
      userId: req.userId,
      title: notifDraft.title.slice(0, 160),
      message: notifDraft.message.slice(0, 1000),
      category: notifDraft.category,
      targetTab: notifDraft.targetTab,
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `paymentRequests/${req.id}`
      );
    }
  }

  async function handleRejectPayment(req: PaymentRequest, note: string) {
    if (!isAdmin) return;
    const now = Date.now();
    const cleanNote = note.trim().slice(0, 500);
    const notifId = makePersonalNotifId();
    const notifDraft = buildPersonalPaymentNotification({
      approved: false,
      amount: req.amount,
      trxId: req.trxId,
      note: cleanNote,
      nowMs: now,
    });

    const batch = writeBatch(db);
    batch.update(doc(db, 'paymentRequests', req.id), {
      status: 'rejected',
      adminNote: cleanNote,
      updatedAt: serverTimestamp(),
    });
    const cleanTrx = req.trxId.trim().toUpperCase();
    if (/^[a-zA-Z0-9_-]{1,128}$/.test(cleanTrx)) {
      batch.delete(doc(db, 'usedTrxIds', cleanTrx));
    }
    batch.set(doc(db, 'users', req.userId, 'notifications', notifId), {
      id: notifId,
      userId: req.userId,
      title: notifDraft.title.slice(0, 160),
      message: notifDraft.message.slice(0, 1000),
      category: notifDraft.category,
      targetTab: notifDraft.targetTab,
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `paymentRequests/${req.id}`
      );
    }
  }

  async function writeNotifications(drafts: NotificationDraft[]) {
    if (!isAdmin || drafts.length === 0) return;
    const batch = writeBatch(db);
    const now = Date.now();
    drafts.forEach((draft, idx) => {
      const id = `ntf-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const payload: Record<string, unknown> = {
        id,
        title: draft.title.slice(0, 160),
        message: draft.message.slice(0, 1000),
        category: draft.category,
        createdAtMs: draft.createdAtMs || now + idx,
        createdAt: serverTimestamp(),
      };
      if (typeof draft.oldPrice === 'number' && draft.oldPrice >= 0) {
        payload.oldPrice = draft.oldPrice;
      }
      if (typeof draft.newPrice === 'number' && draft.newPrice >= 0) {
        payload.newPrice = draft.newPrice;
      }
      if (
        draft.targetTab === 'search' ||
        draft.targetTab === 'maps' ||
        draft.targetTab === 'services' ||
        draft.targetTab === 'dashboard'
      ) {
        payload.targetTab = draft.targetTab;
      }
      batch.set(doc(db, 'notifications', id), payload);
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }

  async function handleSavePricing(next: Omit<PricingSettings, 'updatedAt'>) {
    if (!isAdmin) return;
    const changeDrafts = buildPricingChangeNotifications(pricing, next);
    try {
      await setDoc(doc(db, 'settings', 'pricing'), {
        ...next,
        updatedAt: serverTimestamp(),
      });
      await writeNotifications(changeDrafts);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/pricing');
    }
  }

  async function handleAddMouja(mouja: Omit<Mouja, 'id'>) {
    if (!isAdmin) return;
    const id = makeDeterministicKhatianId(mouja.name, 'M', mouja.jlNo);
    try {
      await setDoc(doc(db, 'moujas', id), {
        id,
        ...mouja,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `moujas/${id}`);
    }
  }

  async function handleAddKhatian(record: Omit<KhatianRecord, 'id'>) {
    if (!isAdmin) return;
    const id = makeDeterministicKhatianId(
      record.moujaId,
      record.surveyType,
      record.khatianNo
    );
    try {
      await setDoc(doc(db, 'khatians', id), {
        id,
        ...record,
        createdAt: serverTimestamp(),
      });
      setCustomKhatianCount((c) => c + 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `khatians/${id}`);
    }
  }

  async function handleBulkAddKhatians(list: Omit<KhatianRecord, 'id'>[]) {
    if (!isAdmin) return;
    const chunkSize = 400;
    for (let i = 0; i < list.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = list.slice(i, i + chunkSize);
      for (const rec of chunk) {
        const id = makeDeterministicKhatianId(
          rec.moujaId,
          rec.surveyType,
          rec.khatianNo
        );
        batch.set(doc(db, 'khatians', id), {
          id,
          ...rec,
          createdAt: serverTimestamp(),
        });
      }
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'khatians');
      }
    }
    getCountFromServer(collection(db, 'khatians'))
      .then((snap) => setCustomKhatianCount(snap.data().count))
      .catch(() => {});
  }

  async function handleSaveMap(mapItem: MoujaMapItem) {
    if (!isAdmin) return;
    const existingMap = allMaps.find((m) => m.id === mapItem.id);
    try {
      await setDoc(doc(db, 'moujaMaps', mapItem.id), {
        ...mapItem,
        createdAt: serverTimestamp(),
      });
      if (existingMap && existingMap.price !== mapItem.price) {
        const draft = buildMapPriceChangeNotification(
          mapItem.title,
          existingMap.price,
          mapItem.price
        );
        if (draft) await writeNotifications([draft]);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `moujaMaps/${mapItem.id}`
      );
    }
  }

  async function handleDeleteMap(mapId: string) {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'moujaMaps', mapId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `moujaMaps/${mapId}`);
    }
  }

  async function handleAddService(
    service: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    if (!isAdmin) return;
    const id = `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'services', id), {
        id,
        ...service,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (service.isActive) {
        await writeNotifications([
          buildNewServiceNotification(service.title, service.price),
        ]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `services/${id}`);
    }
  }

  async function handleToggleService(service: ServiceItem) {
    if (!isAdmin) return;
    const nextActive = !service.isActive;
    try {
      await setDoc(
        doc(db, 'services', service.id),
        {
          id: service.id,
          title: service.title,
          category: service.category,
          description: service.description,
          price: service.price,
          deliveryInfo: service.deliveryInfo,
          inputPlaceholder: service.inputPlaceholder,
          isActive: nextActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await writeNotifications([
        buildServiceStatusNotification(service.title, nextActive),
      ]);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `services/${service.id}`
      );
    }
  }

  async function handleUpdateServicePrice(
    service: ServiceItem,
    nextPrice: number
  ) {
    if (!isAdmin) return;
    try {
      await setDoc(
        doc(db, 'services', service.id),
        {
          id: service.id,
          title: service.title,
          category: service.category,
          description: service.description,
          price: nextPrice,
          deliveryInfo: service.deliveryInfo,
          inputPlaceholder: service.inputPlaceholder,
          isActive: service.isActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const draft = buildServicePriceChangeNotification(
        service.title,
        service.price,
        nextPrice
      );
      if (draft) await writeNotifications([draft]);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `services/${service.id}`
      );
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `services/${serviceId}`
      );
    }
  }

  async function handleSendAnnouncement(
    title: string,
    message: string,
    targetTab?: AppTab
  ) {
    if (!isAdmin) return;
    await writeNotifications([
      {
        title,
        message,
        category: 'announcement',
        targetTab,
        createdAtMs: Date.now(),
      },
    ]);
  }

  async function handleDeleteNotification(id: string) {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  }

  async function handleAcceptServiceOrder(order: ServiceOrder, note: string) {
    if (!isAdmin) return;
    const now = Date.now();
    const cleanNote = note.trim().slice(0, 500);
    const notifId = makePersonalNotifId();
    const notifDraft = buildPersonalServiceOrderNotification({
      serviceTitle: order.serviceTitle,
      status: 'accepted',
      amountPaid: order.amountPaid,
      note: cleanNote,
      nowMs: now,
    });

    if (shouldDebitOnServiceAccept(order)) {
      const userSnap = await getDoc(doc(db, 'users', order.userId));
      const userBal = userSnap.exists()
        ? Number(userSnap.data()?.balance ?? 0)
        : 0;
      if (!canAfford(userBal, order.amountPaid)) {
        throw new Error(
          'ব্যবহারকারীর একাউন্টে পর্যাপ্ত ব্যালেন্স নেই। আগে ফান্ড যোগ করতে বলুন বা আবেদনটি বাতিল করুন।'
        );
      }
      const nextBalance = calculateDebitBalance(userBal, order.amountPaid);
      const txId = makeTxId();

      const batch = writeBatch(db);
      batch.update(doc(db, 'serviceOrders', order.id), {
        status: 'accepted',
        paymentDeducted: true,
        adminNote: cleanNote,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', order.userId), {
        balance: increment(-order.amountPaid),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', order.userId, 'walletTransactions', txId), {
        id: txId,
        userId: order.userId,
        type: 'service_debit',
        direction: 'debit',
        amount: order.amountPaid,
        balanceAfter: nextBalance,
        title: `সেবা ফি: ${order.serviceTitle}`.slice(0, 200),
        referenceId: order.id,
        createdAtMs: now,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', order.userId, 'notifications', notifId), {
        id: notifId,
        userId: order.userId,
        title: notifDraft.title.slice(0, 160),
        message: notifDraft.message.slice(0, 1000),
        category: notifDraft.category,
        targetTab: notifDraft.targetTab,
        read: false,
        createdAtMs: now,
        createdAt: serverTimestamp(),
      });
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `serviceOrders/${order.id}`
        );
      }
      return;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'serviceOrders', order.id), {
      status: 'accepted',
      paymentDeducted: true,
      adminNote: cleanNote,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', order.userId, 'notifications', notifId), {
      id: notifId,
      userId: order.userId,
      title: notifDraft.title.slice(0, 160),
      message: notifDraft.message.slice(0, 1000),
      category: notifDraft.category,
      targetTab: notifDraft.targetTab,
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `serviceOrders/${order.id}`
      );
    }
  }

  async function handleCompleteServiceOrder(
    order: ServiceOrder,
    note: string,
    deliveryUrl?: string
  ) {
    if (!isAdmin) return;
    const now = Date.now();
    const cleanNote = note.trim().slice(0, 500);
    const cleanUrl = (deliveryUrl || '').trim().slice(0, 1024);
    const notifId = makePersonalNotifId();
    const notifDraft = buildPersonalServiceOrderNotification({
      serviceTitle: order.serviceTitle,
      status: 'completed',
      amountPaid: order.amountPaid,
      note: cleanNote,
      deliveryUrl: cleanUrl || undefined,
      nowMs: now,
    });

    const batch = writeBatch(db);
    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      adminNote: cleanNote,
      updatedAt: serverTimestamp(),
    };
    if (cleanUrl) {
      updatePayload.deliveryUrl = cleanUrl;
    }
    batch.update(doc(db, 'serviceOrders', order.id), updatePayload);
    batch.set(doc(db, 'users', order.userId, 'notifications', notifId), {
      id: notifId,
      userId: order.userId,
      title: notifDraft.title.slice(0, 160),
      message: notifDraft.message.slice(0, 1000),
      category: notifDraft.category,
      targetTab: notifDraft.targetTab,
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `serviceOrders/${order.id}`
      );
    }
  }

  async function handleCancelServiceOrder(order: ServiceOrder, note: string) {
    if (!isAdmin) return;
    const now = Date.now();
    const cleanNote = note.trim().slice(0, 500);
    const willRefund = shouldRefundOnServiceCancel(order);
    const notifId = makePersonalNotifId();
    const notifDraft = buildPersonalServiceOrderNotification({
      serviceTitle: order.serviceTitle,
      status: 'cancelled',
      amountPaid: order.amountPaid,
      refunded: willRefund,
      note: cleanNote,
      nowMs: now,
    });

    if (willRefund) {
      const userSnap = await getDoc(doc(db, 'users', order.userId));
      const userBal = userSnap.exists()
        ? Number(userSnap.data()?.balance ?? 0)
        : 0;
      const nextBalance = Math.round((userBal + order.amountPaid) * 100) / 100;
      const txId = makeTxId();

      const batch = writeBatch(db);
      batch.update(doc(db, 'serviceOrders', order.id), {
        status: 'cancelled',
        paymentDeducted: false,
        adminNote: cleanNote,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', order.userId), {
        balance: increment(order.amountPaid),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', order.userId, 'walletTransactions', txId), {
        id: txId,
        userId: order.userId,
        type: 'service_refund',
        direction: 'credit',
        amount: order.amountPaid,
        balanceAfter: nextBalance,
        title: `রিফান্ড: ${order.serviceTitle}`.slice(0, 200),
        referenceId: order.id,
        createdAtMs: now,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', order.userId, 'notifications', notifId), {
        id: notifId,
        userId: order.userId,
        title: notifDraft.title.slice(0, 160),
        message: notifDraft.message.slice(0, 1000),
        category: notifDraft.category,
        targetTab: notifDraft.targetTab,
        read: false,
        createdAtMs: now,
        createdAt: serverTimestamp(),
      });
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `serviceOrders/${order.id}`
        );
      }
      return;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'serviceOrders', order.id), {
      status: 'cancelled',
      adminNote: cleanNote,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', order.userId, 'notifications', notifId), {
      id: notifId,
      userId: order.userId,
      title: notifDraft.title.slice(0, 160),
      message: notifDraft.message.slice(0, 1000),
      category: notifDraft.category,
      targetTab: notifDraft.targetTab,
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `serviceOrders/${order.id}`
      );
    }
  }

  async function handleSendContactMessage(payload: {
    name: string;
    phone: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const docData: Record<string, unknown> = {
      id: msgId,
      name: payload.name.slice(0, 120),
      phone: payload.phone.slice(0, 24),
      email: payload.email.slice(0, 160),
      subject: payload.subject.slice(0, 160),
      message: payload.message.slice(0, 2000),
      status: 'new',
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    };
    if (user) {
      docData.userId = user.uid;
    }
    try {
      await setDoc(doc(db, 'contactMessages', msgId), docData);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `contactMessages/${msgId}`
      );
    }
  }

  async function handleResolveContactMessage(msgId: string) {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'contactMessages', msgId), {
        status: 'resolved',
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `contactMessages/${msgId}`
      );
    }
  }

  async function handleDeleteContactMessage(msgId: string) {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'contactMessages', msgId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `contactMessages/${msgId}`
      );
    }
  }

  async function handleUpdateUserStatus(
    targetUser: UserProfile,
    nextStatus: AccountStatus,
    options?: { banDurationHours?: number; reason?: string }
  ) {
    if (!isAdmin) return;
    if (isSuperAdminEmail(targetUser.email, true)) return;
    const now = Date.now();
    const cleanReason =
      nextStatus === 'active'
        ? ''
        : (options?.reason || '').trim().slice(0, 300);
    const banExpiresAtMs =
      nextStatus === 'banned'
        ? now + Math.max(1, options?.banDurationHours || 24) * 3_600_000
        : null;
    const restrictedAtMs = nextStatus === 'active' ? 0 : now;
    const notifId = makePersonalNotifId();
    const notifTitle =
      nextStatus === 'active'
        ? 'আপনার একাউন্ট পুনরায় সক্রিয় হয়েছে'
        : nextStatus === 'banned'
        ? 'একাউন্ট সাময়িক ব্যান সতর্কতা'
        : nextStatus === 'suspended'
        ? 'একাউন্ট সাসপেন্ড সতর্কতা'
        : 'একাউন্ট ডিজেবল সতর্কতা';
    const notifMsg =
      nextStatus === 'active'
        ? 'অ্যাডমিনিস্ট্রেশন কর্তৃক আপনার একাউন্টের সীমাবদ্ধতা প্রত্যাহার করা হয়েছে।'
        : `আপনার একাউন্টের অবস্থা পরিবর্তন করা হয়েছে${cleanReason ? `। কারণ: ${cleanReason}` : '।'}`;

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUser.uid), {
      accountStatus: nextStatus,
      banExpiresAtMs,
      restrictionReason: cleanReason,
      restrictedAtMs,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', targetUser.uid, 'notifications', notifId), {
      id: notifId,
      userId: targetUser.uid,
      title: notifTitle,
      message: notifMsg.slice(0, 1000),
      category: 'account_alert',
      targetTab: 'dashboard',
      read: false,
      createdAtMs: now,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `users/${targetUser.uid}`
      );
    }
  }

  const activeDetailMouja = useMemo(
    () => moujas.find((m) => m.id === activeDetailRecord?.moujaId),
    [moujas, activeDetailRecord?.moujaId]
  );

  const activeDetailUnlockRecord = useMemo(() => {
    if (!activeDetailRecord) return undefined;
    const unlockId = makeUnlockId(
      activeDetailRecord.moujaId,
      activeDetailRecord.surveyType,
      activeDetailRecord.khatianNo
    );
    return unlockedMap[unlockId];
  }, [activeDetailRecord, unlockedMap]);

  if (isServerDown) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-white font-sans selection:bg-amber-500/30">
        <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-4 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-emerald-900/50">
                M
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">মন্ডল টেলিকম অনলাইন সার্ভিসেস</h1>
                <p className="text-xs text-slate-400">ডিজিটাল ভূমি সেবা পোর্টাল</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              রক্ষণাবেক্ষণ চলছে
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <ServerOff className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                সার্ভার ডাউন বা মেইনটেন্যান্সের কাজ চলছে
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>স্বয়ংক্রিয়ভাবে পুনরায় সংযোগের চেষ্টা করা হচ্ছে...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        profile={profile}
        isAdmin={isAdmin}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setNotificationPanelOpen(true)}
        onOpenAuth={() => openAuthWithReason()}
        onSignOut={handleSignOut}
      />

      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 ${
          activeDetailRecord ? 'no-print' : ''
        }`}
      >
        {detailError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between gap-3">
            <span>{detailError}</span>
            <button
              type="button"
              onClick={() => setDetailError(null)}
              aria-label="বন্ধ করুন"
              className="p-1 rounded-md hover:bg-rose-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {user &&
        userRestriction.isBlocked &&
        ['search', 'maps', 'services', 'dashboard'].includes(activeTab) ? (
          <section className="max-w-xl mx-auto my-8 bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
              <Ban className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900">
                {userRestriction.effectiveStatus === 'banned'
                  ? 'আপনার একাউন্ট সাময়িকভাবে ব্যান করা হয়েছে'
                  : userRestriction.effectiveStatus === 'suspended'
                  ? 'আপনার একাউন্ট সাসপেন্ড করা হয়েছে'
                  : 'আপনার একাউন্ট ডিজেবল করা হয়েছে'}
              </h1>
              {userRestriction.effectiveStatus === 'banned' &&
                userRestriction.remainingMs > 0 && (
                  <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
                    অবশিষ্ট সময়:{' '}
                    {formatBanRemainingBn(userRestriction.remainingMs)}
                  </p>
                )}
              <p className="text-sm text-slate-600 pt-1">
                {userRestriction.reason
                  ? `কারণ: ${userRestriction.reason}`
                  : 'অ্যাডমিনিস্ট্রেশন কর্তৃক আপনার একাউন্টের কার্যক্রম সীমাবদ্ধ করা হয়েছে।'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                যোগাযোগ পাতায় যান
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                লগআউট
              </button>
            </div>
          </section>
        ) : (
          <>
            {activeTab === 'search' && (
              <KhatianSearchView
                moujas={moujas}
                customKhatians={customKhatians}
                serverPreviews={serverPreviews}
                serverCounts={serverCounts}
                customSurveyCounts={customSurveyCounts}
                loadingResults={loadingResults}
                pricing={pricing}
                userBalance={profile?.balance ?? null}
                isSignedIn={Boolean(user)}
                unlockedMap={unlockedMap}
                onScopeChange={handleScopeChange}
                onUnlockKhatian={handleUnlockKhatian}
                onViewUnlocked={handleViewUnlockedPreview}
                onOpenAuth={openAuthWithReason}
                onGoToAddFund={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'maps' && (
              <MoujaMapView
                maps={allMaps}
                purchasedMaps={purchasedMaps}
                userBalance={profile?.balance ?? null}
                isSignedIn={Boolean(user)}
                isAdmin={isAdmin}
                mapServiceEnabled={pricing.mapServiceEnabled}
                getAuthToken={getAuthToken}
                onPurchaseMap={handlePurchaseMap}
                onOpenAuth={openAuthWithReason}
                onGoToAddFund={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'services' && (
              <ServicesView
                services={services}
                serviceOrders={serviceOrders}
                pricing={pricing}
                userBalance={profile?.balance ?? null}
                isSignedIn={Boolean(user)}
                onOrderService={handleOrderService}
                onCancelOrder={handleUserCancelServiceOrder}
                onOpenAuth={openAuthWithReason}
                onGoToAddFund={() => setActiveTab('dashboard')}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'dashboard' && (
              <UserDashboardView
                isSignedIn={Boolean(user)}
                emailVerified={Boolean(user?.emailVerified)}
                usesPasswordProvider={usesPasswordProvider}
                profile={profile}
                pricing={pricing}
                paymentRequests={paymentRequests}
                unlockedList={Object.values(unlockedMap)}
                purchasedMapsList={Object.values(purchasedMaps)}
                serviceOrders={serviceOrders}
                walletTransactions={walletTransactions}
                allMaps={allMaps}
                moujas={moujas}
                notifications={notifications}
                unreadNotificationCount={unreadNotificationCount}
                getAuthToken={getAuthToken}
                onOpenNotifications={() => setNotificationPanelOpen(true)}
                onOpenAuth={openAuthWithReason}
                onResendVerification={handleResendVerification}
                onSubmitPayment={handleSubmitPayment}
                onViewUnlockedEntry={handleViewUnlockedEntry}
                onCancelServiceOrder={handleUserCancelServiceOrder}
              />
            )}
          </>
        )}

        {activeTab === 'guide' && (
          <GuideView pricing={pricing} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'contact' && (
          <ContactView
            pricing={pricing}
            defaultName={profile?.displayName || user?.displayName || ''}
            defaultEmail={profile?.email || user?.email || ''}
            onSendMessage={handleSendContactMessage}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDashboardView
            pricing={pricing}
            paymentRequests={paymentRequests}
            users={allUsers}
            moujas={moujas}
            maps={allMaps}
            services={services}
            serviceOrders={serviceOrders}
            notifications={publicNotifications}
            contactMessages={contactMessages}
            builtInRecordCount={builtInRecordCount}
            customKhatianCount={customKhatianCount}
            onApprovePayment={handleApprovePayment}
            onRejectPayment={handleRejectPayment}
            onSavePricing={handleSavePricing}
            onAddMouja={handleAddMouja}
            onAddKhatian={handleAddKhatian}
            onBulkAddKhatians={handleBulkAddKhatians}
            onSaveMap={handleSaveMap}
            onDeleteMap={handleDeleteMap}
            onAddService={handleAddService}
            onToggleService={handleToggleService}
            onUpdateServicePrice={handleUpdateServicePrice}
            onDeleteService={handleDeleteService}
            onAcceptServiceOrder={handleAcceptServiceOrder}
            onCompleteServiceOrder={handleCompleteServiceOrder}
            onCancelServiceOrder={handleCancelServiceOrder}
            onSendAnnouncement={handleSendAnnouncement}
            onDeleteNotification={handleDeleteNotification}
            onResolveContactMessage={handleResolveContactMessage}
            onDeleteContactMessage={handleDeleteContactMessage}
            onUpdateUserStatus={handleUpdateUserStatus}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            © {new Date().getFullYear()} Mondol Telecom Online Services — খতিয়ান
            এবং দাগ অনুসন্ধান ও মৌজা ম্যাপ পোর্টাল
          </span>
          <span>অফলাইন বিকাশ পেমেন্ট · তাৎক্ষণিক অটো-ডেবিট সার্ভিস</span>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailSignUp={handleEmailSignUp}
        onPasswordReset={handlePasswordReset}
        reasonText={authReason}
      />

      <KhatianDetailModal
        record={activeDetailRecord}
        mouja={activeDetailMouja}
        unlockRecord={activeDetailUnlockRecord}
        unlockDurationMinutes={pricing.unlockDurationMinutes}
        khatianPrice={pricing.khatianPrice}
        userBalance={profile?.balance ?? 0}
        serviceEnabled={pricing.khatianServiceEnabled}
        highlightQuery={activeDetailSearchQuery}
        onReUnlock={handleUnlockKhatian}
        onClose={() => {
          setActiveDetailRecord(null);
          setActiveDetailSearchQuery('');
        }}
      />

      <NotificationPanelModal
        isOpen={notificationPanelOpen}
        notifications={notifications}
        readIds={readNotificationIds}
        clearedBeforeMs={clearedBeforeMs}
        unreadCount={unreadNotificationCount}
        onClose={() => setNotificationPanelOpen(false)}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNavigateTab={setActiveTab}
      />

      <LiveNotificationToast
        notification={liveToast}
        onDismiss={() => setLiveToast(null)}
        onOpenPanel={() => setNotificationPanelOpen(true)}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
