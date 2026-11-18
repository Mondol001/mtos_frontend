import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import type {
  KhatianPreview,
  KhatianRecord,
  Mouja,
  PricingSettings,
  SurveyType,
  UnlockedKhatian,
} from '../types';
import {
  filterMoujasByLocation,
  getDistrictOptions,
  getDivisionOptions,
  getUpazilaOptions,
} from '../data/bdGeo';
import {
  enToBnDigits,
  findMatchedDagsInRecord,
  getPreviewRecord,
  isDagExactMatch,
  makeUnlockId,
  normalizeQuery,
  searchKhatianRecords,
} from '../utils/landRecords';
import {
  canAfford,
  formatCountdownBn,
  getRemainingUnlockMs,
  isUnlockActive,
} from '../utils/billing';
import { ConfirmDebitModal } from './ConfirmDebitModal';

interface KhatianSearchViewProps {
  moujas: Mouja[];
  customKhatians: KhatianRecord[];
  serverPreviews: KhatianPreview[];
  serverCounts: Record<string, number>;
  customSurveyCounts: Record<string, number>;
  loadingResults: boolean;
  pricing: PricingSettings;
  userBalance: number | null;
  isSignedIn: boolean;
  unlockedMap: Record<string, UnlockedKhatian>;
  onScopeChange: (params: {
    moujaId: string;
    surveyType: SurveyType;
    query: string;
    searchField: 'all' | 'dag' | 'khatian' | 'owner';
  }) => void;
  onUnlockKhatian: (preview: KhatianPreview) => Promise<void>;
  onViewUnlocked: (preview: KhatianPreview, matchedDagQuery?: string) => void;
  onOpenAuth: (reason?: string) => void;
  onGoToAddFund: () => void;
}

const KNOWN_SURVEY_LABELS: Record<string, string> = {
  CS: 'সিএস (CS)',
  SA: 'এসএ (SA)',
  RS: 'আরএস (RS)',
  BS: 'বিএস (BS)',
  BRS: 'বিআরএস (BRS)',
};

function formatSurveyLabel(survey: string): string {
  return KNOWN_SURVEY_LABELS[survey.toUpperCase()] || survey;
}

export function KhatianSearchView({
  moujas,
  customKhatians,
  serverPreviews,
  serverCounts,
  customSurveyCounts,
  loadingResults,
  pricing,
  userBalance,
  isSignedIn,
  unlockedMap,
  onScopeChange,
  onUnlockKhatian,
  onViewUnlocked,
  onOpenAuth,
  onGoToAddFund,
}: KhatianSearchViewProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');
  const [moujaFilterQuery, setMoujaFilterQuery] = useState<string>('');
  const [selectedMoujaId, setSelectedMoujaId] = useState<string>('');
  const [surveyType, setSurveyType] = useState<SurveyType>('');
  const [searchField, setSearchField] = useState<
    'all' | 'dag' | 'khatian' | 'owner'
  >('all');
  const [query, setQuery] = useState('');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [pendingUnlockPreview, setPendingUnlockPreview] =
    useState<KhatianPreview | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'info';
    text: string;
    showAddFund?: boolean;
  } | null>(null);

  useEffect(() => {
    if (Object.keys(unlockedMap).length === 0) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [unlockedMap]);

  const divisionOptions = useMemo(() => getDivisionOptions(moujas), [moujas]);

  const districtOptions = useMemo(
    () =>
      selectedDivision ? getDistrictOptions(selectedDivision, moujas) : [],
    [selectedDivision, moujas]
  );

  const upazilaOptions = useMemo(
    () =>
      selectedDivision && selectedDistrict
        ? getUpazilaOptions(selectedDivision, selectedDistrict, moujas)
        : [],
    [selectedDivision, selectedDistrict, moujas]
  );

  const filteredMoujas = useMemo(() => {
    if (!selectedUpazila && !moujaFilterQuery.trim()) return [];
    return filterMoujasByLocation(
      moujas,
      selectedDivision,
      selectedDistrict,
      selectedUpazila,
      moujaFilterQuery
    );
  }, [
    moujas,
    selectedDivision,
    selectedDistrict,
    selectedUpazila,
    moujaFilterQuery,
  ]);

  const selectedMouja = useMemo(() => {
    if (!selectedMoujaId || filteredMoujas.length === 0) return undefined;
    return filteredMoujas.find((m) => m.id === selectedMoujaId);
  }, [filteredMoujas, selectedMoujaId]);

  useEffect(() => {
    onScopeChange({
      moujaId: selectedMouja?.id || '',
      surveyType,
      query,
      searchField,
    });
  }, [selectedMouja?.id, surveyType, query, searchField, onScopeChange]);

  function handleDivisionChange(nextDiv: string) {
    setSelectedDivision(nextDiv);
    setSelectedDistrict('');
    setSelectedUpazila('');
    setMoujaFilterQuery('');
    setSelectedMoujaId('');
    setSurveyType('');
    setQuery('');
  }

  function handleDistrictChange(nextDist: string) {
    setSelectedDistrict(nextDist);
    setSelectedUpazila('');
    setMoujaFilterQuery('');
    setSelectedMoujaId('');
    setSurveyType('');
    setQuery('');
  }

  function handleUpazilaChange(nextUp: string) {
    setSelectedUpazila(nextUp);
    setMoujaFilterQuery('');
    setSelectedMoujaId('');
    setSurveyType('');
    setQuery('');
  }

  function handleMoujaChange(nextMoujaId: string) {
    setSelectedMoujaId(nextMoujaId);
    setSurveyType('');
    setQuery('');
  }

  function handleClearSelections() {
    setSelectedDivision('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setMoujaFilterQuery('');
    setSelectedMoujaId('');
    setSurveyType('');
    setSearchField('all');
    setQuery('');
    setFeedback(null);
  }

  const moujaCounts = useMemo(() => {
    const counts: Record<string, number> = { ...serverCounts };
    for (const [k, v] of Object.entries(customSurveyCounts)) {
      counts[k] = (counts[k] || 0) + v;
    }
    return counts;
  }, [serverCounts, customSurveyCounts]);

  const availableSurveys = useMemo<SurveyType[]>(() => {
    if (!selectedMouja) return [];
    const set = new Set<SurveyType>(selectedMouja.surveyTypes || ['CS', 'SA']);
    for (const key of Object.keys(moujaCounts)) {
      if (moujaCounts[key] > 0) set.add(key);
    }
    return Array.from(set);
  }, [selectedMouja, moujaCounts]);

  const isSelectionComplete = Boolean(selectedMouja && surveyType);

  const results = useMemo<KhatianPreview[]>(() => {
    if (!selectedMouja || !surveyType) return [];
    const customMatched = searchKhatianRecords(customKhatians, {
      moujaId: selectedMouja.id,
      surveyType,
      query,
      searchField,
      limit: 50,
    }).map((rec) =>
      getPreviewRecord(rec, findMatchedDagsInRecord(rec.dags, query, searchField))
    );

    const seenKeys = new Set<string>();
    const combined: KhatianPreview[] = [];
    for (const item of [...customMatched, ...serverPreviews]) {
      const k = `${item.moujaId}__${item.surveyType}__${normalizeQuery(item.khatianNo)}`;
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      combined.push(item);
      if (combined.length >= 50) break;
    }
    return combined;
  }, [selectedMouja, surveyType, customKhatians, serverPreviews, query, searchField]);

  const activeDagQuery =
    searchField === 'khatian' || searchField === 'owner' ? '' : query.trim();

  async function handleUnlockClick(preview: KhatianPreview) {
    setFeedback(null);
    const unlockKey = makeUnlockId(
      preview.moujaId,
      preview.surveyType,
      preview.khatianNo
    );
    if (
      isUnlockActive(
        unlockedMap[unlockKey],
        Date.now(),
        pricing.unlockDurationMinutes
      )
    ) {
      onViewUnlocked(preview, activeDagQuery);
      return;
    }

    if (!pricing.khatianServiceEnabled) {
      setFeedback({
        type: 'error',
        text: 'খতিয়ান আনলক সেবা অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।',
      });
      return;
    }

    if (!isSignedIn) {
      onOpenAuth(
        `খতিয়ান নং ${preview.khatianNo} এর পুরো তথ্য আনলক করতে আপনার একাউন্টে লগইন করুন।`
      );
      return;
    }

    const balance = userBalance ?? 0;
    if (!canAfford(balance, pricing.khatianPrice)) {
      setFeedback({
        type: 'error',
        text: `এই খতিয়ানটি আনলক করতে ৳${enToBnDigits(pricing.khatianPrice)} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳${enToBnDigits(balance)}।`,
        showAddFund: true,
      });
      return;
    }

    setPendingUnlockPreview(preview);
  }

  async function handleConfirmUnlock() {
    const target = pendingUnlockPreview;
    if (!target) return;
    setUnlockingId(target.id);
    setFeedback(null);
    try {
      await onUnlockKhatian(target);
      setPendingUnlockPreview(null);
      onViewUnlocked(target, activeDagQuery);
    } catch (err) {
      setPendingUnlockPreview(null);
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'তথ্য আনলক করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
    } finally {
      setUnlockingId(null);
    }
  }

  return (
    <section className="space-y-6">
      {/* 5-Step Location + Survey Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              খতিয়ান এবং দাগ অনুসন্ধান
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              বিভাগ, জেলা, উপজেলা, মৌজা/জেএল নং ও জরিপের ধরন নির্বাচন করে সহজেই খতিয়ান খুঁজুন।
              পুরো তথ্য আনলক চার্জ{' '}
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                ৳{enToBnDigits(pricing.khatianPrice)}
              </span>{' '}
              · আনলকের পর{' '}
              <span className="font-semibold text-amber-800">
                {enToBnDigits(pricing.unlockDurationMinutes)} মিনিট
              </span>{' '}
              পর্যন্ত দেখা যাবে (মেয়াদ শেষে পুনরায় লক হবে)।
            </p>
          </div>
          {(selectedDivision || moujaFilterQuery || query) && (
            <button
              type="button"
              onClick={handleClearSelections}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 self-start lg:self-center cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              সব নির্বাচন মুছুন
            </button>
          )}
        </div>

        {/* 5-Step Geographic Cascade Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1: Division */}
          <div>
            <label
              htmlFor="division-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              ১. বিভাগ
            </label>
            <select
              id="division-select"
              value={selectedDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              <option value="">-- বিভাগ নির্বাচন করুন --</option>
              {divisionOptions.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                  {d.moujaCount > 0 ? ` (${enToBnDigits(d.moujaCount)} মৌজা)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: District */}
          <div>
            <label
              htmlFor="district-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              ২. জেলা
            </label>
            <select
              id="district-select"
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedDivision}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              <option value="">
                {selectedDivision ? '-- জেলা নির্বাচন করুন --' : '-- আগে বিভাগ দিন --'}
              </option>
              {districtOptions.map((dt) => (
                <option key={dt.name} value={dt.name}>
                  {dt.name}
                  {dt.moujaCount > 0 ? ` (${enToBnDigits(dt.moujaCount)} মৌজা)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Upazila */}
          <div>
            <label
              htmlFor="upazila-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              ৩. উপজেলা / সার্কেল
            </label>
            <select
              id="upazila-select"
              value={selectedUpazila}
              onChange={(e) => handleUpazilaChange(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              <option value="">
                {selectedDistrict ? '-- উপজেলা নির্বাচন করুন --' : '-- আগে জেলা দিন --'}
              </option>
              {upazilaOptions.map((up) => (
                <option key={up.name} value={up.name}>
                  {up.name}
                  {up.moujaCount > 0 ? ` (${enToBnDigits(up.moujaCount)} মৌজা)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Mouja / JL No */}
          <div>
            <label
              htmlFor="mouja-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              ৪. মৌজা ও জেএল নং
            </label>
            <select
              id="mouja-select"
              value={selectedMouja?.id || ''}
              onChange={(e) => handleMoujaChange(e.target.value)}
              disabled={(!selectedUpazila && !moujaFilterQuery.trim()) || filteredMoujas.length === 0}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              {!selectedUpazila && !moujaFilterQuery.trim() ? (
                <option value="">-- আগে উপজেলা দিন --</option>
              ) : filteredMoujas.length === 0 ? (
                <option value="">কোনো মৌজা যুক্ত হয়নি</option>
              ) : (
                <>
                  <option value="">-- মৌজা নির্বাচন করুন --</option>
                  {filteredMoujas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (জেএল: {m.jlNo})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Step 5: Survey Type */}
          <div>
            <label
              htmlFor="survey-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              ৫. জরিপের ধরন
            </label>
            <select
              id="survey-select"
              value={surveyType}
              onChange={(e) => setSurveyType(e.target.value as SurveyType)}
              disabled={!selectedMouja}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              <option value="">
                {selectedMouja ? '-- জরিপ নির্বাচন করুন --' : '-- আগে মৌজা দিন --'}
              </option>
              {availableSurveys.map((st) => (
                <option key={st} value={st}>
                  {formatSurveyLabel(st)} ({enToBnDigits(moujaCounts[st] || 0)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selection Breadcrumb + Quick Survey Switch + Search Input */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              {selectedDivision || selectedMouja ? (
                <>
                  <span className="font-medium text-slate-800">
                    {selectedDivision || selectedMouja?.division}
                  </span>
                  {(selectedDistrict || selectedMouja?.district) && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {selectedDistrict || selectedMouja?.district}
                      </span>
                    </>
                  )}
                  {(selectedUpazila || selectedMouja?.upazila) && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {selectedUpazila || selectedMouja?.upazila}
                      </span>
                    </>
                  )}
                  {selectedMouja && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-emerald-800">
                        {selectedMouja.name} (জেএল নং {selectedMouja.jlNo})
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span>প্রয়োজনীয় বিভাগ, জেলা, উপজেলা, মৌজা ও জরিপের ধরন নির্বাচন করুন</span>
              )}
            </div>

            {selectedMouja && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {availableSurveys.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSurveyType(st)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      surveyType === st
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {formatSurveyLabel(st)} ({enToBnDigits(moujaCounts[st] || 0)})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label
                htmlFor="mouja-jl-filter"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                মৌজা / জেএল নং ফিল্টার (ঐচ্ছিক)
              </label>
              <input
                id="mouja-jl-filter"
                type="text"
                value={moujaFilterQuery}
                onChange={(e) => {
                  setMoujaFilterQuery(e.target.value);
                  setSelectedMoujaId('');
                  setSurveyType('');
                }}
                placeholder="মৌজার নাম বা জেএল নং (যেমন: ৭৪)..."
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="search-field-select"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                কোন তথ্যে খুঁজবেন
              </label>
              <select
                id="search-field-select"
                value={searchField}
                disabled={!isSelectionComplete}
                onChange={(e) =>
                  setSearchField(
                    e.target.value as 'all' | 'dag' | 'khatian' | 'owner'
                  )
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 focus:outline-none focus:border-emerald-700"
              >
                <option value="all">সব তথ্য (খতিয়ান, দাগ ও নাম)</option>
                <option value="khatian">খতিয়ান নং</option>
                <option value="dag">দাগ নং</option>
                <option value="owner">মালিকের নাম</option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label
                htmlFor="khatian-search-input"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                খতিয়ান নং, দাগ নং বা মালিকের নাম লিখুন
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="khatian-search-input"
                  type="text"
                  value={query}
                  disabled={!isSelectionComplete}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isSelectionComplete
                      ? 'যেমন: ২৫১৪ বা 2514, খতিয়ান ১, অথবা মালিকের নাম...'
                      : 'আগে বিভাগ, জেলা, উপজেলা, মৌজা ও জরিপ নির্বাচন করুন...'
                  }
                  className="w-full h-11 pl-10 pr-9 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="অনুসন্ধান মুছুন"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!pricing.khatianServiceEnabled && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900 font-medium">
          খতিয়ান এবং দাগ আনলক সেবা বর্তমানে অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা
          হয়েছে। ফ্রি প্রিভিউ দেখা যাবে, তবে নতুন আনলক সাময়িকভাবে স্থগিত রয়েছে।
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

      {/* Results Header (only visible after mouja & survey are selected) */}
      {isSelectionComplete && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="inline-flex items-center gap-2">
            প্রদর্শিত ফলাফল:{' '}
            <strong className="text-slate-900 font-mono tabular-nums">
              {enToBnDigits(results.length)}
            </strong>{' '}
            টি ({surveyType} জরিপ{query ? ` · "${query}"` : ''})
            {loadingResults && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            )}
          </span>
          <span>বাংলা ও ইংরেজি উভয় সংখ্যা সমর্থিত</span>
        </div>
      )}

      {/* Results Table / Selection Guidance / Empty State */}
      {(selectedUpazila || moujaFilterQuery.trim()) && filteredMoujas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">
            {selectedUpazila
              ? `${selectedUpazila}, ${selectedDistrict} উপজেলায় এখনো কোনো মৌজা যুক্ত করা হয়নি`
              : `"${moujaFilterQuery}" নামে কোনো মৌজা পাওয়া যায়নি`}
          </p>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            অন্য উপজেলা বা মৌজা নির্বাচন করে চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={handleClearSelections}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : !isSelectionComplete ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center space-y-2.5">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-base font-semibold text-slate-900">
            খতিয়ান ও দাগ খুঁজতে উপরের ধাপগুলো নির্বাচন করুন
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            বিভাগ, জেলা, উপজেলা, মৌজা এবং জরিপের ধরন নির্বাচন করার পর আপনার কাঙ্ক্ষিত
            খতিয়ান নং, দাগ নং অথবা মালিকের নাম লিখে অনুসন্ধান করুন।
          </p>
        </div>
      ) : loadingResults && results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm text-slate-600">তথ্য লোড হচ্ছে...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            কোনো খতিয়ান বা দাগ খুঁজে পাওয়া যায়নি
          </p>
          <p className="text-sm text-slate-500 mt-1">
            দয়া করে সঠিক দাগ নং, খতিয়ান নং অথবা মালিকের নাম দিয়ে পুনরায় অনুসন্ধান করুন।
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <div className="col-span-2">খতিয়ান নং</div>
            <div className="col-span-3">প্রথম মালিকের নাম (ফ্রি প্রিভিউ)</div>
            <div className="col-span-2">প্রথম দাগ নং</div>
            <div className="col-span-3">লককৃত তথ্য</div>
            <div className="col-span-2 text-right">অ্যাকশন</div>
          </div>

          <div className="divide-y divide-slate-200">
            {results.map((preview) => {
              const unlockKey = makeUnlockId(
                preview.moujaId,
                preview.surveyType,
                preview.khatianNo
              );
              const unlockEntry = unlockedMap[unlockKey];
              const remainingMs = getRemainingUnlockMs(
                unlockEntry,
                nowMs,
                pricing.unlockDurationMinutes
              );
              const isUnlocked = remainingMs > 0;
              const countdownText = formatCountdownBn(remainingMs);
              const isLoading = unlockingId === preview.id;
              const matchedDags = preview.matchedDags || [];
              const firstDagMatches =
                activeDagQuery.length > 0 &&
                (matchedDags.includes(preview.firstDagNo) ||
                  isDagExactMatch(preview.firstDagNo, activeDagQuery) ||
                  (matchedDags.length === 0 &&
                    normalizeQuery(preview.firstDagNo).includes(
                      normalizeQuery(activeDagQuery)
                    )));

              return (
                <div
                  key={preview.id}
                  className="p-4 sm:px-5 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center hover:bg-slate-50/80 transition-colors"
                >
                  <div className="md:col-span-2">
                    <span className="md:hidden text-xs text-slate-500 block">
                      খতিয়ান নং
                    </span>
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {preview.khatianNo}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {preview.surveyType} জরিপ
                      {preview.page ? ` · পৃষ্ঠা ${enToBnDigits(preview.page)}` : ''}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <span className="md:hidden text-xs text-slate-500 block">
                      প্রথম মালিকের নাম
                    </span>
                    <div className="text-sm font-medium text-slate-900">
                      {preview.firstOwnerName}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="md:hidden text-xs text-slate-500 block">
                      প্রথম দাগ নং
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`text-sm font-mono tabular-nums ${
                          firstDagMatches
                            ? 'inline-block px-2 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-950 font-bold'
                            : 'font-semibold text-emerald-800'
                        }`}
                      >
                        {preview.firstDagNo}
                      </span>
                      {matchedDags.length > 0 && !firstDagMatches && (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-950 text-xs font-mono font-bold tabular-nums">
                          খোঁজা দাগ: {matchedDags.slice(0, 2).join(', ')}
                          {matchedDags.length > 2 ? '…' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    {isUnlocked ? (
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>আনলক করা হয়েছে — সব তথ্য উন্মুক্ত</span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            রিমাইন্ডার: আর{' '}
                            <strong className="font-mono tabular-nums">
                              {countdownText}
                            </strong>{' '}
                            পর লক হবে
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 text-xs text-slate-500">
                        <Lock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>
                          {preview.extraOwnersCount > 0
                            ? `আরও ${enToBnDigits(preview.extraOwnersCount)} জন মালিক · `
                            : ''}
                          {preview.hasFatherInfo ? 'পিতা/স্বামী · ' : ''}
                          {preview.extraDagsCount > 0
                            ? `আরও ${enToBnDigits(preview.extraDagsCount)} টি দাগ`
                            : 'পূর্ণাঙ্গ দাগ ও জমি'}
                          {preview.hasLandArea ? ' · জমির পরিমাণ' : ''} লক করা
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex md:justify-end">
                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onViewUnlocked(preview, activeDagQuery)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        দেখুন ({countdownText})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlockClick(preview)}
                        disabled={isLoading || !pricing.khatianServiceEnabled}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {!pricing.khatianServiceEnabled
                          ? 'সেবা বন্ধ আছে'
                          : isLoading
                            ? 'আনলক হচ্ছে...'
                            : `পুরো তথ্য দেখুন (৳${enToBnDigits(pricing.khatianPrice)})`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDebitModal
        isOpen={Boolean(pendingUnlockPreview)}
        title="খতিয়ান আনলকের সম্মতি"
        itemLabel={
          pendingUnlockPreview
            ? `খতিয়ান নং ${pendingUnlockPreview.khatianNo} (${pendingUnlockPreview.surveyType} জরিপ)`
            : ''
        }
        amount={pricing.khatianPrice}
        currentBalance={userBalance ?? 0}
        note={`আনলক করার পর ${enToBnDigits(pricing.unlockDurationMinutes)} মিনিট পর্যন্ত পূর্ণাঙ্গ তথ্য দেখতে ও প্রিন্ট করতে পারবেন।`}
        loading={Boolean(
          pendingUnlockPreview && unlockingId === pendingUnlockPreview.id
        )}
        onConfirm={handleConfirmUnlock}
        onCancel={() => setPendingUnlockPreview(null)}
      />
    </section>
  );
}
