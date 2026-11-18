import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { PaymentRequest } from '../../types';
import { enToBnDigits } from '../../utils/landRecords';

interface AdminPaymentsTabProps {
  paymentRequests: PaymentRequest[];
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onApprovePayment: (req: PaymentRequest) => Promise<void>;
  onRejectPayment: (req: PaymentRequest, note: string) => Promise<void>;
}

export function AdminPaymentsTab({
  paymentRequests,
  busyId,
  setBusyId,
  setStatusMsg,
  onApprovePayment,
  onRejectPayment,
}: AdminPaymentsTabProps) {
  // Detect duplicate TrxIDs across existing requests so admins can spot fraud quickly
  const trxCounts = new Map<string, number>();
  for (const req of paymentRequests) {
    const key = req.trxId.trim().toUpperCase();
    trxCounts.set(key, (trxCounts.get(key) || 0) + 1);
  }

  if (paymentRequests.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        কোনো পেমেন্ট অনুরোধ নেই।
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {paymentRequests.map((req) => {
        const trxNorm = req.trxId.trim().toUpperCase();
        const isDuplicateTrx = (trxCounts.get(trxNorm) || 0) > 1;

        return (
          <div
            key={req.id}
            className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  ৳{enToBnDigits(req.amount)}
                </span>
                <span className="text-sm font-semibold text-emerald-800 font-mono">
                  TrxID: {req.trxId}
                </span>
                {isDuplicateTrx && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    ডুপ্লিকেট TrxID সতর্কতা!
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    req.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : req.status === 'rejected'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {req.status === 'pending'
                    ? 'Pending'
                    : req.status === 'approved'
                    ? 'Approved'
                    : 'Rejected'}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                ব্যবহারকারী: {req.userName || req.userEmail} ({req.userEmail}) · বিকাশ
                নম্বর: <span className="font-mono">{req.bkashNumber}</span>
              </div>
              {req.adminNote && (
                <div className="text-xs text-slate-500 mt-0.5">
                  নোট: {req.adminNote}
                </div>
              )}
            </div>

            {req.status === 'pending' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busyId === req.id}
                  onClick={async () => {
                    setBusyId(req.id);
                    setStatusMsg(null);
                    try {
                      await onApprovePayment(req);
                      setStatusMsg(
                        `${req.userEmail} এর একাউন্টে ৳${enToBnDigits(req.amount)} যুক্ত হয়েছে।`
                      );
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve ও ব্যালেন্স যোগ
                </button>
                <button
                  type="button"
                  disabled={busyId === req.id}
                  onClick={async () => {
                    setBusyId(req.id);
                    setStatusMsg(null);
                    try {
                      await onRejectPayment(req, 'TrxID যাচাইয়ে মেলেনি');
                      setStatusMsg('পেমেন্ট অনুরোধ বাতিল করা হয়েছে।');
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-800 text-xs font-semibold cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
