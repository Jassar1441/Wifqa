import test from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/compare.ts';
import { demoOffers, demoRequest } from '../src/fixtures.ts';

const NOW = new Date('2026-10-11T08:00:00Z');
const candidate = () => {
  const offer = structuredClone(demoOffers(NOW)[0]);
  offer.dataKind = 'live' as const;
  offer.url = 'https://example.com/product';
  return offer;
};

// QA independent expected behavior: a coupon is a separate time-sensitive
// price claim. A boolean verified flag alone is not source evidence.
test('QA-COUPON-01: do not discount live total without coupon provenance', () => {
  const offer = candidate();
  offer.coupon = { amount: 20, verified: true };
  const assessment = assess(offer, demoRequest(), NOW);
  assert.equal(assessment.couponApplied, false, 'Missing coupon evidence must not lower confirmed total');
  assert.equal(assessment.total, 145, 'Unverified coupon must not reduce 120+25');
});

test('QA-COUPON-02: stale coupon evidence must not discount live total', () => {
  const offer = candidate();
  offer.coupon = { amount: 20, verified: true };
  offer.evidence.coupon = {
    status: 'confirmed',
    source: 'test-only source (not an actual shop)',
    checkedAt: '2026-10-09T08:00:00Z',
  };
  const assessment = assess(offer, demoRequest(), NOW);
  assert.equal(assessment.couponApplied, false, 'Stale coupon proof must not lower total');
  assert.equal(assessment.total, 145);
});
