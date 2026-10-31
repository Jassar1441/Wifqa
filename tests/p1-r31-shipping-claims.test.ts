import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingQuoteConflict, sameProductShippingEvidenceSource } from '../src/live-shipping-claims.ts';

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
test('R31: missing destination and shipping amount is not positive proof', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p', request, shipping, 15) ?? '', /لا يثبت/);
});

test('R31: a missing country or city fails closed even if the price matches', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?city=Abha&shipping_cost=15', request, shipping, 15) ?? '', /لا يثبت/);
  assert.match(shippingQuoteConflict('https://merchant.example/p?country=SA&shipping_cost=15', request, shipping, 15) ?? '', /لا يثبت/);
});
test('R31: missing shipping cost fails closed for a priced offer', () => {
  assert.match(shippingQuoteConflict('https://merchant.example/p?country=SA&city=Abha', request, shipping, 15) ?? '', /تكلفة/);
});
test('R31: quote metadata may extend a product URL without changing its variant', () => {
  const product = 'https://merchant.example/p?variant=no-anc';
  const quote = product + '&country=SA&city=Abha&shipping_cost=15&utm_source=qa';
  assert.equal(sameProductShippingEvidenceSource(quote, product), true);
  assert.equal(sameProductShippingEvidenceSource(quote.replace('no-anc', 'anc'), product), false);
  assert.equal(sameProductShippingEvidenceSource('https://other.example/p?variant=no-anc&country=SA&city=Abha&shipping_cost=15', product), false);
});
