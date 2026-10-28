import test from 'node:test';
import assert from 'node:assert/strict';
import { sameProductEvidenceSource } from '../../src/live-proof.ts';
import { assess } from '../../src/compare.ts';
import type { Offer, Request } from '../../src/types.ts';

const now = new Date('2026-10-28T14:00:00Z');
const url = 'https://merchant.example/p?variant=no-anc';
const request: Request = {
  identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
  mustHave: {}, country: 'SA', city: 'Abha', currency: 'SAR',
  priority: 'cheapest', allowAlternatives: false,
};
function offer(): Offer {
  const proof = { status: 'confirmed' as const, source: url, checkedAt: now.toISOString() };
  return {
    id: 'offer-1', title: 'Fixture only', seller: 'Test merchant',
    identity: { ...request.identity }, specifications: {},
    price: 450, shippingCost: 20, fees: 0, taxIncluded: true, tax: null,
    currency: 'SAR', availability: 'in_stock',
    shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays: null, maxDays: null, status: 'unknown' },
    returns: { days: null, cost: null, notes: '', status: 'unknown' },
    sellerEvidence: { verifiedIdentity: false, status: 'unknown' },
    evidence: { identity: proof, availability: proof, shipping: proof, cost: proof },
    dataKind: 'live', url,
  };
}

test('QA R32: conflicting duplicate variant must not count as unambiguous proof', () => {
  const ambiguous = 'https://merchant.example/p?variant=anc&variant=no-anc';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});
test('QA R32: conflicting duplicate productId must not count as unambiguous proof', () => {
  const ambiguous = 'https://merchant.example/p?productId=1&productId=2';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});
test('QA R32: ordinary tracking parameter remains accepted', () => {
  assert.equal(sameProductEvidenceSource(url + '&utm_campaign=qa', url), true);
});
test('QA R32: fractional halala in product price must exclude offer', () => {
  const o = offer(); o.price = 450.005;
  assert.equal(assess(o, request, now).state, 'excluded');
});
test('QA R32: fractional halala in shipping cost must exclude offer', () => {
  const o = offer(); o.shippingCost = 0.001;
  assert.equal(assess(o, request, now).state, 'excluded');
});
test('QA R32: valid two-decimal amounts remain eligible', () => {
  const o = offer(); o.price = 450.25; o.shippingCost = 20.01;
  const a = assess(o, request, now);
  assert.equal(a.state, 'eligible');
  assert.equal(a.total, 470.26);
});
