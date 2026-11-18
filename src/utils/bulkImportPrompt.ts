import type { KhatianRecord } from '../types';

export interface BulkPromptContext {
  moujaName?: string;
  jlNo?: string;
  surveyType?: string;
}

export function buildKhatianAiPrompt(context?: BulkPromptContext): string {
  const moujaLine = context?.moujaName
    ? `- মৌজার নাম: ${context.moujaName}${context.jlNo ? ` (জেএল নং: ${context.jlNo})` : ''}`
    : '- মৌজার নাম: (সংযুক্ত PDF অনুযায়ী)';
  const surveyLine = context?.surveyType
    ? `- জরিপের ধরন: ${context.surveyType}`
    : '- জরিপের ধরন: (সংযুক্ত PDF অনুযায়ী)';

  return [
    'সংযুক্ত খতিয়ান PDF ফাইলটি থেকে সবগুলো খতিয়ান রেকর্ড পড়ে নিচের ঠিক এই JSON অ্যারে ফরম্যাটে রূপান্তর করে দাও।',
    '',
    'প্রসঙ্গ তথ্য:',
    moujaLine,
    surveyLine,
    '',
    'কঠোর নির্দেশনা:',
    '১. আউটপুটে শুধুমাত্র বৈধ JSON অ্যারে ([ ... ]) দেবে—কোনো বাড়তি ব্যাখ্যা, ভূমিকা বা মন্তব্য লিখবে না।',
    '২. প্রতিটি খতিয়ানের জন্য নিচের ফিল্ডগুলো ব্যবহার করবে:',
    '   - "khatianNo": খতিয়ান নম্বর (বাংলা সংখ্যায় স্ট্রিং, যেমন "১", "২৬৬", "৩১/১")',
    '   - "owners": মালিক/দখলদারদের নামের অ্যারে (["নাম ১", "নাম ২"]) — কোনো মালিক বাদ দেবে না',
    '   - "fatherOrHusband": পিতা বা স্বামীর নাম ও বিবরণ (একটি স্ট্রিং; তথ্য না থাকলে "—")',
    '   - "dags": অন্তর্ভুক্ত সব দাগ নম্বরের অ্যারে (["২৫১৪", "২৫১৫", "১৬৪৯/১৯৪৩"]) — কোনো দাগ বাদ দেবে না',
    '   - "landAcres": মোট জমির পরিমাণ একরে বাংলা সংখ্যায় ৪ দশমিক ঘর পর্যন্ত (যেমন "১.২৫০০", না থাকলে "০.০০০০")',
    '   - "page": PDF বা বইয়ের পৃষ্ঠা নম্বর ইংরেজি পূর্ণসংখ্যায় (যেমন 1)',
    '৩. PDF-এর কোনো খতিয়ান, মালিক বা দাগ সংক্ষিপ্ত করবে না বা বাদ দেবে না; সব পৃষ্ঠার প্রতিটি এন্ট্রি সম্পূর্ণ বের করবে।',
    '',
    'উদাহরণ ফরম্যাট:',
    '[',
    '  {',
    '    "khatianNo": "১",',
    '    "owners": ["দং আব্দুল করিম", "দং রহিম উদ্দিন"],',
    '    "fatherOrHusband": "পিং মৃত জব্বার আলী",',
    '    "dags": ["১০১", "১০২", "১০৫/২"],',
    '    "landAcres": "১.২৫০০",',
    '    "page": 1',
    '  }',
    ']',
  ].join('\n');
}

function stripMarkdownCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v ?? '').trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  if (typeof value === 'string') {
    const cleaned = value
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  return fallback;
}

export function parseBulkKhatianJson(
  rawText: string,
  moujaId: string,
  surveyType: string
): Omit<KhatianRecord, 'id'>[] {
  const cleanedText = stripMarkdownCodeFences(rawText);
  if (!cleanedText) {
    throw new Error('JSON টেক্সট খালি রাখা যাবে না।');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    throw new Error('JSON পার্স করতে সমস্যা হয়েছে। অনুগ্রহ করে সঠিক JSON অ্যারে ফরম্যাট দিন।');
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        'records' in parsed &&
        Array.isArray((parsed as { records?: unknown }).records)
      ? (parsed as { records: unknown[] }).records
      : null;

  if (!list || list.length === 0) {
    throw new Error('সঠিক JSON অ্যারে ফরম্যাট দিন (কমপক্ষে ১টি খতিয়ান থাকতে হবে)।');
  }

  const cleanSurvey = surveyType.trim() || 'CS';
  const records: Omit<KhatianRecord, 'id'>[] = [];

  for (const rawItem of list) {
    if (typeof rawItem !== 'object' || rawItem === null) continue;
    const item = rawItem as Record<string, unknown>;
    const khatianNo = String(item.khatianNo ?? '').trim();
    if (!khatianNo) continue;

    const owners = normalizeStringArray(item.owners, ['তথ্য সংরক্ষিত']);
    const dags = normalizeStringArray(item.dags, []);
    const fatherOrHusband = String(item.fatherOrHusband ?? '').trim() || '—';
    const landAcres = String(item.landAcres ?? '').trim() || '০.০০০০';

    const rec: Omit<KhatianRecord, 'id'> = {
      moujaId,
      surveyType: cleanSurvey,
      khatianNo,
      owners,
      fatherOrHusband,
      dags,
      landAcres,
    };

    const parsedPage = Number(item.page);
    if (Number.isFinite(parsedPage) && parsedPage > 0) {
      rec.page = Math.round(parsedPage);
    }

    records.push(rec);
  }

  if (records.length === 0) {
    throw new Error('কোনো বৈধ খতিয়ান নম্বর (khatianNo) পাওয়া যায়নি।');
  }

  return records;
}
