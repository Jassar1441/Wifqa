import test from 'node:test';
import assert from 'node:assert/strict';

// Extracted verbatim in logic from src/live-proof.ts at 89dac38 (TS annotations removed).
const trackingParam = (key) =>
  /^utm_/i.test(key) || ['gclid', 'fbclid', 'msclkid'].includes(key.toLowerCase());
const identityParams = (url) =>
  [...url.searchParams].filter(([key]) => !trackingParam(key))
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
function sameProductEvidenceSource(sourceValue, offerValue) {
  try {
    const source = new URL(sourceValue);
    const product = new URL(offerValue);
    if (source.protocol !== 'https:' || product.protocol !== 'https:' ||
        source.username || source.password || product.username || product.password ||
        source.origin !== product.origin || source.pathname !== product.pathname ||
        source.hash !== product.hash) return false;
    return JSON.stringify(identityParams(source)) === JSON.stringify(identityParams(product));
  } catch { return false; }
}

// Predicates copied from src/coupon-policy.ts and src/compare.ts (TS annotations removed).
const couponMoney = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 &&
  Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) <= 1e-7;
const compareMoney = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n*100));
const cents = (n) => Math.round(n * 100);

const product = 'https://merchant.example/p?variant=no-anc';
test('source proof: another variant must be rejected', () => assert.equal(sameProductEvidenceSource('https://merchant.example/p?variant=anc', product),false));
test('source proof: different product must be rejected', () => assert.equal(sameProductEvidenceSource('https://merchant.example/q?variant=no-anc', product),false));
test('source proof: tracking parameter should be ignored', () => assert.equal(sameProductEvidenceSource(product+'&utm_campaign=test', product),true));
test('source proof: query ordering should not affect identity', () => assert.equal(sameProductEvidenceSource('https://merchant.example/p?color=red&variant=no-anc','https://merchant.example/p?variant=no-anc&color=red'),true));
test('source proof: conflicting duplicate variant keys must fail closed', () => assert.equal(sameProductEvidenceSource('https://merchant.example/p?variant=anc&variant=no-anc','https://merchant.example/p?variant=anc&variant=no-anc'),false));
test('source proof: conflicting duplicate productId keys must fail closed', () => assert.equal(sameProductEvidenceSource('https://merchant.example/p?productId=1&productId=2','https://merchant.example/p?productId=1&productId=2'),false));
test('source proof: different origin must be rejected', () => assert.equal(sameProductEvidenceSource('https://other.example/p?variant=no-anc',product),false));
test('money: coupon rejects fractional halala', () => assert.equal(couponMoney(450.005),false));
test('money: compare rejects fractional price halala', () => assert.equal(compareMoney(450.005),false));
test('money: compare rejects fractional shipping halala', () => assert.equal(compareMoney(0.001),false));
test('money: compare retains whole halalas', () => assert.equal(compareMoney(450.25),true));
test('money: current compare rounds 0.001 SAR to zero halalas', () => assert.equal(cents(0.001),0));
