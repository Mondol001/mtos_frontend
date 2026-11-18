import assert from 'node:assert/strict';
import test from 'node:test';
import type { Mouja } from '../types';
import {
  filterMoujasByLocation,
  getDistrictOptions,
  getDivisionOptions,
  getUpazilaOptions,
} from './bdGeo';

const MOCK_MOUJAS: Mouja[] = [
  {
    id: 'sthal-nawhata-74',
    name: 'স্থল নওহাটা',
    jlNo: '৭৪',
    upazila: 'চৌহালী',
    district: 'সিরাজগঞ্জ',
    division: 'রাজশাহী',
    surveyTypes: ['CS', 'SA'],
  },
  {
    id: 'belkuchi-12',
    name: 'তামাই',
    jlNo: '১২',
    upazila: 'বেলকুচি',
    district: 'সিরাজগঞ্জ',
    division: 'রাজশাহী',
    surveyTypes: ['CS', 'SA', 'RS'],
  },
];

test('getDivisionOptions includes all 8 BD divisions with mouja counts', () => {
  const divs = getDivisionOptions(MOCK_MOUJAS);
  assert.equal(divs.length, 8);
  const raj = divs.find((d) => d.name === 'রাজশাহী');
  assert.equal(raj?.moujaCount, 2);
});

test('getDistrictOptions and getUpazilaOptions cascade accurately', () => {
  const dists = getDistrictOptions('রাজশাহী', MOCK_MOUJAS);
  assert.ok(dists.some((d) => d.name === 'সিরাজগঞ্জ' && d.moujaCount === 2));

  const upazilas = getUpazilaOptions('রাজশাহী', 'সিরাজগঞ্জ', MOCK_MOUJAS);
  assert.ok(upazilas.some((u) => u.name === 'চৌহালী' && u.moujaCount === 1));
  assert.ok(upazilas.some((u) => u.name === 'বেলকুচি' && u.moujaCount === 1));
});

test('filterMoujasByLocation matches mouja name and Bengali/English JL numbers', () => {
  const byUpazila = filterMoujasByLocation(MOCK_MOUJAS, 'রাজশাহী', 'সিরাজগঞ্জ', 'চৌহালী');
  assert.equal(byUpazila.length, 1);
  assert.equal(byUpazila[0].name, 'স্থল নওহাটা');

  const byJlEn = filterMoujasByLocation(MOCK_MOUJAS, 'রাজশাহী', 'সিরাজগঞ্জ', 'চৌহালী', '74');
  assert.equal(byJlEn.length, 1);

  const byJlBn = filterMoujasByLocation(MOCK_MOUJAS, 'রাজশাহী', 'সিরাজগঞ্জ', 'চৌহালী', '৭৪');
  assert.equal(byJlBn.length, 1);
});
