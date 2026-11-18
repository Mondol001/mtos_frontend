import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  Lock,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import type { MoujaMapItem, PurchasedMap } from '../types';
import { enToBnDigits, normalizeQuery } from '../utils/landRecords';
import { canAfford } from '../utils/billing';
import { buildApiUrl } from '../config/api';
import { ConfirmDebitModal } from './ConfirmDebitModal';

interface MoujaMapViewProps {
  maps: MoujaMapItem[];
  purchasedMaps: Record<string, PurchasedMap>;
  userBalance: number | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  mapServiceEnabled: boolean;
  getAuthToken: () => Promise<string | null>;
  onPurchaseMap: (map: MoujaMapItem) => Promise<void>;
  onOpenAuth: (reason?: string) => void;
  onGoToAddFund: () => void;
}

export function MoujaMapView({
  maps,
  purchasedMaps,
  userBalance,
  isSignedIn,
  isAdmin,
  mapServiceEnabled,
  getAuthToken,
  onPurchaseMap,
  onOpenAuth,
  onGoToAddFund,
}: MoujaMapViewProps) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [pendingMap, setPendingMap] = useState<MoujaMapItem | null>(null);
  const [viewerMap, setViewerMap] = useState<MoujaMapItem | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [surveyFilter, setSurveyFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{
    text: string;
    showAddFund?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }
    let active = true;
    void getAuthToken().then((t) => {
      if (active) setAuthToken(t);
    });
    return () => {
      active = false;
    };
  }, [isSignedIn, purchasedMaps, getAuthToken]);

  const surveyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of maps) set.add(m.surveyType);
    return ['ALL', ...Array.from(set)];
  }, [maps]);

  const filteredMaps = useMemo(() => {
    const q = normalizeQuery(searchQuery);
    return maps.filter((m) => {
      if (surveyFilter !== 'ALL' && m.surveyType !== surveyFilter) return false;
      if (!q) return true;
      const hay = normalizeQuery(
        `${m.moujaName} ${m.jlNo} ${m.title} ${m.surveyType} ${m.sheetNo}`
      );
      return hay.includes(q);
    });
  }, [maps, surveyFilter, searchQuery]);

  function resolveImageUrl(map: MoujaMapItem, isPurchased: boolean, download = false) {
    if (map.isBuiltIn) {
      if ((isPurchased || isAdmin) && authToken) {
        return buildApiUrl(`/api/maps/file/${encodeURIComponent(map.id)}?token=${encodeURIComponent(authToken)}${
          download ? '&download=1' : ''
        }`);
      }
      return buildApiUrl(`/api/maps/preview/${encodeURIComponent(map.id)}`);
    }
    return map.imageUrl;
  }

  async function handleBuy(map: MoujaMapItem) {
    setFeedback(null);
    if (purchasedMaps[map.id] || isAdmin) {
      const freshToken = await getAuthToken();
      if (freshToken) setAuthToken(freshToken);
      setViewerMap(map);
      return;
    }
    if (!mapServiceEnabled) {
      setFeedback({
        text: 'মৌজা ম্যাপ ক্রয় সেবা অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      });
      return;
    }
    if (!isSignedIn) {
      onOpenAuth(
        `"${map.title}" ম্যাপটি কিনতে ও ডাউনলোড করতে আপনার একাউন্টে লগইন করুন।`
      );
      return;
    }
    const balance = userBalance ?? 0;
    if (!canAfford(balance, map.price)) {
      setFeedback({
        text: `এই মৌজা ম্যাপটি কিনতে ৳${enToBnDigits(map.price)} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳${enToBnDigits(balance)}।`,
        showAddFund: true,
      });
      return;
    }

    setPendingMap(map);
  }

  async function handleConfirmPurchase() {
    const target = pendingMap;
    if (!target) return;
    setPurchasingId(target.id);
    setFeedback(null);
    try {
      await onPurchaseMap(target);
      const freshToken = await getAuthToken();
      if (freshToken) setAuthToken(freshToken);
      setPendingMap(null);
      setViewerMap(target);
    } catch (err) {
      setPendingMap(null);
      setFeedback({
        text:
          err instanceof Error
            ? err.message
            : 'ম্যাপ ক্রয় সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            মৌজা ম্যাপ সংগ্রহ ও ডাউনলোড
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            মূল্য পরিশোধের সাথে সাথেই আপনার একাউন্ট থেকে টাকা অটো-ডেবিট হয়ে মৌজা ম্যাপ
            আনলক হবে এবং পূর্ণাঙ্গ হাই-রেজোলিউশন ফটো ডাউনলোড করতে পারবেন।
          </p>
        </div>

        {/* Search & Survey Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="মৌজার নাম, জেএল নং বা সিট নং দিয়ে খুঁজুন..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="অনুসন্ধান মুছুন"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {surveyOptions.map((sv) => (
              <button
                key={sv}
                type="button"
                onClick={() => setSurveyFilter(sv)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  surveyFilter === sv
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sv === 'ALL' ? 'সব জরিপ' : sv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!mapServiceEnabled && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900 font-medium">
          মৌজা ম্যাপ ক্রয় সেবা বর্তমানে অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।
          পূর্বে কেনা ম্যাপসমূহ দেখতে ও ডাউনলোড করতে পারবেন।
        </div>
      )}

      {feedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-900 font-medium">{feedback.text}</p>
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

      {filteredMaps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          এই ফিল্টারে কোনো মৌজা ম্যাপ পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMaps.map((map) => {
            const isPurchased = Boolean(purchasedMaps[map.id]) || isAdmin;
            const isBuying = purchasingId === map.id;
            const imgSrc = resolveImageUrl(map, isPurchased, false);
            const downloadHref = resolveImageUrl(map, isPurchased, true);

            return (
              <article
                key={map.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-200">
                  <img
                    src={imgSrc}
                    alt={map.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-all ${
                      isPurchased
                        ? ''
                        : 'select-none pointer-events-none opacity-95'
                    }`}
                  />
                  {!isPurchased && (
                    <div
                      onContextMenu={(e) => e.preventDefault()}
                      className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center p-5 text-center select-none"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/95 text-slate-900 flex items-center justify-center mb-3 shadow-sm">
                        <Lock className="w-5 h-5 text-emerald-700" />
                      </div>
                      <p className="text-white font-bold text-base">
                        মৌজা ম্যাপ লক করা
                      </p>
                      <p className="text-slate-100 text-xs mt-1 max-w-xs">
                        মূল্য ৳{enToBnDigits(map.price)} পরিশোধ করলে সুরক্ষিত আসল
                        ম্যাপ দেখতে ও ডাউনলোড করতে পারবেন
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      মৌজা: {map.moujaName} · জেএল নং {map.jlNo} · {map.surveyType} জরিপ ·{' '}
                      {map.sheetNo}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {map.title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      {map.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-500 block">ম্যাপ মূল্য</span>
                      <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                        ৳{enToBnDigits(map.price)}
                      </span>
                    </div>

                    {isPurchased ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleBuy(map)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          পূর্ণ ম্যাপ দেখুন
                        </button>
                        <a
                          href={downloadHref}
                          download={`${map.id}.jpg`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          ডাউনলোড
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleBuy(map)}
                        disabled={isBuying || !mapServiceEnabled}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <Lock className="w-4 h-4" />
                        {!mapServiceEnabled
                          ? 'সেবা বন্ধ আছে'
                          : isBuying
                            ? 'প্রক্রিয়াধীন...'
                            : `ম্যাপ কিনুন ও দেখুন (৳${enToBnDigits(map.price)})`}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Purchased Full-Resolution Viewer Modal */}
      {viewerMap && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {viewerMap.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveImageUrl(viewerMap, true, true)}
                  download={`${viewerMap.id}.jpg`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  ছবি ডাউনলোড করুন
                </a>
                <button
                  type="button"
                  onClick={() => setViewerMap(null)}
                  aria-label="বন্ধ করুন"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-100 overflow-auto flex-1 flex items-center justify-center">
              <img
                src={resolveImageUrl(viewerMap, true, false)}
                alt={viewerMap.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDebitModal
        isOpen={Boolean(pendingMap)}
        title="মৌজা ম্যাপ ক্রয়ের সম্মতি"
        itemLabel={pendingMap ? pendingMap.title : ''}
        amount={pendingMap?.price ?? 0}
        currentBalance={userBalance ?? 0}
        note="ক্রয়ের পর আজীবন এই মৌজা ম্যাপটি হাই-রেজোলিউশনে দেখতে ও ডাউনলোড করতে পারবেন।"
        loading={Boolean(pendingMap && purchasingId === pendingMap.id)}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setPendingMap(null)}
      />
    </section>
  );
}
