import type { KhatianRecord, Mouja } from '../types';
import {
  buildKhatianVerificationCode,
  enToBnDigits,
  isDagHighlighted,
} from '../utils/landRecords';
import {
  acresToWordsBn,
  FORM_5462_COLUMNS,
  formatAcresFixedBn,
} from '../utils/khatianPdf';

interface KhatianForm5462PreviewProps {
  record: KhatianRecord;
  mouja: Mouja | undefined;
  highlightQuery?: string;
}

export function KhatianForm5462Preview({
  record,
  mouja,
  highlightQuery,
}: KhatianForm5462PreviewProps) {
  const district = mouja?.district || 'সিরাজগঞ্জ';
  const upazila = mouja?.upazila || 'চৌহালী';
  const moujaName = mouja?.name || 'স্থল নওহাটা';
  const jlNo = mouja?.jlNo || '৭৪';
  const landFixed = formatAcresFixedBn(record.landAcres);
  const landWords = acresToWordsBn(record.landAcres);
  const verificationCode = buildKhatianVerificationCode(
    record.moujaId,
    record.surveyType,
    record.khatianNo
  );

  return (
    <div className="khatian-print-sheet bg-white border border-slate-300 rounded-lg p-4 sm:p-6 text-slate-900 overflow-x-auto print-expand">
      <div className="min-w-[760px] space-y-3">
        {/* Form Header */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-slate-800">
            বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            খতিয়ান নং {enToBnDigits(record.khatianNo)}
          </h3>
          <span className="text-xs font-semibold text-slate-700">
            জরিপ: {record.surveyType}
          </span>
        </div>

        {/* Location Row */}
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-900 pt-1">
          <div>জেলা : {district}</div>
          <div>উপজেলা / সার্কেল : {upazila}</div>
          <div>মৌজা : {moujaName}</div>
          <div className="text-right">জে.এল নং : {enToBnDigits(jlNo)}</div>
        </div>

        {/* 9-Column Official Khatian Table */}
        <table className="w-full border-collapse border border-slate-800 text-[11px] leading-snug">
          <thead>
            <tr>
              {FORM_5462_COLUMNS.map((col, idx) => (
                <th
                  key={col.num}
                  style={{ width: `${col.pct * 100}%` }}
                  className={`border border-slate-800 px-1.5 py-2 text-center font-semibold align-middle whitespace-pre-line ${
                    idx === 0 ? 'text-left' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              {FORM_5462_COLUMNS.map((col) => (
                <th
                  key={col.num}
                  className="border border-slate-800 px-1 py-0.5 text-center font-semibold"
                >
                  {col.num}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="border border-slate-800 p-2 space-y-1">
                {record.owners.map((owner, idx) => (
                  <div key={`${owner}-${idx}`}>{owner}</div>
                ))}
                {record.fatherOrHusband && record.fatherOrHusband.trim() !== '—' && (
                  <div className="pt-1 text-slate-800 font-medium">
                    পিতা/স্বামী: {record.fatherOrHusband}
                  </div>
                )}
              </td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2 text-center font-mono">
                <div className="flex flex-col gap-0.5 items-center">
                  {record.dags.map((dag, idx) => {
                    const matched = isDagHighlighted(
                      dag,
                      record.dags,
                      highlightQuery || ''
                    );
                    return (
                      <span
                        key={`${dag}-${idx}`}
                        className={
                          matched
                            ? 'bg-amber-100 border border-amber-400 text-amber-950 font-bold rounded px-1.5 print:bg-transparent print:border-0 print:px-0 print:font-normal'
                            : undefined
                        }
                      >
                        {dag}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2 text-center"></td>
              <td className="border border-slate-800 p-2"></td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-slate-800 px-2 py-2 font-medium">
                {record.surveyType} জরিপ রেকর্ড · খতিয়ান নং {enToBnDigits(record.khatianNo)}
                {record.page ? ` · বইয়ের পৃষ্ঠা নং ${enToBnDigits(record.page)}` : ''}
              </td>
              <td className="border border-slate-800 px-2 py-2 text-center font-semibold">
                মোট জমি
              </td>
              <td className="border border-slate-800 px-2 py-2 text-center font-mono font-bold">
                {landFixed}
              </td>
              <td className="border border-slate-800 px-2 py-2 text-[10px] leading-tight">
                কথায়: {landWords}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-semibold text-slate-800">
          <span>অনলাইন সংরক্ষিত ও আনলককৃত খতিয়ান অনুলিপি</span>
          <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            যাচাই কোড: {verificationCode}
          </span>
        </div>

        {/* Footer Notes */}
        <div className="pt-2 space-y-1 text-[10px] text-slate-700 leading-relaxed">
          <div className="font-semibold text-slate-900">বিশেষ দ্রষ্টব্য:</div>
          <p>
            ১। এই খতিয়ানটি অনলাইন তথ্যভাণ্ডার থেকে প্রাপ্ত তথ্যের ভিত্তিতে প্রস্তুত করা হয়েছে। এটি শুধুমাত্র তথ্য দেখার উদ্দেশ্যে ব্যবহারের জন্য। এটি কোনো আইনগতভাবে বৈধ সরকারি খতিয়ান নয় এবং সকল ক্ষেত্রে ব্যবহারযোগ্য নয়। সরকারি ও আইনগত কাজে ব্যবহারের জন্য অনুগ্রহ করে land.gov.bd ওয়েবসাইট থেকে খতিয়ান ডাউনলোড করুন।
          </p>
          <p>২। সরকারি কাজের জন্য সরকারি ওয়েবসাইট থেকে খতিয়ান ডাউনলোড করতে হবে।</p>
          <p>৩। ভূমি বিষয়ক যেকোন তথ্য বা পরামর্শের জন্য ১৬১২২ নম্বরে কল করুন।</p>
          <p>
            ৪। এই খতিয়ানটি Mondol Telecom Online Services থেকে সংগৃহীত তথ্যের ভিত্তিতে প্রস্তুতকৃত অনুলিপি।
          </p>
          <div className="text-right font-mono text-[11px] font-medium pt-1">1/1</div>
        </div>
      </div>
    </div>
  );
}
