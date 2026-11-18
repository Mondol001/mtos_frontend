import { jsPDF } from 'jspdf';
import type { KhatianRecord, Mouja } from '../types';
import { bnToEnDigits, enToBnDigits } from './landRecords';

/**
 * Converts a decimal acre string (e.g. "0.8000", "১.২৫০০", "০০.৮০০০০০")
 * into official Bengali Form 5462 land words:
 * "০ একর ৮০ শতক ০০ অযুতাংশ ০০ লক্ষাংশ"
 */
export function acresToWordsBn(acresStr?: string): string {
  if (!acresStr || !acresStr.trim()) return 'তথ্য সংযুক্ত নেই';
  const cleaned = bnToEnDigits(acresStr).replace(/[^0-9.]/g, '');
  const val = Number.parseFloat(cleaned);
  if (!Number.isFinite(val) || val < 0) return 'তথ্য সংযুক্ত নেই';

  // Work in integer millionths of an acre (1 acre = 1,000,000 lakkhangsha)
  const totalMillionths = Math.round(val * 1_000_000);
  const acres = Math.floor(totalMillionths / 1_000_000);
  const remAfterAcres = totalMillionths % 1_000_000;
  const shatak = Math.floor(remAfterAcres / 10_000); // 1 acre = 100 shatak
  const remAfterShatak = remAfterAcres % 10_000;
  const ojutangsha = Math.floor(remAfterShatak / 100); // 1 shatak = 100 ojutangsha
  const lakkhangsha = remAfterShatak % 100;

  const pad2 = (n: number) => enToBnDigits(String(n).padStart(2, '0'));
  return `${enToBnDigits(acres)} একর ${pad2(shatak)} শতক ${pad2(ojutangsha)} অযুতাংশ ${pad2(lakkhangsha)} লক্ষাংশ`;
}

export function formatAcresFixedBn(acresStr?: string): string {
  if (!acresStr || !acresStr.trim()) return '—';
  const cleaned = bnToEnDigits(acresStr).replace(/[^0-9.]/g, '');
  const val = Number.parseFloat(cleaned);
  if (!Number.isFinite(val)) return acresStr;
  const fixed = val.toFixed(6);
  const [intPart, decPart] = fixed.split('.');
  return `${enToBnDigits(intPart.padStart(2, '0'))}.${enToBnDigits(decPart)}`;
}

export interface KhatianPageSlice {
  ownerLines: string[];
  dagLines: string[];
  isLastPage: boolean;
}

export function buildOwnerLines(record: KhatianRecord): string[] {
  const lines: string[] = [];
  for (const o of record.owners) {
    const clean = o.trim();
    if (clean) lines.push(clean);
  }
  if (record.fatherOrHusband && record.fatherOrHusband.trim() && record.fatherOrHusband.trim() !== '—') {
    lines.push(`পিতা/স্বামী: ${record.fatherOrHusband.trim()}`);
  }
  return lines.length > 0 ? lines : ['তথ্য সংরক্ষিত'];
}

export function buildDagLines(record: KhatianRecord, perLine: number = 1): string[] {
  const cleanDags = record.dags.map((d) => d.trim()).filter(Boolean);
  if (cleanDags.length === 0) return ['—'];
  if (perLine <= 1) return cleanDags;
  const out: string[] = [];
  for (let i = 0; i < cleanDags.length; i += perLine) {
    out.push(cleanDags.slice(i, i + perLine).join(', '));
  }
  return out;
}

export function paginateKhatianSlices(
  ownerLines: string[],
  dagLines: string[],
  maxLinesPerPage: number = 18
): KhatianPageSlice[] {
  const totalLines = Math.max(ownerLines.length, dagLines.length, 1);
  const pageCount = Math.max(1, Math.ceil(totalLines / maxLinesPerPage));
  const pages: KhatianPageSlice[] = [];

  for (let p = 0; p < pageCount; p++) {
    const start = p * maxLinesPerPage;
    const end = start + maxLinesPerPage;
    pages.push({
      ownerLines: ownerLines.slice(start, end),
      dagLines: dagLines.slice(start, end),
      isLastPage: p === pageCount - 1,
    });
  }

  return pages;
}

function wrapTextCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width <= maxWidth) {
        current = word;
      } else {
        // Break overly long token
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width <= maxWidth) {
            chunk += ch;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export const FORM_5462_COLUMNS = [
  { num: '১', label: 'মালিক, অকৃষি প্রজা বা\nইজারাদারের নাম ও ঠিকানা', pct: 0.24 },
  { num: '২', label: 'অংশ', pct: 0.05 },
  { num: '৩', label: 'মোট ভূমি উন্নয়ন কর', pct: 0.08 },
  { num: '৪', label: 'দাগ নং', pct: 0.09 },
  { num: '৫', label: 'জমির শ্রেণী', pct: 0.08 },
  { num: '৬', label: 'দাগের মোট জমির\nপরিমাণ (একর)', pct: 0.11 },
  { num: '৭', label: 'দাগের মধ্যে অত্র\nখতিয়ানের অংশ', pct: 0.10 },
  { num: '৮', label: 'অংশানুযায়ী জমির\nপরিমাণ (একর)', pct: 0.11 },
  { num: '৯', label: 'দখল/স্বত্ব বিষয়ক বা\nঅন্যান্য বিষয়ে মন্তব্য', pct: 0.14 },
] as const;

/**
 * Generates and downloads an official Bangladesh Form 5462 (Revised) landscape PDF
 * directly into the user's browser using native Canvas text shaping + jsPDF.
 */
export async function downloadKhatianPdf(
  record: KhatianRecord,
  mouja: Mouja | undefined
): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system Bengali font if font promise fails
    }
  }

  const PAGE_W = 2480;
  const PAGE_H = 1754;
  const MARGIN_X = 110;
  const TABLE_W = PAGE_W - MARGIN_X * 2;
  const FONT_FAMILY = '"Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif';

  const ownerRawLines = buildOwnerLines(record);
  const dagPerLine = record.dags.length > 24 ? 3 : record.dags.length > 14 ? 2 : 1;
  const dagRawLines = buildDagLines(record, dagPerLine);

  // Measure wrapped owner lines so tall records cleanly split across pages
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) throw new Error('PDF ক্যানভাস তৈরি করা যায়নি।');
  mCtx.font = `24px ${FONT_FAMILY}`;

  const colWidths = FORM_5462_COLUMNS.map((c) => c.pct * TABLE_W);
  const wrappedOwners: string[] = [];
  for (const line of ownerRawLines) {
    wrappedOwners.push(...wrapTextCanvas(mCtx, line, colWidths[0] - 28));
  }
  const wrappedDags: string[] = [];
  for (const line of dagRawLines) {
    wrappedDags.push(...wrapTextCanvas(mCtx, line, colWidths[3] - 20));
  }

  const slices = paginateKhatianSlices(wrappedOwners, wrappedDags, 16);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const district = mouja?.district || 'সিরাজগঞ্জ';
  const upazila = mouja?.upazila || 'চৌহালী';
  const moujaName = mouja?.name || 'স্থল নওহাটা';
  const jlNo = mouja?.jlNo || '৭৪';
  const totalWords = acresToWordsBn(record.landAcres);
  const totalFixed = formatAcresFixedBn(record.landAcres);

  slices.forEach((slice, pageIdx) => {
    if (pageIdx > 0) pdf.addPage('a4', 'landscape');

    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('PDF পেজ রেন্ডার করা যায়নি।');

    // White sheet background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle crisp dark ink
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#1e293b';

    // Top row: Form No + Main Khatian Heading
    ctx.font = `500 26px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText('বাংলাদেশ ফরম নং ৫৪৬২ (সংশোধিত)', MARGIN_X, 130);

    ctx.font = `700 48px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(`খতিয়ান নং ${enToBnDigits(record.khatianNo)}`, PAGE_W / 2, 136);

    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.fillText(`জরিপ: ${record.surveyType}`, PAGE_W - MARGIN_X, 130);

    // Location metadata bar
    ctx.fillStyle = '#0f172a';
    ctx.font = `500 26px ${FONT_FAMILY}`;
    const metaY = 216;
    ctx.textAlign = 'left';
    ctx.fillText(`জেলা : ${district}`, MARGIN_X, metaY);
    ctx.fillText(`উপজেলা / সার্কেল : ${upazila}`, MARGIN_X + TABLE_W * 0.27, metaY);
    ctx.fillText(`মৌজা : ${moujaName}`, MARGIN_X + TABLE_W * 0.60, metaY);
    ctx.textAlign = 'right';
    ctx.fillText(`জে.এল নং : ${enToBnDigits(jlNo)}`, PAGE_W - MARGIN_X, metaY);

    // Table geometry
    const tableTop = 250;
    const headerRowH = 128;
    const numRowH = 44;
    const dataRowH = 560;
    const totalRowH = slice.isLastPage ? 96 : 0;
    const totalTableH = headerRowH + numRowH + dataRowH + totalRowH;

    // Outer border
    ctx.lineWidth = 2.2;
    ctx.strokeRect(MARGIN_X, tableTop, TABLE_W, totalTableH);

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, tableTop + headerRowH);
    ctx.lineTo(MARGIN_X + TABLE_W, tableTop + headerRowH);
    ctx.moveTo(MARGIN_X, tableTop + headerRowH + numRowH);
    ctx.lineTo(MARGIN_X + TABLE_W, tableTop + headerRowH + numRowH);
    if (slice.isLastPage) {
      ctx.moveTo(MARGIN_X, tableTop + headerRowH + numRowH + dataRowH);
      ctx.lineTo(MARGIN_X + TABLE_W, tableTop + headerRowH + numRowH + dataRowH);
    }
    ctx.stroke();

    // Column vertical lines & headers
    let curX = MARGIN_X;
    ctx.textAlign = 'center';
    for (let i = 0; i < FORM_5462_COLUMNS.length; i++) {
      const col = FORM_5462_COLUMNS[i];
      const w = colWidths[i];

      if (i > 0) {
        ctx.beginPath();
        // In total row, merge cols 1..6 for cleaner summary layout
        const lineBottom = slice.isLastPage && i < 6
          ? tableTop + headerRowH + numRowH + dataRowH
          : tableTop + totalTableH;
        ctx.moveTo(curX, tableTop);
        ctx.lineTo(curX, lineBottom);
        ctx.stroke();
      }

      // Header text (multi-line centered vertically)
      ctx.font = `600 22px ${FONT_FAMILY}`;
      ctx.fillStyle = '#0f172a';
      const headerLines = col.label.split('\n');
      const lineSpacing = 30;
      const startTextY =
        tableTop +
        headerRowH / 2 -
        ((headerLines.length - 1) * lineSpacing) / 2 +
        7;
      headerLines.forEach((hl, li) => {
        ctx.fillText(hl, curX + w / 2, startTextY + li * lineSpacing);
      });

      // Column number (১..৯)
      ctx.font = `600 23px ${FONT_FAMILY}`;
      ctx.fillText(col.num, curX + w / 2, tableTop + headerRowH + 30);

      curX += w;
    }

    // Data Row Content
    const dataTop = tableTop + headerRowH + numRowH + 38;
    const dataLineH = 33;

    // Col 1: Owners & Father/Husband
    ctx.textAlign = 'left';
    ctx.font = `500 23px ${FONT_FAMILY}`;
    ctx.fillStyle = '#0f172a';
    slice.ownerLines.forEach((ol, idx) => {
      ctx.fillText(ol, MARGIN_X + 16, dataTop + idx * dataLineH);
    });

    // Col 4: Dags
    const col4X = MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2];
    ctx.textAlign = 'center';
    ctx.font = `600 23px ${FONT_FAMILY}`;
    slice.dagLines.forEach((dl, idx) => {
      ctx.fillText(dl, col4X + colWidths[3] / 2, dataTop + idx * dataLineH);
    });

    // Total Row (Final page)
    if (slice.isLastPage) {
      const totY = tableTop + headerRowH + numRowH + dataRowH;
      const col7X =
        MARGIN_X +
        colWidths[0] +
        colWidths[1] +
        colWidths[2] +
        colWidths[3] +
        colWidths[4] +
        colWidths[5];
      const col8X = col7X + colWidths[6];
      const col9X = col8X + colWidths[7];

      ctx.textAlign = 'left';
      ctx.font = `500 22px ${FONT_FAMILY}`;
      const recordInfo = `${record.surveyType} জরিপ রেকর্ড · খতিয়ান নং ${enToBnDigits(record.khatianNo)}${
        record.page ? ` · বইয়ের পৃষ্ঠা নং ${enToBnDigits(record.page)}` : ''
      }`;
      ctx.fillText(recordInfo, MARGIN_X + 16, totY + 55);

      ctx.textAlign = 'center';
      ctx.font = `600 23px ${FONT_FAMILY}`;
      ctx.fillText('মোট জমি', col7X + colWidths[6] / 2, totY + 56);

      ctx.font = `700 23px ${FONT_FAMILY}`;
      ctx.fillText(totalFixed, col8X + colWidths[7] / 2, totY + 56);

      // Col 9: কথায়: ...
      ctx.textAlign = 'left';
      ctx.font = `500 20px ${FONT_FAMILY}`;
      const kathaLines = wrapTextCanvas(mCtx, `কথায়: ${totalWords}`, colWidths[8] - 24);
      kathaLines.slice(0, 2).forEach((kl, ki) => {
        ctx.fillText(kl, col9X + 12, totY + 38 + ki * 28);
      });
    }

    // "অনুমোদিত খতিয়ান" / verified label below table
    const stampY = tableTop + totalTableH + 56;
    ctx.textAlign = 'center';
    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText('অনলাইন সংরক্ষিত ও আনলককৃত খতিয়ান অনুলিপি', MARGIN_X + TABLE_W * 0.34, stampY);

    // Special Notes ("বিশেষ দ্রষ্টব্য:") matching Form 5462
    const notesStartY = stampY + 86;
    ctx.textAlign = 'left';
    ctx.font = `600 23px ${FONT_FAMILY}`;
    ctx.fillText('বিশেষ দ্রষ্টব্য:', MARGIN_X, notesStartY);

    ctx.font = `400 21px ${FONT_FAMILY}`;
    ctx.fillStyle = '#1e293b';
    const noteItems = [
      '১। এই খতিয়ানটি অনলাইন তথ্যভাণ্ডার থেকে প্রাপ্ত তথ্যের ভিত্তিতে প্রস্তুত করা হয়েছে। এটি শুধুমাত্র তথ্য দেখার উদ্দেশ্যে ব্যবহারের জন্য। এটি কোনো আইনগতভাবে বৈধ সরকারি খতিয়ান নয় এবং সকল ক্ষেত্রে ব্যবহারযোগ্য নয়। সরকারি ও আইনগত কাজে ব্যবহারের জন্য অনুগ্রহ করে land.gov.bd ওয়েবসাইট থেকে খতিয়ান ডাউনলোড করুন।',
      '২। সরকারি কাজের জন্য সরকারি ওয়েবসাইট থেকে খতিয়ান ডাউনলোড করতে হবে।',
      '৩। ভূমি বিষয়ক যেকোন তথ্য বা পরামর্শের জন্য ১৬১২২ নম্বরে কল করুন।',
      `৪। জরিপের ধরন: ${record.surveyType} · মৌজা: ${moujaName} (জে.এল নং ${enToBnDigits(jlNo)}), উপজেলা: ${upazila}, জেলা: ${district}।`,
      'এই খতিয়ানটি Mondol Telecom Online Services থেকে সংগৃহীত তথ্যের ভিত্তিতে প্রস্তুতকৃত অনুলিপি।',
    ];

    let noteY = notesStartY + 38;
    for (const item of noteItems) {
      const wrapped = wrapTextCanvas(ctx, item, TABLE_W);
      for (const wl of wrapped) {
        ctx.fillText(wl, MARGIN_X, noteY);
        noteY += 31;
      }
    }

    // Bottom right page indicator matching "1/1"
    ctx.textAlign = 'right';
    ctx.font = `500 24px ${FONT_FAMILY}`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${pageIdx + 1}/${slices.length}`, PAGE_W - MARGIN_X, PAGE_H - 64);

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
  });

  const safeSurvey = record.surveyType.replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, '');
  const safeKhatian = bnToEnDigits(record.khatianNo).replace(/[^a-zA-Z0-9_-]+/g, '');
  pdf.save(`khatian-${safeSurvey || 'record'}-${safeKhatian || 'file'}.pdf`);
}
