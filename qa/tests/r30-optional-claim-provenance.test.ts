import test from 'node:test';
import assert from 'node:assert/strict';
import { gateLiveOffers } from '../src/live-offer-gate.ts';
import type { Offer, Request } from '../src/types.ts';

// Independent QA regression cases for PR #25. Not yet executed inside full repository.
const at = '2026-10-27T14:00:00.000Z';
const clock = new Date(at);
const productUrl = 'https://merchant.example/product-a?variant=red';
const proof = (source = productUrl) => ({ status: 'confirmed' as const, source, checkedAt: at });
const request: Request = {
  identity: { model: 'Product A', condition: 'new', quantity: 1 },
  mustHave: { version: { equals: 'red' } },
  country: 'SA', city: 'Abha', currency: 'SAR', priority: 'fastest', allowAlternatives: false,
};
function offer(): Offer {
  return {
    id: 'a', seller: 'Marketplace seller Z', title: 'Product A red',
    identity: { model: 'Product A', condition: 'new', quantity: 1 },
    specifications: { version: 'red' }, currency: 'SAR',
    price: 100, shippingCost: 0, taxIncluded: true, tax: null, fees: 0,
    availability: 'in_stock', shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays: 1, maxDays: 1, status: 'confirmed' },
    returns: { days: 14, cost: 0, notes: '14 days', status: 'confirmed' },
    sellerEvidence: { verifiedIdentity: true, status: 'confirmed' },
    evidence: { identity: proof(), 'spec:version': proof(), cost: proof(), availability: proof(), shipping: proof(), delivery: proof(), returns: proof(), seller: proof() },
    dataKind: 'live', url: productUrl,
  };
}
test('control: valid product-specific delivery proof stays confirmed', () => {
  const result = gateLiveOffers([offer()], request, clock, clock);
  assert.equal((result.offers[0] as Offer).delivery.status, 'confirmed');
  assert.equal(result.issues.length, 0);
});
test('R30-A: other-product delivery evidence cannot confirm this product ETA', () => {
  const invalid = offer();
  invalid.evidence.delivery = proof('https://merchant.example/product-b?variant=blue');
  const result = gateLiveOffers([invalid], request, clock, clock);
  assert.equal((result.offers[0] as Offer).delivery.status, 'unknown');
  assert.ok(result.issues.some(i => i.path === 'claims[0].delivery'));
});
test('R30-B: marketplace seller identity cannot be verified by generic merchant homepage', () => {
  const invalid = offer();
  invalid.evidence.seller = proof('https://merchant.example/');
  const result = gateLiveOffers([invalid], request, clock, clock);
  assert.equal((result.offers[0] as Offer).sellerEvidence.verifiedIdentity, false);
  assert.ok(result.issues.some(i => i.path === 'claims[0].seller'));
});
