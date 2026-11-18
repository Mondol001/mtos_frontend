import type { KhatianPreview, KhatianRecord, SurveyType } from '../types.ts';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function bnToEnDigits(input: string): string {
  if (!input) return '';
  let out = '';
  for (const ch of input) {
    const idx = BN_DIGITS.indexOf(ch as (typeof BN_DIGITS)[number]);
    out += idx >= 0 ? String(idx) : ch;
  }
  return out;
}

export function enToBnDigits(input: string | number): string {
  const str = String(input);
  let out = '';
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      out += BN_DIGITS[Number(ch)];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalizes Bengali & English text for resilient search across historical
 * land-record spelling variants (e.g., ী->ি, ূ->ু, ৈ->ে, ৌ->ো, Bn/En digits).
 */
export function normalizeBnText(input: string): string {
  if (!input) return '';
  return bnToEnDigits(input.normalize('NFC'))
    .replace(/\u09BC/g, '') // strip nukta variance
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/ৈ/g, 'ে')
    .replace(/ৌ/g, 'ো')
    .replace(/য়/g, 'য়')
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeQuery(q: string): string {
  return normalizeBnText(q);
}

export function makeSafeDocId(raw: string): string {
  return raw
    .trim()
    .replace(/\//g, '_slash_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-.\u0980-\u09FF]/g, '_');
}

/**
 * Pure ASCII deterministic Khatian document ID (`^[a-zA-Z0-9_-]+$`, <= 128 chars)
 * so bulk re-imports update existing records cleanly without duplicating rows.
 */
export function makeDeterministicKhatianId(
  moujaId: string,
  surveyType: SurveyType,
  khatianNo: string
): string {
  const cleanMouja = moujaId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'm';
  const cleanSurvey = surveyType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16) || 'S';
  const normK = bnToEnDigits(khatianNo).trim().toLowerCase();
  let asciiK = '';
  for (let i = 0; i < normK.length; i++) {
    const ch = normK[i];
    if (/^[a-zA-Z0-9_-]$/.test(ch)) {
      asciiK += ch;
    } else if (ch === '/') {
      asciiK += '_s_';
    } else {
      asciiK += `_u${normK.charCodeAt(i).toString(16)}`;
    }
  }
  const combined = `k_${cleanMouja}_${cleanSurvey}_${asciiK || '0'}`;
  return combined.slice(0, 128);
}

export function makeUnlockId(
  moujaId: string,
  surveyType: SurveyType,
  khatianNo: string
): string {
  const normalizedKhatian = bnToEnDigits(khatianNo).trim().toLowerCase().replace(/\s+/g, ' ');
  return makeSafeDocId(`${moujaId}__${surveyType}__${normalizedKhatian}`);
}

export function buildKhatianVerificationCode(
  moujaId: string,
  surveyType: SurveyType,
  khatianNo: string
): string {
  const src = `${moujaId}|${surveyType}|${bnToEnDigits(khatianNo).trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const code = (hash >>> 0).toString(36).toUpperCase().padStart(6, '0');
  const kDigits = bnToEnDigits(khatianNo).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || '0';
  return `MTOS-${surveyType.toUpperCase().slice(0, 3)}-${kDigits}-${code}`;
}

export function getPreviewRecord(
  record: KhatianRecord,
  matchedDags?: string[]
): KhatianPreview {
  const firstOwnerName =
    record.owners[0]?.trim() ||
    (record.surveyType === 'SA'
      ? `এসএ খতিয়ান নং ${record.khatianNo}`
      : 'তথ্য সংরক্ষিত');
  const firstDagNo = record.dags[0]?.trim() || '—';

  return {
    id: record.id,
    moujaId: record.moujaId,
    surveyType: record.surveyType,
    khatianNo: record.khatianNo,
    firstOwnerName,
    firstDagNo,
    extraOwnersCount: Math.max(0, record.owners.length - 1),
    extraDagsCount: Math.max(0, record.dags.length - 1),
    hasFatherInfo: Boolean(
      record.fatherOrHusband && record.fatherOrHusband.trim() !== '—'
    ),
    hasLandArea: Boolean(record.landAcres && record.landAcres.trim() !== ''),
    page: record.page,
    ...(matchedDags && matchedDags.length > 0 ? { matchedDags } : {}),
    ...(record.isBuiltIn ? { isBuiltIn: true } : {}),
  };
}

export interface SearchFilterOptions {
  moujaId: string;
  surveyType: SurveyType;
  query: string;
  searchField?: 'all' | 'dag' | 'khatian' | 'owner';
  limit?: number;
}

export function searchKhatianRecords(
  records: KhatianRecord[],
  options: SearchFilterOptions
): KhatianRecord[] {
  const { moujaId, surveyType, query, searchField = 'all', limit = 60 } = options;
  const qNorm = normalizeQuery(query);

  const scoped = records.filter(
    (rec) => rec.moujaId === moujaId && rec.surveyType === surveyType
  );

  if (!qNorm) {
    return scoped.slice(0, limit);
  }

  const exactMatches: KhatianRecord[] = [];
  const partialMatches: KhatianRecord[] = [];

  for (const rec of scoped) {
    const khatianNorm = normalizeQuery(rec.khatianNo);
    const dagNorms = rec.dags.map((d) => normalizeQuery(d));
    const ownersNorm = rec.owners.map((o) => normalizeQuery(o));

    const matchKhatianExact = khatianNorm === qNorm;
    const matchKhatianPartial = khatianNorm.includes(qNorm);

    const matchDagExact = dagNorms.some(
      (d) => d === qNorm || d.split('/').some((part) => part === qNorm)
    );
    const matchDagPartial = dagNorms.some((d) => d.includes(qNorm));

    const matchOwner = ownersNorm.some((o) => o.includes(qNorm));

    let isExact = false;
    let isMatch = false;

    if (searchField === 'khatian') {
      isExact = matchKhatianExact;
      isMatch = matchKhatianExact || matchKhatianPartial;
    } else if (searchField === 'dag') {
      isExact = matchDagExact;
      isMatch = matchDagExact || matchDagPartial;
    } else if (searchField === 'owner') {
      isExact = ownersNorm.some((o) => o === qNorm);
      isMatch = matchOwner;
    } else {
      isExact = matchKhatianExact || matchDagExact;
      isMatch = isExact || matchKhatianPartial || matchDagPartial || matchOwner;
    }

    if (isExact) {
      exactMatches.push(rec);
    } else if (isMatch) {
      partialMatches.push(rec);
    }
  }

  return [...exactMatches, ...partialMatches].slice(0, limit);
}

export function isDagExactMatch(dag: string, query: string): boolean {
  const qNorm = normalizeQuery(query);
  if (!qNorm) return false;
  const dNorm = normalizeQuery(dag);
  return dNorm === qNorm || dNorm.split('/').some((part) => part === qNorm);
}

export function isDagHighlighted(
  dag: string,
  allDags: string[],
  query: string,
  searchField: 'all' | 'dag' | 'khatian' | 'owner' = 'all'
): boolean {
  if (searchField === 'khatian' || searchField === 'owner') return false;
  const qNorm = normalizeQuery(query);
  if (!qNorm) return false;
  const hasAnyExact = allDags.some((d) => isDagExactMatch(d, qNorm));
  if (hasAnyExact) {
    return isDagExactMatch(dag, qNorm);
  }
  return normalizeQuery(dag).includes(qNorm);
}

export function findMatchedDagsInRecord(
  dags: string[],
  query: string,
  searchField: 'all' | 'dag' | 'khatian' | 'owner' = 'all'
): string[] {
  if (searchField === 'khatian' || searchField === 'owner') return [];
  const qNorm = normalizeQuery(query);
  if (!qNorm) return [];
  const exact = dags.filter((d) => isDagExactMatch(d, qNorm));
  if (exact.length > 0) return exact;
  return dags.filter((d) => normalizeQuery(d).includes(qNorm));
}

export function acresToShatak(acresStr: string): string {
  const en = bnToEnDigits(acresStr).replace(/[^0-9.]/g, '');
  const val = Number.parseFloat(en);
  if (!Number.isFinite(val) || val <= 0) return '০ শতক';
  const shatak = Math.round(val * 10000) / 100;
  return `${enToBnDigits(shatak.toFixed(2))} শতক`;
}
