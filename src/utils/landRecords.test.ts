import assert from 'node:assert/strict';
import test from 'node:test';
import type { KhatianRecord } from '../types';
import {
  acresToShatak,
  bnToEnDigits,
  enToBnDigits,
  findMatchedDagsInRecord,
  getPreviewRecord,
  isDagHighlighted,
  makeUnlockId,
  searchKhatianRecords,
} from './landRecords';

const SAMPLE_RECORDS: KhatianRecord[] = [
  {
    id: 'cs-1',
    moujaId: 'sthal-nawhata',
    surveyType: 'CS',
    khatianNo: '১',
    owners: ['জমিদারী পং', 'রায় বনমালী রায়বাহাদুর', 'হরিচরণ ভট্টাচার্য্য'],
    fatherOrHusband: 'পিং রায় বনমালী রায়বাহাদুর',
    dags: ['২৫১৪', '২৭১৩', '২৭৪৪', '৩৮০৯/৪১৬০'],
    landAcres: '১০৬৬.৪৮০০',
    page: 1,
  },
  {
    id: 'cs-2',
    moujaId: 'sthal-nawhata',
    surveyType: 'CS',
    khatianNo: '২',
    owners: ['সত্যাপ্রিয় ভট্টাচার্য্য', 'শ্যামলাল ভট্টাচার্য্য'],
    fatherOrHusband: 'পিং দিগিন্দ্রচন্দ্র ভট্টাচার্য্য',
    dags: ['২৮৭৯', '২৮৮০'],
    landAcres: '১.৪৮০০',
    page: 1,
  },
  {
    id: 'sa-241',
    moujaId: 'sthal-nawhata',
    surveyType: 'SA',
    khatianNo: '২৪১',
    owners: [],
    fatherOrHusband: '',
    dags: ['৫', '৮', '৪৫'],
    landAcres: '',
    page: 1,
  },
];

test('bnToEnDigits and enToBnDigits round-trip accurately', () => {
  assert.equal(bnToEnDigits('২৫১৪/৪১৬০'), '2514/4160');
  assert.equal(enToBnDigits('300'), '৩০০');
  assert.equal(enToBnDigits(10), '১০');
});

test('getPreviewRecord hides extra owners, extra dags, father name, and land area', () => {
  const preview = getPreviewRecord(SAMPLE_RECORDS[0]);
  assert.equal(preview.khatianNo, '১');
  assert.equal(preview.firstOwnerName, 'জমিদারী পং');
  assert.equal(preview.firstDagNo, '২৫১৪');
  assert.equal(preview.extraOwnersCount, 2);
  assert.equal(preview.extraDagsCount, 3);
  assert.equal(preview.hasFatherInfo, true);
  assert.equal(preview.hasLandArea, true);
});

test('searchKhatianRecords matches both English and Bengali dag & khatian queries', () => {
  const byEnDag = searchKhatianRecords(SAMPLE_RECORDS, {
    moujaId: 'sthal-nawhata',
    surveyType: 'CS',
    query: '2713',
  });
  assert.equal(byEnDag.length, 1);
  assert.equal(byEnDag[0].khatianNo, '১');

  const byBatDag = searchKhatianRecords(SAMPLE_RECORDS, {
    moujaId: 'sthal-nawhata',
    surveyType: 'CS',
    query: '4160',
  });
  assert.equal(byBatDag.length, 1);
  assert.equal(byBatDag[0].id, 'cs-1');

  const byOwner = searchKhatianRecords(SAMPLE_RECORDS, {
    moujaId: 'sthal-nawhata',
    surveyType: 'CS',
    query: 'শ্যামলাল',
    searchField: 'owner',
  });
  assert.equal(byOwner.length, 1);
  assert.equal(byOwner[0].khatianNo, '২');

  const saByDag = searchKhatianRecords(SAMPLE_RECORDS, {
    moujaId: 'sthal-nawhata',
    surveyType: 'SA',
    query: '8',
    searchField: 'dag',
  });
  assert.equal(saByDag.length, 1);
  assert.equal(saByDag[0].khatianNo, '২৪১');
});

test('makeUnlockId produces safe Firestore doc IDs without slashes', () => {
  const id = makeUnlockId('sthal-nawhata', 'CS', '৯১২/১');
  assert.equal(id.includes('/'), false);
  assert.equal(id, 'sthal-nawhata__CS__912_slash_1');
});

test('acresToShatak converts acres cleanly', () => {
  assert.equal(acresToShatak('১.৪৮০০'), '১৪৮.০০ শতক');
});

test('isDagHighlighted and findMatchedDagsInRecord highlight searched dag across Bengali/English and bata dags', () => {
  const dags = ['৫৮', '২৫৮', '২৫১৪', '৩৮০৯/৪১৬০'];

  // Exact match suppresses noisy partial matches like '২৫৮' when searching '58'
  assert.equal(isDagHighlighted('৫৮', dags, '58', 'dag'), true);
  assert.equal(isDagHighlighted('২৫৮', dags, '58', 'dag'), false);
  assert.deepEqual(findMatchedDagsInRecord(dags, '58', 'all'), ['৫৮']);

  // Bata dag part match in English digits
  assert.equal(isDagHighlighted('৩৮০৯/৪১৬০', dags, '4160', 'all'), true);
  assert.deepEqual(findMatchedDagsInRecord(dags, '4160', 'all'), ['৩৮০৯/৪১৬০']);

  // Partial fallback when no exact match exists
  assert.equal(isDagHighlighted('২৫১৪', dags, '২৫১', 'dag'), true);

  // Disabled when searching specifically by owner or khatian
  assert.equal(isDagHighlighted('৫৮', dags, '58', 'owner'), false);
  assert.deepEqual(findMatchedDagsInRecord(dags, '58', 'khatian'), []);
});

test('normalizeBnText matches Bengali spelling variants and digits', async () => {
  const mod = await import('./landRecords');
  assert.equal(mod.normalizeBnText('রহীম'), mod.normalizeBnText('রহিম'));
  assert.equal(mod.normalizeBnText('মৌজা ২৫১৪'), 'মোজা 2514');
  const det1 = mod.makeDeterministicKhatianId('sthal-nawhata-74', 'CS', '৯১২/১');
  const det2 = mod.makeDeterministicKhatianId('sthal-nawhata-74', 'CS', '912/1');
  assert.equal(det1, det2);
  assert.match(det1, /^[a-zA-Z0-9_-]+$/);
  const code = mod.buildKhatianVerificationCode('sthal-nawhata-74', 'CS', '২৪১');
  assert.match(code, /^MTOS-CS-241-[A-Z0-9]+$/);
});

