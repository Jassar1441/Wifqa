import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, returnsText } from '../src/compare.ts';
import type { Offer, Request } from '../src/types.ts';

const now = new Date('2026-11-23T08:00:00.000Z');
const source = 'https://merchant.example/widget';
const proof = () => ({ status: 'confirmed' as const, source, checkedAt: now.toISOString() });
const request: Request = {
  identity: { model: 'Widget X', condition: 'new', quantity: 1 },
  mustHave: {},
  country: 'SA', city: 'Abha', currency: 'SAR',
  priority: 'balanced', allowAlternatives: false,
};
function offer(id: string, returns: Offer['returns']): Offer {
  return {
    id, seller: 'Test seller', title: 'Widget X',
    identity: { model: 'Widget X', condition: 'new', quantity: 1 },
    specifications: {}, currency: 'SAR', price: 100,
    shippingCost: 0, taxIncluded: true, tax: null, fees: 0,
    availability: 'in_stock',
    shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays: 2, maxDays: 2, status: 'confirmed' },
    returns,
    sellerEvidence: { verifiedIdentity: true, status: 'confirmed' },
    evidence: { identity: proof(), availability: proof(), shipping: proof(), cost: proof(), delivery: proof(), returns: proof(), seller: proof() },
    dataKind: 'live', url: source,
  };
}

test('fractional return-policy days are not displayed as verified', () => {
  const fractional = offer('fractional', { days: 14.5, cost: 0, notes: '14.5-day return', status: 'confirmed' });
  assert.equal(returnsText(fractional, now), 'سياسة الإرجاع أو تكلفته غير موثقة');
});

test('fractional return-policy days receive no balanced-ranking bonus', () => {
  const fractional = offer('fractional', { days: 14.5, cost: 0, notes: '14.5-day return', status: 'confirmed' });
  const unknown = offer('unknown', { days: null, cost: null, notes: '', status: 'unknown' });
  const result = compare([fractional, unknown], request, now);
  const scores = new Map(result.assessed.map(a => [a.offer.id, a.balanceScore]));
  assert.equal(scores.get('fractional'), scores.get('unknown'));
});

test('valid whole-day return policy keeps its ranking bonus; blank notes do not', () => {
  const valid = offer('valid', { days: 14, cost: 0, notes: '14-day return', status: 'confirmed' });
  const blank = offer('blank', { days: 14, cost: 0, notes: '   ', status: 'confirmed' });
  const result = compare([valid, blank], request, now);
  const scores = new Map(result.assessed.map(a => [a.offer.id, a.balanceScore]));
  assert.ok(scores.get('valid')! > scores.get('blank')!);
  assert.equal(returnsText(blank, now), 'سياسة الإرجاع أو تكلفته غير موثقة');
});
