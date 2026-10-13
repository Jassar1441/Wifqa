import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../../src/coupon-policy.ts';
import { assess } from '../../src/compare.ts';
import { demoOffers, demoRequest } from '../../src/fixtures.ts';

const NOW = new Date('2026-10-13T12:00:00Z');
const offer = () => structuredClone(demoOffers(NOW)[0]);

// Deliberately failing independent QA regressions until real coupon provenance is modeled.
// This file is outside tests/*.test.ts to avoid silently modifying the product's green suite.
// Run explicitly: node --test qa/regressions/coupon-evidence-regression.test.ts

test('QA-COUPON-01: an arbitrary source label cannot establish a confirmed customer discount', () => {
  const o = offer();
  o.dataKind = 'live';
  o.url = 'https://example.invalid/offer';
  o.coupon = { amount: 20, verified: true };
  o.evidence.coupon = {
    status: 'confirmed', source: 'اختبار كوبون', checkedAt: NOW.toISOString(),
  };
  const result = assess(o, demoRequest(), NOW);
  assert.equal(result.couponApplied, false,
    'Must require independently checkable, offer-specific proof; status and free-text source are insufficient');
  assert.equal(result.total, 145);
});

test('QA-COUPON-02: evidence from another merchant cannot establish this seller coupon', () => {
  const o = offer();
  o.coupon = { amount: 20, verified: true };
  o.evidence.coupon = {
    status: 'confirmed', source: 'قسيمة تخص متجرًا آخر', checkedAt: NOW.toISOString(),
  };
  assert.equal(couponIsApplicable(o, demoRequest(), NOW), false);
});

test('QA-COUPON-03: no coupon evidence means no discount (existing safety check)', () => {
  const o = offer();
  o.coupon = { amount: 20, verified: true };
  assert.equal(couponIsApplicable(o, demoRequest(), NOW), false);
});

test('QA-COUPON-04: an expired coupon must not apply', () => {
  const o = offer();
  o.coupon = { amount: 20, verified: true, expiresAt: '2026-10-12' };
  o.evidence.coupon = { status: 'confirmed', source: 'test', checkedAt: NOW.toISOString() };
  assert.equal(couponIsApplicable(o, demoRequest(), NOW), false);
});

// QA-COUPON-05 is a product-spec clarification, not a passing assertion yet:
// Does expiresAt='2026-10-13' mean end of the calendar day in Asia/Riyadh?
// Date.parse('2026-10-13') means midnight UTC, so it is already expired by 15:00 Saudi time.
// Decide the rule, then add a deterministic regression test.
