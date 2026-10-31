import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingQuoteConflict } from '../../src/live-shipping-claims.ts';
import { sameProductEvidenceSource } from '../../src/live-proof.ts';
const request = {country:'SA',city:'Abha'};
const shipping = {available:true,country:'SA',city:'Abha'};
const product = 'https://merchant.example/p?variant=blue';

test('CONTROL: mismatched top-level city is detected', () => {
  assert.match(shippingQuoteConflict(product+'&city=Riyadh',request,shipping,15)??'',/مدينة/);
});
test('CONTROL: mismatched top-level shipping cost is detected', () => {
  assert.match(shippingQuoteConflict(product+'&shipping_cost=99.00',request,shipping,15)??'',/تكلفة/);
});
test('CONTROL: matching explicit shipping cost has no contradiction', () => {
  assert.equal(shippingQuoteConflict(product+'&shipping_cost=15.00',request,shipping,15),null);
});
test('R36-A: mismatched city in SPA fragment must be detected', () => {
  assert.match(shippingQuoteConflict(product+'#/checkout?city=Riyadh',request,shipping,15)??'',/مدينة/);
});
test('R36-A: mismatched cost in SPA fragment must be detected', () => {
  assert.match(shippingQuoteConflict(product+'#/checkout?shipping_cost=99.00',request,shipping,15)??'',/تكلفة/);
});
test('R36-B: destination quote parameter should not change product identity', () => {
  assert.equal(sameProductEvidenceSource(product+'&city=Abha',product),true);
});
test('R36-B: shipping quote cost should not change product identity', () => {
  assert.equal(sameProductEvidenceSource(product+'&shipping_cost=15.00',product),true);
});
test('CONTROL: different product variant must remain rejected', () => {
  assert.equal(sameProductEvidenceSource('https://merchant.example/p?variant=red',product),false);
});
