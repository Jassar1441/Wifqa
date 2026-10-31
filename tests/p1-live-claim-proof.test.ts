import test from 'node:test';
import assert from 'node:assert/strict';
import { gateLiveOffers } from '../src/live-offer-gate.ts';
import { compareExternal } from '../src/ingest.ts';
import { liveIssueSummary } from '../src/live-issues.ts';
import type { Offer, Request } from '../src/types.ts';

const checkedAt = '2026-10-27T14:00:00.000Z';
const now = new Date(checkedAt);
const productUrl = 'https://merchant.example/airpods-4';
const quote = productUrl + '?country=SA&city=Abha&shipping_cost=0';
const proof = (source = productUrl) => ({ status: 'confirmed' as const, source, checkedAt });
const request: Request = {
  identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
  mustHave: { anc: { equals: 0 } }, country: 'SA', city: 'Abha', currency: 'SAR',
  priority: 'fastest', allowAlternatives: false,
};
function offer(id: string, price = 450, days = 2): Offer {
  return {
    id, seller: 'Test merchant', title: 'AirPods 4 test',
    identity: { model: 'AirPods 4', condition: 'new', quantity: 1 },
    specifications: { anc: 0 }, currency: 'SAR', price,
    shippingCost: 0, taxIncluded: true, tax: null, fees: 0,
    availability: 'in_stock', shipping: { available: true, country: 'SA', city: 'Abha' },
    delivery: { minDays: days, maxDays: days, status: 'confirmed' },
    returns: { days: 14, cost: 0, notes: 'Returns 14 days', status: 'confirmed' },
    sellerEvidence: { verifiedIdentity: true, status: 'confirmed' },
    evidence: { identity: proof(), 'spec:anc': proof(), cost: proof(), availability: proof(), shipping: proof(quote), delivery: proof(quote), returns: proof(), seller: proof() },
    dataKind: 'live', url: productUrl,
  };
}
function run(offers: Offer[], priority: Request['priority'] = 'fastest') {
  const req = { ...request, priority };
  const gated = gateLiveOffers(offers, req, now, now);
  const compared = compareExternal(gated.offers, req, now);
  return { gated, compared, issues: [...gated.issues, ...compared.issues] };
}

test('unrelated merchant delivery proof is downgraded before fastest ranking', () => {
  const fakeFast = offer('fake-fast', 300, 1);
  fakeFast.evidence.delivery = proof('https://other.example/airpods-4');
  const result = run([fakeFast, offer('verified-slower', 450, 3)]);
  const downgraded = result.compared.result!.assessed[0];
  assert.equal(downgraded.offer.delivery.status, 'unknown');
  assert.equal(downgraded.offer.delivery.maxDays, null);
  assert.equal(result.compared.result?.assessed.length, 2);
  assert.ok(result.issues.some(i => i.path === 'claims[0].delivery'));
});

test('stale delivery proof is downgraded without hiding otherwise eligible product', () => {
  const stale = offer('stale');
  stale.evidence.delivery.checkedAt = '2026-10-26T14:00:00.000Z';
  const result = run([stale], 'cheapest');
  assert.equal(result.compared.result?.assessed[0].offer.delivery.status, 'unknown');
});

test('valid merchant delivery evidence still permits fastest ranking', () => {
  const result = run([offer('fast', 500, 1), offer('slow', 300, 4)]);
  assert.equal(result.compared.result?.assessed[0].offer.delivery.status, 'confirmed');
  assert.equal(result.issues.length, 0);
});

test('unrelated return proof does not claim confirmed return policy', () => {
  const invalid = offer('invalid-returns');
  invalid.evidence.returns = proof('https://other.example/returns');
  const result = run([invalid], 'balanced');
  const assessed = result.compared.result!.assessed[0];
  assert.equal(assessed.offer.returns.status, 'unknown');
  assert.equal(assessed.offer.returns.days, null);
  assert.ok(result.issues.some(i => i.path === 'claims[0].returns'));
});

test('unrelated seller identity proof cannot boost balanced score', () => {
  const invalid = offer('invalid-seller');
  invalid.evidence.seller = proof('https://other.example/seller');
  const result = run([invalid], 'balanced');
  const assessed = result.compared.result!.assessed[0];
  assert.equal(assessed.offer.sellerEvidence.verifiedIdentity, false);
  assert.equal(assessed.offer.sellerEvidence.status, 'unknown');
  assert.ok(result.issues.some(i => i.path === 'claims[0].seller'));
});

test('claim downgrades are disclosed without claiming that an offer was rejected', () => {
  const invalid = offer('invalid');
  invalid.evidence.delivery = proof('https://other.example/eta');
  invalid.evidence.returns = proof('https://other.example/returns');
  invalid.evidence.seller = proof('https://other.example/seller');
  const result = run([invalid]);
  const summary = liveIssueSummary(result.issues) ?? '';
  assert.match(summary, /3.*ادعاء|3.*معلومات/);
  assert.doesNotMatch(summary, /عزل 1 عرض/);
  assert.equal(result.compared.result?.assessed.length, 1);
});

test('R30: merchant homepage cannot prove this specific seller identity', () => {
  const invalid = offer('homepage-seller');
  invalid.evidence.seller = proof('https://merchant.example/');
  const result = run([invalid], 'balanced');
  const assessed = result.compared.result!.assessed[0];
  assert.equal(assessed.offer.sellerEvidence.verifiedIdentity, false);
  assert.equal(assessed.offer.sellerEvidence.status, 'unknown');
  assert.ok(result.issues.some(i => i.path === 'claims[0].seller'));
  assert.equal(result.compared.result!.assessed.length, 1);
});

test('R30: seller proof from a different product page cannot boost balanced score', () => {
  const invalid = offer('wrong-product-seller');
  invalid.evidence.seller = proof('https://merchant.example/other-product');
  const result = run([invalid], 'balanced');
  assert.equal(result.compared.result!.assessed[0].offer.sellerEvidence.verifiedIdentity, false);
  assert.ok(result.issues.some(i => i.path === 'claims[0].seller'));
});

test('R30: same-product seller evidence with tracking-only parameters is retained', () => {
  const valid = offer('product-bound-seller');
  valid.evidence.seller = proof(productUrl + '?utm_source=qa');
  const result = run([valid], 'balanced');
  assert.equal(result.compared.result!.assessed[0].offer.sellerEvidence.verifiedIdentity, true);
  assert.equal(result.issues.length, 0);
});

function bindAllProofsToProductUrl(target: Offer, url: string) {
  target.url = url;
  for (const evidence of Object.values(target.evidence)) evidence.source = url;
}

test('R31: matching product URL cannot validate a different destination city', () => {
  const bad = offer('city-mismatch');
  bindAllProofsToProductUrl(bad, productUrl + '?city=Riyadh');
  const result = run([bad], 'cheapest');
  assert.equal(result.compared.result?.assessed.length, 0);
  assert.ok(result.issues.some(i => i.path === 'offers[0].evidence' && /مدينة/.test(i.message)));
});

test('R31: matching product URL cannot validate a contradictory shipping cost', () => {
  const bad = offer('shipping-cost-mismatch');
  bindAllProofsToProductUrl(bad, productUrl + '?shipping_cost=99.00');
  const result = run([bad], 'cheapest');
  assert.equal(result.compared.result?.assessed.length, 0);
  assert.ok(result.issues.some(i => i.path === 'offers[0].evidence' && /تكلفة/.test(i.message)));
});
