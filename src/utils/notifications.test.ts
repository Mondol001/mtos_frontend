import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMapPriceChangeNotification,
  buildNewServiceNotification,
  buildPricingChangeNotifications,
  buildServicePriceChangeNotification,
  countUnreadNotifications,
  formatRelativeTimeBn,
  isNotificationUnread,
} from './notifications';
import type { AppNotification, PricingSettings } from '../types';

const basePricing: PricingSettings = {
  khatianPrice: 10,
  defaultMapPrice: 300,
  bkashNumber: '01841246223',
  bkashAccountType: 'Personal (Send Money)',
  unlockDurationMinutes: 10,
  khatianServiceEnabled: true,
  mapServiceEnabled: true,
};

test('buildPricingChangeNotifications emits rate_drop when khatianPrice decreases', () => {
  const list = buildPricingChangeNotifications(
    basePricing,
    { ...basePricing, khatianPrice: 7 },
    1000
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].category, 'rate_drop');
  assert.equal(list[0].oldPrice, 10);
  assert.equal(list[0].newPrice, 7);
  assert.match(list[0].title, /কমেছে/);
  assert.match(list[0].message, /৳১০.*৳৭/);
});

test('buildPricingChangeNotifications emits rate_increase when prices increase', () => {
  const list = buildPricingChangeNotifications(
    basePricing,
    { ...basePricing, khatianPrice: 15, defaultMapPrice: 350 },
    2000
  );
  assert.equal(list.length, 2);
  assert.equal(list[0].category, 'rate_increase');
  assert.equal(list[1].category, 'rate_increase');
  assert.match(list[0].title, /বেড়েছে/);
  assert.match(list[1].message, /৳৩০০.*৳৩৫০/);
});

test('buildPricingChangeNotifications detects timer & core service toggle changes', () => {
  const list = buildPricingChangeNotifications(
    basePricing,
    {
      ...basePricing,
      unlockDurationMinutes: 15,
      khatianServiceEnabled: false,
    },
    3000
  );
  assert.equal(list.length, 2);
  assert.equal(list[0].category, 'service_status');
  assert.equal(list[1].category, 'service_status');
});

test('buildMapPriceChangeNotification & buildServicePriceChangeNotification handle drop, increase, and no-op', () => {
  assert.equal(buildMapPriceChangeNotification('সিট ১', 300, 300), null);
  const drop = buildMapPriceChangeNotification('সিট ১', 300, 220, 5000);
  assert.ok(drop);
  assert.equal(drop.category, 'rate_drop');
  assert.equal(drop.targetTab, 'maps');

  const inc = buildServicePriceChangeNotification('নামজারি', 100, 150, 6000);
  assert.ok(inc);
  assert.equal(inc.category, 'rate_increase');
  assert.equal(inc.targetTab, 'services');

  const added = buildNewServiceNotification('পর্চা প্রিন্ট', 50, 7000);
  assert.equal(added.category, 'service_status');
  assert.match(added.message, /৳৫০/);
});

test('unread counting and relative Bengali timestamps work deterministically', () => {
  const items: AppNotification[] = [
    {
      id: 'n1',
      title: '১',
      message: 'ম্যাসেজ ১',
      category: 'rate_drop',
      createdAtMs: 1000,
    },
    {
      id: 'n2',
      title: '২',
      message: 'ম্যাসেজ ২',
      category: 'rate_increase',
      createdAtMs: 3000,
    },
  ];
  const readSet = new Set(['n2']);
  assert.equal(isNotificationUnread(items[0], readSet, 0), true);
  assert.equal(isNotificationUnread(items[1], readSet, 0), false);
  assert.equal(countUnreadNotifications(items, readSet, 0), 1);
  assert.equal(countUnreadNotifications(items, new Set(), 3000), 0);

  assert.equal(formatRelativeTimeBn(100_000, 120_000), 'এইমাত্র');
  assert.equal(formatRelativeTimeBn(100_000, 100_000 + 5 * 60_000), '৫ মিনিট আগে');
  assert.equal(formatRelativeTimeBn(100_000, 100_000 + 2 * 3600_000), '২ ঘণ্টা আগে');
});
