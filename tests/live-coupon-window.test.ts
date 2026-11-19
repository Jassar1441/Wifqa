import test from 'node:test';
import assert from 'node:assert/strict';
import { restrictLiveCouponToCurrentFetch } from '../src/live-coupon.ts';
import type { Offer } from '../src/types.ts';

const offer = (checkedAt: string): Offer => ({
  dataKind: 'live', coupon: { amount: 20, verified: true },
  evidence: { coupon: { status: 'confirmed', source: 'https://merchant.example/coupon', checkedAt } },
} as Offer);

test('live coupon proof window includes exact start and end boundaries', () => {
  const start = new Date('2026-11-19T10:00:00Z');
  const end = new Date('2026-11-19T10:00:05Z');
  assert.equal(restrictLiveCouponToCurrentFetch(offer(start.toISOString()), start, end).coupon?.verified, true);
  assert.equal(restrictLiveCouponToCurrentFetch(offer(end.toISOString()), start, end).coupon?.verified, true);
});

test('live coupon proof fails closed for invalid fetch windows', () => {
  const validProof = offer('2026-11-19T10:00:02Z');
  const start = new Date('invalid');
  const end = new Date('2026-11-19T10:00:05Z');
  assert.equal(restrictLiveCouponToCurrentFetch(validProof, start, end).coupon?.verified, false);
  const reversedStart = new Date('2026-11-19T10:00:05Z');
  const reversedEnd = new Date('2026-11-19T10:00:00Z');
  assert.equal(restrictLiveCouponToCurrentFetch(validProof, reversedStart, reversedEnd).coupon?.verified, false);
});

test('non-live offers are unchanged even when the fetch window is invalid', () => {
  const source = { ...offer('2026-11-19T10:00:02Z'), dataKind: 'synthetic' } as Offer;
  assert.strictEqual(restrictLiveCouponToCurrentFetch(source, new Date('invalid'), new Date('invalid')), source);
});
