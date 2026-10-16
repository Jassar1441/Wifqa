import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../src/coupon-policy.ts';
test('coupon cannot apply without scoped proof', () => {
  assert.equal(couponIsApplicable({ id:'A', price:100, currency:'SAR', dataKind:'synthetic', coupon:{ amount:10, verified:true }, evidence:{} } as any, { country:'SA', city:'Abha', currency:'SAR' } as any), false);
});
