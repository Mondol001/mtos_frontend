import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  LayoutGrid,
  Lock,
  Printer,
  X,
} from 'lucide-react';
import type { KhatianRecord, Mouja, UnlockedKhatian } from '../types';
import { formatCountdownBn, getRemainingUnlockMs } from '../utils/billing';
import { downloadKhatianPdf } from '../utils/khatianPdf';
import {
  acresToShatak,
  enToBnDigits,
  findMatchedDagsInRecord,
  isDagHighlighted,
} from '../utils/landRecords';
import { ConfirmDebitModal } from './ConfirmDebitModal';
import { KhatianForm5462Preview } from './KhatianForm5462Preview';

interface KhatianDetailModalProps {
  record: KhatianRecord | null;
  mouja: Mouja | undefined;
  unlockRecord?: UnlockedKhatian;
  unlockDurationMinutes: number;
  khatianPrice: number;
  userBalance: number;
  serviceEnabled: boolean;
  highlightQuery?: string;
  onReUnlock: (record: KhatianRecord) => Promise<void>;
  onClose: () => void;
}

export function KhatianDetailModal({
  record,
  mouja,
  unlockRecord,
  unlockDurationMinutes,
  khatianPrice,
  userBalance,
  serviceEnabled,
  highlightQuery,
  onReUnlock,
  onClose,
}: KhatianDetailModalProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reUnlocking, setReUnlocking] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'form5462'>('card');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reUnlockError, setReUnlockError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;
    setNowMs(Date.now());
    setViewMode('card');
    setReUnlockError(null);
    setPdfError(null);
    setConfirmOpen(false);
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [record, unlockRecord?.expiresAtMs]);

  if (!record) return null;

  const remainingMs = getRemainingUnlockMs(
    unlockRecord,
    nowMs,
    unlockDurationMinutes
  );
  const isExpired = remainingMs <= 0;
  const isUrgent = remainingMs > 0 && remainingMs <= 2 * 60_000;
  const countdownText = formatCountdownBn(remainingMs);

  async function handleDownloadPdf() {
    if (!record || isExpired) return;
    setPdfError(null);
    setDownloadingPdf(true);
    try {
      await downloadKhatianPdf(record, mouja);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? err.message
          : 'PDF তৈরি করা যায়নি। দয়া করে প্রিন্ট বাটন ব্যবহার করুন।'
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleConfirmedReUnlock() {
    if (!record) return;
    setReUnlockError(null);
    setReUnlocking(true);
    try {
      await onReUnlock(record);
      setConfirmOpen(false);
    } catch (err) {
      setConfirmOpen(false);
      setReUnlockError(
        err instanceof Error
          ? err.message
          : 'পুনরায় আনলক করা যায়নি। ব্যালেন্স চেক করুন।'
      );
    } finally {
      setReUnlocking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print-expand print-reset-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="khatian-detail-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print-expand print-reset-card">
        {/* Pinned Top Bar (Never pushed off-screen) */}
        <div className="no-print shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {isExpired ? (
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <Lock className="w-4 h-4" />
                মেয়াদ শেষ — পুনরায় লক হয়েছে
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                আনলক সম্পন্ন — খতিয়ান নং {enToBnDigits(record.khatianNo)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isExpired && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingPdf ? 'PDF তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  প্রিন্ট
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pinned Live Auto-Relock Countdown Reminder */}
        {!isExpired && (
          <div
            className={`no-print shrink-0 px-4 sm:px-6 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm ${
              isUrgent
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                রিমাইন্ডার: পুরো তথ্য আর{' '}
                <strong className="font-mono tabular-nums">{countdownText}</strong> পর
                স্বয়ংক্রিয়ভাবে আবার লক হয়ে যাবে। এখনি ফরম ৫৪৬২ PDF ডাউনলোড বা প্রিন্ট
                করুন।
              </span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <span
                className={`px-2.5 py-1 rounded-md font-mono font-bold tabular-nums text-xs ${
                  isUrgent
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                বাকি: {countdownText}
              </span>
            </div>
          </div>
        )}

        {/* View Switcher Bar */}
        {!isExpired && (
          <div className="no-print shrink-0 px-4 sm:px-6 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                তথ্য কার্ড
              </button>
              <button
                type="button"
                onClick={() => setViewMode('form5462')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'form5462'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                ফরম নং ৫৪৬২ (PDF প্রিভিউ)
              </button>
            </div>
            {pdfError && (
              <span className="text-xs text-rose-700 font-medium">{pdfError}</span>
            )}
          </div>
        )}

        {/* Scrollable Inner Body */}
        {isExpired ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="khatian-detail-title"
                className="text-lg font-bold text-slate-900"
              >
                খতিয়ান নং {record.khatianNo}-এর দেখার মেয়াদ শেষ হয়েছে
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                নির্ধারিত {enToBnDigits(unlockDurationMinutes)} মিনিট সময় শেষ হওয়ায়
                নিরাপত্তার স্বার্থে পূর্ণাঙ্গ তথ্য পুনরায় লক করা হয়েছে।
              </p>
            </div>

            {reUnlockError && (
              <div className="max-w-md mx-auto p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {reUnlockError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReUnlockError(null);
                  if (userBalance < khatianPrice) {
                    setReUnlockError(
                      `পুনরায় আনলক করতে ৳${enToBnDigits(khatianPrice)} প্রয়োজন। আপনার বর্তমান ব্যালেন্স ৳${enToBnDigits(userBalance)}।`
                    );
                    return;
                  }
                  setConfirmOpen(true);
                }}
                disabled={reUnlocking || !serviceEnabled}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {!serviceEnabled
                  ? 'সেবাটি সাময়িকভাবে বন্ধ আছে'
                  : reUnlocking
                    ? 'আনলক হচ্ছে...'
                    : `পুনরায় আনলক করুন (৳${enToBnDigits(khatianPrice)})`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 print-expand">
            {/* Official Form 5462 View (always rendered for print even if user switched to card view) */}
            <div className={viewMode === 'form5462' ? 'block' : 'hidden print:block'}>
              <KhatianForm5462Preview
                record={record}
                mouja={mouja}
                highlightQuery={highlightQuery}
              />
            </div>

            {viewMode === 'card' && (
              <div className="no-print space-y-5">
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">
                      Mondol Telecom Online Services · {record.surveyType} জরিপ রেকর্ড
                    </p>
                    <h2
                      id="khatian-detail-title"
                      className="text-xl font-bold text-slate-900 mt-0.5"
                    >
                      খতিয়ান নং:{' '}
                      <span className="font-mono tabular-nums">{record.khatianNo}</span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      মৌজা: {mouja?.name || 'স্থল নওহাটা'} · জেএল নং:{' '}
                      {mouja?.jlNo || '৭৪'} · {mouja?.upazila || 'চৌহালী'},{' '}
                      {mouja?.district || 'সিরাজগঞ্জ'}
                      {record.page
                        ? ` · বইয়ের পৃষ্ঠা নং ${enToBnDigits(record.page)}`
                        : ''}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-right shrink-0">
                    <div className="text-xs text-slate-500">মোট জমির পরিমাণ</div>
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {record.landAcres || '—'}{' '}
                      {record.surveyType === 'CS' ? 'একর' : ''}
                    </div>
                    {record.landAcres && (
                      <div className="text-xs text-emerald-700 font-medium">
                        ({acresToShatak(record.landAcres)})
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                      মালিকগণের নাম ({enToBnDigits(record.owners.length)} জন)
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-800 max-h-60 overflow-y-auto pr-1.5">
                      {record.owners.map((owner, idx) => (
                        <li key={`${owner}-${idx}`} className="flex items-start gap-2">
                          <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0">
                            {enToBnDigits(idx + 1)}.
                          </span>
                          <span>{owner}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                      পিতা / স্বামীর নাম ও বিবরণ
                    </h3>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-1.5">
                      {record.fatherOrHusband || 'তথ্য সংযুক্ত নেই'}
                    </p>
                  </div>
                </div>

                {(() => {
                  const matchedDags = findMatchedDagsInRecord(
                    record.dags,
                    highlightQuery || ''
                  );
                  return (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          অন্তর্ভুক্ত দাগ নম্বরসমূহ ({enToBnDigits(record.dags.length)} টি দাগ)
                        </h3>
                        {matchedDags.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 border border-amber-400 text-amber-950 text-xs font-semibold">
                            খোঁজা দাগ হাইলাইট:{' '}
                            <strong className="font-mono tabular-nums">
                              {matchedDags.join(', ')}
                            </strong>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                        {record.dags.map((dag, idx) => {
                          const highlighted = isDagHighlighted(
                            dag,
                            record.dags,
                            highlightQuery || ''
                          );
                          return (
                            <div
                              key={`${dag}-${idx}`}
                              data-highlighted={highlighted ? 'true' : undefined}
                              className={`px-2.5 py-1.5 rounded-md text-center text-sm font-mono tabular-nums transition-colors ${
                                highlighted
                                  ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-300/60 shadow-xs'
                                  : 'bg-white border border-slate-200 font-medium text-slate-900'
                              }`}
                            >
                              {dag}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDebitModal
        isOpen={confirmOpen}
        title="পুনরায় আনলকের সম্মতি"
        itemLabel={`খতিয়ান নং ${record.khatianNo} (${record.surveyType} জরিপ)`}
        amount={khatianPrice}
        currentBalance={userBalance}
        note={`আনলক করার পর ${enToBnDigits(unlockDurationMinutes)} মিনিট পর্যন্ত পূর্ণাঙ্গ তথ্য দেখতে ও প্রিন্ট করতে পারবেন।`}
        loading={reUnlocking}
        onConfirm={handleConfirmedReUnlock}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
