import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKhatianAiPrompt,
  parseBulkKhatianJson,
} from './bulkImportPrompt';

test('buildKhatianAiPrompt includes mouja, JL, survey context and required schema keys', () => {
  const prompt = buildKhatianAiPrompt({
    moujaName: 'স্থল নওহাটা',
    jlNo: '৭৪',
    surveyType: 'RS',
  });

  assert.match(prompt, /স্থল নওহাটা/);
  assert.match(prompt, /জেএল নং: ৭৪/);
  assert.match(prompt, /জরিপের ধরন: RS/);
  for (const key of [
    '"khatianNo"',
    '"owners"',
    '"fatherOrHusband"',
    '"dags"',
    '"landAcres"',
    '"page"',
  ]) {
    assert.ok(prompt.includes(key), `Missing key ${key}`);
  }
});

test('parseBulkKhatianJson strips markdown code fences and maps records cleanly without undefined page', () => {
  const aiOutput = [
    '```json',
    '[',
    '  {',
    '    "khatianNo": "২৬৬",',
    '    "owners": ["দং আব্দুর রহমান", "দং করিম"],',
    '    "fatherOrHusband": "পিং মজিবর",',
    '    "dags": ["১০১", "১০২"],',
    '    "landAcres": "২.৩৫০০",',
    '    "page": 4',
    '  },',
    '  {',
    '    "khatianNo": "২৬৭",',
    '    "owners": "একক মালিক",',
    '    "dags": "২০১, ২০২"',
    '  }',
    ']',
    '```',
  ].join('\n');

  const records = parseBulkKhatianJson(aiOutput, 'mouja-rs-1', 'RS');
  assert.equal(records.length, 2);
  assert.deepEqual(records[0], {
    moujaId: 'mouja-rs-1',
    surveyType: 'RS',
    khatianNo: '২৬৬',
    owners: ['দং আব্দুর রহমান', 'দং করিম'],
    fatherOrHusband: 'পিং মজিবর',
    dags: ['১০১', '১০২'],
    landAcres: '২.৩৫০০',
    page: 4,
  });
  assert.equal('page' in records[1], false);
  assert.deepEqual(records[1].owners, ['একক মালিক']);
  assert.deepEqual(records[1].dags, ['২০১', '২০২']);
});

test('parseBulkKhatianJson rejects invalid or empty JSON with clear Bengali messages', () => {
  assert.throws(() => parseBulkKhatianJson('not json', 'm1', 'CS'), /পার্স করতে সমস্যা/);
  assert.throws(() => parseBulkKhatianJson('[]', 'm1', 'CS'), /সঠিক JSON অ্যারে/);
});
