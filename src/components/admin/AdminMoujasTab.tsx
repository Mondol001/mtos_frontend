import { useState } from 'react';
import { Check, Copy, MapPin, Plus, Sparkles, Upload } from 'lucide-react';
import type { KhatianRecord, Mouja, SurveyType } from '../../types';
import {
  BD_DIVISIONS,
  getDistrictOptions,
  getUpazilaOptions,
} from '../../data/bdGeo';
import {
  buildKhatianAiPrompt,
  parseBulkKhatianJson,
} from '../../utils/bulkImportPrompt';
import { enToBnDigits } from '../../utils/landRecords';

interface AdminMoujasTabProps {
  moujas: Mouja[];
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setStatusMsg: (msg: string | null) => void;
  onAddMouja: (mouja: Omit<Mouja, 'id'>) => Promise<void>;
  onAddKhatian: (record: Omit<KhatianRecord, 'id'>) => Promise<void>;
  onBulkAddKhatians: (records: Omit<KhatianRecord, 'id'>[]) => Promise<void>;
}

export function AdminMoujasTab({
  moujas,
  busyId,
  setBusyId,
  setStatusMsg,
  onAddMouja,
  onAddKhatian,
  onBulkAddKhatians,
}: AdminMoujasTabProps) {
  // New Mouja form
  const [moujaName, setMoujaName] = useState('');
  const [moujaJl, setMoujaJl] = useState('');
  const [moujaDivision, setMoujaDivision] = useState('রাজশাহী');
  const [moujaDistrict, setMoujaDistrict] = useState('সিরাজগঞ্জ');
  const [moujaUpazila, setMoujaUpazila] = useState('চৌহালী');
  const [moujaSurveys, setMoujaSurveys] = useState<SurveyType[]>(['CS', 'SA']);
  const [customSurveyInput, setCustomSurveyInput] = useState('');

  // New Khatian form
  const [kMoujaId, setKMoujaId] = useState(moujas[0]?.id || '');
  const [kSurvey, setKSurvey] = useState<SurveyType>('CS');
  const [kNo, setKNo] = useState('');
  const [kOwners, setKOwners] = useState('');
  const [kFather, setKFather] = useState('');
  const [kDags, setKDags] = useState('');
  const [kAcres, setKAcres] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(true);

  async function handleMoujaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moujaName.trim() || !moujaJl.trim()) return;
    setBusyId('mouja');
    setStatusMsg(null);
    try {
      await onAddMouja({
        name: moujaName.trim(),
        jlNo: moujaJl.trim(),
        upazila: moujaUpazila.trim() || '—',
        district: moujaDistrict.trim() || '—',
        division: moujaDivision.trim() || '—',
        surveyTypes: moujaSurveys.length > 0 ? moujaSurveys : ['CS', 'SA'],
      });
      setMoujaName('');
      setMoujaJl('');
      setStatusMsg('নতুন মৌজা সফলভাবে ডাটাবেজে যোগ করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  async function handleKhatianSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kNo.trim() || !kDags.trim()) return;
    setBusyId('khatian');
    setStatusMsg(null);
    try {
      await onAddKhatian({
        moujaId: kMoujaId || moujas[0]?.id,
        surveyType: kSurvey,
        khatianNo: kNo.trim(),
        owners: kOwners
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        fatherOrHusband: kFather.trim() || '—',
        dags: kDags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        landAcres: kAcres.trim() || '০.০০০০',
      });
      setKNo('');
      setKOwners('');
      setKFather('');
      setKDags('');
      setKAcres('');
      setStatusMsg('নতুন খতিয়ান রেকর্ড সফলভাবে সংরক্ষণ করা হয়েছে।');
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkImport() {
    if (!bulkJson.trim()) return;
    setBusyId('bulk');
    setStatusMsg(null);
    try {
      const mapped = parseBulkKhatianJson(
        bulkJson,
        kMoujaId || moujas[0]?.id,
        kSurvey
      );
      await onBulkAddKhatians(mapped);
      setBulkJson('');
      setStatusMsg(
        `${enToBnDigits(mapped.length)} টি খতিয়ান বাল্ক ইমপোর্ট সম্পন্ন হয়েছে।`
      );
    } catch (err) {
      setStatusMsg(
        err instanceof Error
          ? err.message
          : 'JSON পার্স করতে সমস্যা হয়েছে। অনুগ্রহ করে ফরম্যাট যাচাই করুন।'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyAiPrompt(promptText: string) {
    try {
      await navigator.clipboard.writeText(promptText);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = promptText;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setPromptCopied(true);
        window.setTimeout(() => setPromptCopied(false), 2500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const selectedBulkMouja =
    moujas.find((m) => m.id === (kMoujaId || moujas[0]?.id)) || moujas[0];
  const aiPromptText = buildKhatianAiPrompt({
    moujaName: selectedBulkMouja?.name,
    jlNo: selectedBulkMouja?.jlNo,
    surveyType: kSurvey,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form
        onSubmit={handleMoujaSubmit}
        className="border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-700" />
          ধাপে ধাপে নতুন মৌজা যোগ করুন
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={moujaDivision}
            onChange={(e) => {
              const nextDiv = e.target.value;
              setMoujaDivision(nextDiv);
              const dists = getDistrictOptions(nextDiv, moujas);
              const nextDist = dists[0]?.name || '';
              setMoujaDistrict(nextDist);
              const ups = getUpazilaOptions(nextDiv, nextDist, moujas);
              setMoujaUpazila(ups[0]?.name || '');
            }}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {BD_DIVISIONS.map((d) => (
              <option key={d.name} value={d.name}>
                বিভাগ: {d.name}
              </option>
            ))}
          </select>
          <select
            value={moujaDistrict}
            onChange={(e) => {
              const nextDist = e.target.value;
              setMoujaDistrict(nextDist);
              const ups = getUpazilaOptions(moujaDivision, nextDist, moujas);
              setMoujaUpazila(ups[0]?.name || '');
            }}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {getDistrictOptions(moujaDivision, moujas).map((dt) => (
              <option key={dt.name} value={dt.name}>
                জেলা: {dt.name}
              </option>
            ))}
          </select>
          <select
            value={moujaUpazila}
            onChange={(e) => setMoujaUpazila(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {getUpazilaOptions(moujaDivision, moujaDistrict, moujas).map((up) => (
              <option key={up.name} value={up.name}>
                উপজেলা: {up.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="জেএল নং (যেমন: ৭৫)"
            value={moujaJl}
            onChange={(e) => setMoujaJl(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="মৌজার নাম (যেমন: স্থল নওহাটা)"
            value={moujaName}
            onChange={(e) => setMoujaName(e.target.value)}
            className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <div className="col-span-2 space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <span className="font-semibold">জরিপসমূহ:</span>
              {Array.from(
                new Set(['CS', 'SA', 'RS', 'BS', 'BRS', 'দিয়ারা', ...moujaSurveys])
              ).map((st) => (
                <label
                  key={st}
                  className="inline-flex items-center gap-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={moujaSurveys.includes(st)}
                    onChange={(e) => {
                      setMoujaSurveys((prev) =>
                        e.target.checked
                          ? [...prev, st]
                          : prev.filter((item) => item !== st)
                      );
                    }}
                  />
                  {st}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="অন্য জরিপ যোগ (যেমন: পেটি, সিটি জরিপ)"
                value={customSurveyInput}
                onChange={(e) => setCustomSurveyInput(e.target.value)}
                className="flex-1 h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const val = customSurveyInput.trim();
                  if (val && !moujaSurveys.includes(val)) {
                    setMoujaSurveys((prev) => [...prev, val]);
                  }
                  setCustomSurveyInput('');
                }}
                className="px-3 h-9 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                জরিপ যুক্ত করুন
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={busyId === 'mouja'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          মৌজা যোগ করুন
        </button>
      </form>

      <form
        onSubmit={handleKhatianSubmit}
        className="border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h3 className="font-bold text-slate-900 text-sm">
          একক খতিয়ান / দাগ রেকর্ড যোগ করুন
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={kMoujaId}
            onChange={(e) => setKMoujaId(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {moujas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (জেএল {m.jlNo})
              </option>
            ))}
          </select>
          <input
            type="text"
            list="survey-suggestions"
            required
            placeholder="জরিপ (CS, SA, RS, BS...)"
            value={kSurvey}
            onChange={(e) => setKSurvey(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white"
          />
          <datalist id="survey-suggestions">
            <option value="CS" />
            <option value="SA" />
            <option value="RS" />
            <option value="BS" />
            <option value="BRS" />
            <option value="দিয়ারা" />
          </datalist>
          <input
            type="text"
            required
            placeholder="খতিয়ান নং"
            value={kNo}
            onChange={(e) => setKNo(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="জমির পরিমাণ (একর)"
            value={kAcres}
            onChange={(e) => setKAcres(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="মালিকের নাম (কমা দিয়ে একাধিক)"
            value={kOwners}
            onChange={(e) => setKOwners(e.target.value)}
            className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            placeholder="পিতা / স্বামীর নাম"
            value={kFather}
            onChange={(e) => setKFather(e.target.value)}
            className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="দাগ নং (কমা দিয়ে একাধিক, যেমন: ১২, ১৩)"
            value={kDags}
            onChange={(e) => setKDags(e.target.value)}
            className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busyId === 'khatian'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          খতিয়ান সংরক্ষণ করুন
        </button>
      </form>

      <div className="lg:col-span-2 border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">বাল্ক JSON ইমপোর্ট</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              নির্বাচিত গন্তব্য:{' '}
              <strong className="text-emerald-800">
                {selectedBulkMouja?.name || 'মৌজা'} (জেএল{' '}
                {selectedBulkMouja?.jlNo || '—'})
              </strong>{' '}
              · জরিপ: <strong className="text-emerald-800">{kSurvey}</strong> ·
              পুনরায় আপলোডে স্বয়ংক্রিয় আপডেট হবে (ডুপ্লিকেট হবে না)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAiPrompt((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showAiPrompt
              ? 'AI প্রম্পট বক্স লুকান'
              : 'AI দিয়ে PDF থেকে JSON তৈরির প্রম্পট দেখুন'}
          </button>
        </div>

        {showAiPrompt && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  AI দিয়ে PDF থেকে JSON বানানোর রেডি প্রম্পট
                </div>
                <p className="text-xs text-emerald-900/80 mt-0.5">
                  ১) প্রম্পট কপি করুন → ২) যেকোনো AI-তে খতিয়ান PDF ফাইল আপলোড করে এই
                  প্রম্পট দিন → ৩) AI-এর দেওয়া JSON নিচে পেস্ট করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyAiPrompt(aiPromptText)}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                  promptCopied
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {promptCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    কপি হয়েছে!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    প্রম্পট কপি করুন
                  </>
                )}
              </button>
            </div>

            <pre className="w-full max-h-56 overflow-y-auto rounded-lg border border-emerald-200 bg-white p-3 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
              {aiPromptText}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="bulk-khatian-json"
            className="block text-xs font-semibold text-slate-700"
          >
            AI থেকে পাওয়া JSON এখানে পেস্ট করুন (একাধিক খতিয়ানের অ্যারে)
          </label>
          <textarea
            id="bulk-khatian-json"
            rows={4}
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            placeholder='[{"khatianNo":"১","owners":["দং আব্দুল করিম"],"fatherOrHusband":"পিং রহিম","dags":["১০১","১০২"],"landAcres":"১.২৫০০","page":1}]'
            className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleBulkImport}
              disabled={busyId === 'bulk' || !bulkJson.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {busyId === 'bulk' ? 'ইমপোর্ট হচ্ছে...' : 'বাল্ক ইমপোর্ট করুন'}
            </button>
            <span className="text-[11px] text-slate-500">
              ```json ... ``` কোড ব্লকসহ পেস্ট করলেও স্বয়ংক্রিয়ভাবে পার্স হবে
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
