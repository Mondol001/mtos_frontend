import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acresToWordsBn,
  buildDagLines,
  buildOwnerLines,
  formatAcresFixedBn,
  paginateKhatianSlices,
} from './khatianPdf.ts';
import type { KhatianRecord } from '../types.ts';

test('acresToWordsBn converts Bengali and English decimal acres into Form 5462 Bengali words', () => {
  assert.equal(
    acresToWordsBn('0.800000'),
    '০ একর ৮০ শতক ০০ অযুতাংশ ০০ লক্ষাংশ'
  );
  assert.equal(
    acresToWordsBn('০০.৮০০০০০'),
    '০ একর ৮০ শতক ০০ অযুতাংশ ০০ লক্ষাংশ'
  );
  assert.equal(
    acresToWordsBn('1.2550'),
    '১ একর ২৫ শতক ৫০ অযুতাংশ ০০ লক্ষাংশ'
  );
  assert.equal(formatAcresFixedBn('0.8'), '০০.৮০০০০০');
});

test('buildOwnerLines, buildDagLines, and paginateKhatianSlices preserve and paginate multi-owner khatians', () => {
  const rec: KhatianRecord = {
    id: 'sa-266',
    moujaId: 'sthal',
    surveyType: 'SA',
    khatianNo: '২৬৬',
    owners: ['দং গোলাম রেজ্জাক', 'গোলাম রব্বানী', 'গোলাম মোস্তফা'],
    fatherOrHusband: 'পিং সবেদর মিঞা',
    dags: ['১১', '৪৫১'],
    landAcres: '০.৮০০০',
  };

  const ownerLines = buildOwnerLines(rec);
  assert.equal(ownerLines.length, 4);
  assert.equal(ownerLines[3], 'পিতা/স্বামী: পিং সবেদর মিঞা');

  const dagLines = buildDagLines(rec, 1);
  assert.deepEqual(dagLines, ['১১', '৪৫১']);

  const singlePage = paginateKhatianSlices(ownerLines, dagLines, 16);
  assert.equal(singlePage.length, 1);
  assert.equal(singlePage[0].isLastPage, true);

  const manyOwners = Array.from({ length: 22 }, (_, i) => `মালিক ${i + 1}`);
  const twoPages = paginateKhatianSlices(manyOwners, dagLines, 16);
  assert.equal(twoPages.length, 2);
  assert.equal(twoPages[0].isLastPage, false);
  assert.equal(twoPages[1].isLastPage, true);
  assert.equal(twoPages[1].ownerLines.length, 6);
});
