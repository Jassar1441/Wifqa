import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, deliveryText } from '../src/compare.ts';
import type { Offer, Request } from '../src/types.ts';

const now = new Date('2026-11-20T07:00:00.000Z');
const source = 'https://merchant.example/airpods-4';
const proof = { status: 'confirmed' as const, source, checkedAt: now.toISOString() };

const request: Request = {
  identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
  mustHave: {},
  country: 'SA',
  city: 'Abha',
  currency: 'SAR',
  priority: 'fastest',
  allowAlternatives: false,
};

function offer(id: string, minDays: number | null, maxDays: number | null): Offer {
  return {
    id,
    seller: 'Synthetic merchant',
    title: 'AirPods 4 test offer',
    identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
    specifications: {},
    currency: 'SAR',
    price: 450,
    shippingCost: 25,
    taxIncluded: true,
    tax: null,
    fees: 0,
    availability: 'in_stock',
    shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays, maxDays, status: 'confirmed' },
    returns: { days: null, cost: null, notes: 'غير موثق', status: 'unknown' },
    sellerEvidence: { verifiedIdentity: false, status: 'unknown' },
    evidence: {
      identity: proof,
      cost: proof,
      availability: proof,
      shipping: proof,
      delivery: proof,
    },
    dataKind: 'synthetic',
  };
}

test('fractional delivery days are not displayed as verified', () => {
  assert.equal(
    deliveryText(offer('fractional', 1.5, 2), now),
    'موعد الوصول غير موثق أو يحتاج تحققًا',
  );
});

test('fastest ranking excludes fractional, negative, unsafe, and reversed day ranges', () => {
  const invalidRanges: [number, number][] = [
    [1.5, 2],
    [-1, 2],
    [1, Number.MAX_SAFE_INTEGER + 1],
    [3, 2],
  ];
  for (const [minDays, maxDays] of invalidRanges) {
    const result = compare([offer(`invalid-${minDays}-${maxDays}`, minDays, maxDays)], request, now);
    assert.equal(result.ranking.length, 0, `range ${minDays}–${maxDays} must not rank as fastest`);
    assert.equal(result.winner, null);
  }
});

test('valid whole-day delivery stays rankable and beats an invalid ETA in balanced ranking', () => {
  const valid = offer('valid', 1, 2);
  const invalid = offer('fractional', 1.5, 2);
  assert.deepEqual(compare([valid], request, now).ranking.map(a => a.offer.id), ['valid']);

  const balanced = { ...request, priority: 'balanced' as const };
  const result = compare([invalid, valid], balanced, now);
  assert.equal(result.ranking[0]?.offer.id, 'valid');
});
