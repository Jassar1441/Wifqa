import test from 'node:test';
import assert from 'node:assert/strict';
import { restrictLiveCouponToCurrentFetch } from '../src/live-coupon.ts';
import type { Offer } from '../src/types.ts';
const start = new Date('2026-10-24T14:00:00Z');
const end = new Date('2026-10-24T14:00:05Z');
const offer = (checkedAt: string, dataKind: Offer['dataKind'] = 'live'): Offer => ({
  dataKind, coupon: { amount: 20, verified: true },
  evidence: { coupon: { status: 'confirmed', source: 'https://merchant.example/coupon', checkedAt } },
} as Offer);
test('old coupon evidence cannot reduce price in a new live request', () => {
  const source = offer('2026-10-24T13:59:59Z');
  const result = restrictLiveCouponToCurrentFetch(source, start, end);
  assert.equal(result.coupon?.verified, false);
  assert.equal(source.coupon?.verified, true, 'original offer must not be mutated');
});
test('current-request coupon proof retains eligibility for separate scope validation', () => {
  const source = offer('2026-10-24T14:00:03Z');
  assert.strictEqual(restrictLiveCouponToCurrentFetch(source, start, end), source);
});
test('future coupon proof is not counted', () => {
  assert.equal(restrictLiveCouponToCurrentFetch(offer('2026-10-24T14:00:06Z'), start, end).coupon?.verified, false);
});
test('invalid calendar proof is not counted', () => {
  assert.equal(restrictLiveCouponToCurrentFetch(offer('2026-02-30T14:00:01Z'), start, end).coupon?.verified, false);
});
test('synthetic fixtures are not changed by live-only safeguard', () => {
  const source = offer('2026-10-23T14:00:00Z', 'synthetic');
  assert.strictEqual(restrictLiveCouponToCurrentFetch(source, start, end), source);
});
test('offer without coupon stays unchanged', () => {
  const source = offer('2026-10-23T14:00:00Z'); delete source.coupon;
  assert.strictEqual(restrictLiveCouponToCurrentFetch(source, start, end), source);
});
