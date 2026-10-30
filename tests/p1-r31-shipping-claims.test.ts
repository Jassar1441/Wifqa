import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingQuoteConflict } from '../src/live-shipping-claims.ts';

const request = { country: 'SA', city: 'Abha' };
const shipping = { available: true, country: 'SA', city: 'Abha' };

test('R31: explicitly different destination city is rejected', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?city=Riyadh', request, shipping, 15) ?? '', /مدينة/);
});
test('R31: explicitly different destination country is rejected', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?country=AE', request, shipping, 15) ?? '', /بلد/);
});
test('R31: destination claim must agree with both offer and request', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?city=Abha', request, { ...shipping, city: 'Jeddah' }, 15) ?? '', /مدينة/);
});
test('R31: explicitly mismatched shipping price is rejected', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?shipping_cost=25.00', request, shipping, 15) ?? '', /تكلفة/);
});
test('R31: fractions of halala cannot validate a shipping quote', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?shipping_cost=15.001', request, shipping, 15) ?? '', /هللة/);
});
test('R31: duplicate destination or price aliases are ambiguous', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?city=Abha&ship_to_city=Riyadh', request, shipping, 15) ?? '', /مكررة/);
  assert.match(shippingQuoteConflict('https://merchant.example/p?shippingCost=15&shipping_cost=25', request, shipping, 15) ?? '', /مكررة/);
});
test('R31: matching explicit destination and halala amount have no contradiction', () => {
  assert.equal(shippingQuoteConflict('https://merchant.example/p?country=SA&city=Abha&shipping_cost=15.00', request, shipping, 15), null);
});
test('R31: no explicit quote fields is not contradictory but also not verified', () => {
  assert.equal(shippingQuoteConflict('https://merchant.example/p', request, shipping, 15), null);
});
