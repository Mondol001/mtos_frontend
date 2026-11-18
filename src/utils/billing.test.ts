import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDebitBalance,
  canAfford,
  formatBanRemainingBn,
  formatCountdownBn,
  getEffectiveUserRestriction,
  getRemainingUnlockMs,
  isSuperAdminEmail,
  isUnlockActive,
  shouldDebitOnServiceAccept,
  shouldRefundOnServiceCancel,
  validateBkashPhone,
  validateDepositAmount,
  validateTrxId,
  validateUnlockDuration,
} from './billing.ts';

test('isSuperAdminEmail strictly checks mohammadiaqub@gmail.com and verified status', () => {
  assert.equal(isSuperAdminEmail('mohammadiaqub@gmail.com', true), true);
  assert.equal(isSuperAdminEmail('  MOHAMMADIAQUB@gmail.com ', true), true);
  assert.equal(isSuperAdminEmail('mohammadiaqub@gmail.com', false), false);
  assert.equal(isSuperAdminEmail('other@gmail.com', true), false);
  assert.equal(isSuperAdminEmail(null, true), false);
});

test('canAfford and calculateDebitBalance enforce sufficient funds', () => {
  assert.equal(canAfford(10, 10), true);
  assert.equal(canAfford(9, 10), false);
  assert.equal(canAfford(300, 300), true);
  assert.equal(calculateDebitBalance(310, 300), 10);
  assert.throws(() => calculateDebitBalance(5, 10));
});

test('validateBkashPhone validates Bangladeshi mobile numbers including Bengali digits', () => {
  const ok1 = validateBkashPhone('01712345678');
  assert.equal(ok1.valid, true);
  assert.equal(ok1.normalized, '01712345678');

  const ok2 = validateBkashPhone('+88০১৭১২৩৪৫৬৭৮');
  assert.equal(ok2.valid, true);
  assert.equal(ok2.normalized, '01712345678');

  const bad = validateBkashPhone('01234');
  assert.equal(bad.valid, false);
});

test('validateTrxId and validateDepositAmount enforce bounds', () => {
  assert.equal(validateTrxId('bl82k90p1a').valid, true);
  assert.equal(validateTrxId('bl82k90p1a').normalized, 'BL82K90P1A');
  assert.equal(validateTrxId('123').valid, false);

  assert.equal(validateDepositAmount('৫০০').valid, true);
  assert.equal(validateDepositAmount('৫০০').amount, 500);
  assert.equal(validateDepositAmount('5').valid, false);
});

test('timed unlock helpers detect active vs expired unlocks and format Bengali countdown', () => {
  const base = 1_700_000_000_000;
  const unlock = { expiresAtMs: base + 10 * 60_000, durationMinutes: 10 };

  assert.equal(isUnlockActive(unlock, base + 60_000), true);
  assert.equal(getRemainingUnlockMs(unlock, base + 15_000), 9 * 60_000 + 45_000);
  assert.equal(formatCountdownBn(9 * 60_000 + 45_000), '০৯:৪৫');
  assert.equal(formatCountdownBn(65 * 60_000), '১:০৫:০০');

  // At or past expiry, the khatian re-locks automatically
  assert.equal(isUnlockActive(unlock, base + 10 * 60_000), false);
  assert.equal(isUnlockActive(unlock, base + 11 * 60_000), false);
  assert.equal(getRemainingUnlockMs(unlock, base + 11 * 60_000), 0);
  assert.equal(formatCountdownBn(0), '০০:০০');
});

test('validateUnlockDuration supports Bengali digits and bounds 1..1440', () => {
  const ok = validateUnlockDuration('১৫');
  assert.equal(ok.valid, true);
  assert.equal(ok.minutes, 15);

  assert.equal(validateUnlockDuration('0').valid, false);
  assert.equal(validateUnlockDuration('2000').valid, false);
});

test('service order billing state transitions debit on accept and refund on paid cancel', () => {
  assert.equal(
    shouldDebitOnServiceAccept({ status: 'pending', paymentDeducted: false }),
    true
  );
  assert.equal(
    shouldDebitOnServiceAccept({ status: 'pending', paymentDeducted: true }),
    false
  );
  assert.equal(
    shouldDebitOnServiceAccept({ status: 'accepted', paymentDeducted: false }),
    false
  );

  assert.equal(
    shouldRefundOnServiceCancel({ status: 'pending', paymentDeducted: false }),
    false
  );
  assert.equal(
    shouldRefundOnServiceCancel({ status: 'accepted', paymentDeducted: true }),
    true
  );
  assert.equal(
    shouldRefundOnServiceCancel({ status: 'pending', paymentDeducted: undefined }),
    true
  );
  assert.equal(
    shouldRefundOnServiceCancel({ status: 'completed', paymentDeducted: true }),
    false
  );
});

test('getEffectiveUserRestriction handles active, disabled, suspended, and expiring temporary bans', () => {
  const now = 1_700_000_000_000;

  assert.equal(getEffectiveUserRestriction(null, now).isBlocked, false);
  assert.equal(
    getEffectiveUserRestriction({ accountStatus: 'active' }, now).isBlocked,
    false
  );

  const disabled = getEffectiveUserRestriction(
    { accountStatus: 'disabled', restrictionReason: 'ভুয়া তথ্য' },
    now
  );
  assert.equal(disabled.isBlocked, true);
  assert.equal(disabled.effectiveStatus, 'disabled');
  assert.equal(disabled.reason, 'ভুয়া তথ্য');

  const suspended = getEffectiveUserRestriction(
    { accountStatus: 'suspended', restrictionReason: 'যাচাই বাকি' },
    now
  );
  assert.equal(suspended.isBlocked, true);
  assert.equal(suspended.effectiveStatus, 'suspended');

  const activeBan = getEffectiveUserRestriction(
    {
      accountStatus: 'banned',
      banExpiresAtMs: now + 3 * 24 * 60 * 60_000,
      restrictionReason: 'নিয়ম ভঙ্গ',
    },
    now
  );
  assert.equal(activeBan.isBlocked, true);
  assert.equal(activeBan.effectiveStatus, 'banned');
  assert.equal(formatBanRemainingBn(activeBan.remainingMs), '৩ দিন');

  const expiredBan = getEffectiveUserRestriction(
    {
      accountStatus: 'banned',
      banExpiresAtMs: now - 1000,
      restrictionReason: 'মেয়াদ শেষ',
    },
    now
  );
  assert.equal(expiredBan.isBlocked, false);
  assert.equal(expiredBan.effectiveStatus, 'active');
});


