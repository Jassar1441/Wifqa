import test from 'node:test';
import assert from 'node:assert/strict';
import { compareExternal, offerIssues } from '../src/ingest.ts';
import { demoOffers, demoRequest } from '../src/fixtures.ts';

const now = new Date('2026-11-25T06:00:00.000Z');
const base = () => structuredClone(demoOffers(now)[0]);

test('external delivery and return claims reject invalid day ranges and fractional halalas', () => {
  const cases: [string, (offer: any) => void][] = [
    ['delivery.minDays', offer => { offer.delivery.minDays = 1.5; }],
    ['delivery.maxDays', offer => { offer.delivery.maxDays = -1; }],
    ['delivery.maxDays', offer => { offer.delivery.maxDays = Number.MAX_SAFE_INTEGER + 1; }],
    ['delivery.range', offer => { offer.delivery.minDays = 8; offer.delivery.maxDays = 7; }],
    ['returns.days', offer => { offer.returns.days = 14.5; }],
    ['returns.days', offer => { offer.returns.days = -1; }],
    ['returns.days', offer => { offer.returns.days = Number.MAX_SAFE_INTEGER + 1; }],
    ['returns.cost', offer => { offer.returns.cost = 0.001; }],
    ['returns.cost', offer => { offer.returns.cost = -0.01; }],
  ];

  for (const [path, mutate] of cases) {
    const invalid = base() as any;
    mutate(invalid);
    const result = compareExternal([invalid], demoRequest(), now);
    assert.equal(result.result?.ranking.length, 0, `${path} must not enter ranking`);
    assert.ok(result.issues.some(issue => issue.path === path), `missing issue for ${path}`);
  }
});

test('valid whole-day and exact-halalah values pass while unknown nulls remain explicit', () => {
  const valid = base() as any;
  valid.delivery = { minDays: 0, maxDays: 7, status: 'estimated' };
  valid.returns = { days: 14, cost: 0.01, notes: 'سياسة إرجاع تجريبية', status: 'confirmed' };
  assert.deepEqual(offerIssues(valid), []);

  const unknown = base() as any;
  unknown.delivery = { minDays: null, maxDays: null, status: 'unknown' };
  unknown.returns = { days: null, cost: null, notes: 'غير موثق', status: 'unknown' };
  assert.deepEqual(offerIssues(unknown), []);
});
