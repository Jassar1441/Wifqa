import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingQuoteConflict, sameProductShippingEvidenceSource } from '../src/live-shipping-claims.ts';
import { sameProductEvidenceSource } from '../src/live-proof.ts';

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

test('R31: SPA fragment destination and cost contradictions are rejected', () => {
  const prefix = 'https://merchant.example/p?variant=blue#/product?';
  assert.match(shippingQuoteConflict(prefix + 'country=SA&city=Riyadh&shipping_cost=15', request, shipping, 15) ?? '', /مدينة/);
  assert.match(shippingQuoteConflict(prefix + 'country=SA&city=Abha&shipping_cost=99', request, shipping, 15) ?? '', /تكلفة/);
});

test('R31: SPA fragment and top-level quote fields cannot disagree or repeat', () => {
  const url = 'https://merchant.example/p?city=Abha#/product?country=SA&city=Riyadh&shipping_cost=15';
  assert.match(shippingQuoteConflict(url, request, shipping, 15) ?? '', /مكررة/);
});

test('R31: a complete quote in the same SPA product route is structurally accepted', () => {
  const product = 'https://merchant.example/p#/product?variant=blue';
  const quote = 'https://merchant.example/p#/product?variant=blue&country=SA&city=Abha&shipping_cost=15';
  assert.equal(sameProductShippingEvidenceSource(quote, product), true);
  assert.equal(shippingQuoteConflict(quote, request, shipping, 15), null);
  assert.equal(sameProductShippingEvidenceSource(quote.replace('variant=blue', 'variant=red'), product), false);
  assert.equal(sameProductShippingEvidenceSource(quote.replace('/product?', '/other-product?'), product), false);
});

test('R31: SPA fragment quote still fails closed when required city is missing', () => {
  assert.match(shippingQuoteConflict(
    'https://merchant.example/p#/product?country=SA&shipping_cost=15',
    request, shipping, 15,
  ) ?? '', /لا يثبت/);
});

test('R31: duplicate SPA variant selectors cannot establish product or shipping identity', () => {
  const ambiguous = 'https://merchant.example/p#/product?variant=blue&variant=red';
  const quoted = ambiguous + '&country=SA&city=Abha&shipping_cost=15';
  assert.equal(sameProductShippingEvidenceSource(quoted, ambiguous), false);
  assert.equal(sameProductShippingEvidenceSource(quoted, 'https://merchant.example/p#/product?variant=blue'), false);
});

test('R31: contradictory variant selectors across URL and SPA fragment are rejected', () => {
  const ambiguous = 'https://merchant.example/p?variant=blue#/product?variant=red';
  const quoted = ambiguous + '&country=SA&city=Abha&shipping_cost=15';
  assert.equal(sameProductShippingEvidenceSource(quoted, ambiguous), false);
  const valid = 'https://merchant.example/p?lang=ar#/product?variant=blue';
  assert.equal(sameProductShippingEvidenceSource(valid + '&country=SA&city=Abha&shipping_cost=15', valid), true);
});

// A tracking tag added by a merchant must not hide an otherwise matching SPA
// product or shipping proof. Variant and route selectors remain strict.
test('R31: SPA tracking tags do not invalidate matching product and shipping proofs', () => {
  const product = 'https://merchant.example/p#/product?variant=blue&utm_source=listing';
  const proof = 'https://merchant.example/p#/product?utm_source=receipt&variant=blue&fbclid=receipt';
  assert.equal(sameProductEvidenceSource(proof, product), true);
  assert.equal(sameProductShippingEvidenceSource(proof + '&country=SA&city=Abha&shipping_cost=15', product), true);
});

test('R31: SPA variant or route changes remain rejected despite tracking tags', () => {
  const product = 'https://merchant.example/p#/product?variant=blue&utm_source=listing';
  assert.equal(sameProductEvidenceSource('https://merchant.example/p#/product?variant=red&utm_source=receipt', product), false);
  assert.equal(sameProductShippingEvidenceSource('https://merchant.example/p#/other?variant=blue&utm_source=receipt&country=SA&city=Abha&shipping_cost=15', product), false);
});

test('R31: product selector cannot migrate between outer query and SPA fragment', () => {
  const product = 'https://merchant.example/p?variant=blue#/product?utm_source=listing';
  const moved = 'https://merchant.example/p#/product?variant=blue&utm_source=receipt';
  assert.equal(sameProductEvidenceSource(moved, product), false);
  assert.equal(sameProductShippingEvidenceSource(moved + '&country=SA&city=Abha&shipping_cost=15', product), false);
});
