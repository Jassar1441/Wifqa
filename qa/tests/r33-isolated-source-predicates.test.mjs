import test from 'node:test';
import assert from 'node:assert/strict';

// R33: isolated, exact predicates copied from inspected GitHub source at PR #28.
// Not an import of the production modules; full repository integration NOT tested.
// src/compare.ts blob ee2fb847ce87294825863a00c09e2f7f5be211a4
// src/ingest.ts blob aef953aaa7e5f6701945bff6be7bc1703d519560
const money = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 &&
  Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) <= 1e-7;

// src/coupon-policy.ts blob bcbe0de963b872ea684e89faedcb1e30493f152f
const amountMatches = (scopeAmount, couponAmount) => scopeAmount === couponAmount;
const subtotalMatches = (scopeSubtotal, offerPrice) => scopeSubtotal === offerPrice;
const cents = n => Math.round(n * 100);

test('M1: 100.35 SAR is accepted',()=>assert.equal(money(100.35),true));
test('M2: 0.29 SAR is accepted',()=>assert.equal(money(0.29),true));
test('M3: 100.005 SAR is rejected',()=>assert.equal(money(100.005),false));
test('M4: 0.001 SAR is rejected',()=>assert.equal(money(0.001),false));
test('M5: negative price rejected',()=>assert.equal(money(-0.01),false));
test('M6: infinity rejected',()=>assert.equal(money(Infinity),false));
test('M7: tiny sub-halala fraction 100.0000000005 must be rejected',()=>assert.equal(money(100.0000000005),false));
test('C1: literal equal coupon amounts accepted',()=>assert.equal(amountMatches(0.3,0.3),true));
test('C2: equal-in-halala coupon amounts accepted regardless of float construction',()=>{
  assert.equal(cents(0.1+0.2),cents(0.3));
  assert.equal(money(0.1+0.2),true);
  assert.equal(amountMatches(0.1+0.2,0.3),true);
});
test('C3: equal-in-halala merchandise subtotal accepted',()=>{
  assert.equal(cents(99.9+0.2),cents(100.1));
  assert.equal(money(99.9+0.2),true);
  assert.equal(subtotalMatches(99.9+0.2,100.1),true);
});
test('C4: distinct halala amounts are rejected',()=>assert.equal(amountMatches(0.30,0.31),false));
