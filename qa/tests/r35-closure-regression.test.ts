import test from 'node:test';
import assert from 'node:assert/strict';
import { sameProductEvidenceSource } from '../../src/live-proof.ts';
import { gateLiveOffers } from '../../src/live-offer-gate.ts';
import type { Offer, Request } from '../../src/types.ts';

const url = 'https://merchant.example/products/airpods-4';
const checkedAt = '2026-10-30T07:00:00.000Z';
const now = new Date(checkedAt);
const proof = (source = url) => ({ status: 'confirmed' as const, source, checkedAt });
const request: Request = {
  identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
  mustHave: {}, country: 'SA', city: 'Abha', currency: 'SAR',
  priority: 'balanced', allowAlternatives: false,
};
function offer(): Offer {
  return {
    id: 'r35', seller: 'Seller A', title: 'AirPods 4',
    identity: request.identity, specifications: {}, currency: 'SAR',
    price: 450, shippingCost: 0, taxIncluded: true, tax: null, fees: 0,
    availability: 'in_stock', shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays: 2, maxDays: 3, status: 'confirmed' },
    returns: { days: 14, cost: 0, notes: 'returns', status: 'confirmed' },
    sellerEvidence: { verifiedIdentity: true, status: 'confirmed' },
    evidence: {
      identity: proof(), cost: proof(), availability: proof(), shipping: proof(),
      delivery: proof(), returns: proof(), seller: proof(),
    },
    dataKind: 'live', url,
  };
}

test('R32: duplicate variant/productId keys fail closed', () => {
  for (const query of ['?variant=A&variant=A', '?productId=A&productId=B', '?productId=A&productid=B']) {
    const ambiguous = url + query;
    assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
  }
});
test('R32: tracking keys may repeat without altering product identity', () => {
  assert.equal(sameProductEvidenceSource(url + '?variant=A&utm_source=1&utm_source=2', url + '?variant=A&utm_source=3'), true);
});
test('R30: homepage and different product cannot prove seller identity', () => {
  for (const source of ['https://merchant.example/', 'https://merchant.example/products/other']) {
    const o = offer(); o.evidence.seller = proof(source);
    const result = gateLiveOffers([o], request, now, now);
    assert.equal((result.offers[0] as Offer).sellerEvidence.verifiedIdentity, false);
    assert.ok(result.issues.some(i => i.path === 'claims[0].seller'));
  }
});
test('R30 EXPECTED FAIL: product URL alone must not prove an arbitrary seller name', () => {
  const o = offer();
  o.seller = 'Unverified Seller B';
  // Evidence has only URL/status/time. No verified seller name or page content.
  const result = gateLiveOffers([o], request, now, now);
  assert.equal((result.offers[0] as Offer).sellerEvidence.verifiedIdentity, false);
});
