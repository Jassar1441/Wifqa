import test from 'node:test';
import assert from 'node:assert/strict';
import { sameProductEvidenceSource, validateLiveProductEvidence } from '../src/live-proof.ts';

const base = 'https://merchant.example/products/airpods-4';
const at = '2026-10-26T14:25:29.000Z';
const when = new Date(at);
const proof = (source: string) => ({status: 'confirmed' as const, source, checkedAt: at});
const request = {mustHave: {anc: {equals: 0}}};
const offer = (url: string, source: string) => ({url, evidence: {identity: proof(source), 'spec:anc': proof(source)}});

test('reject different productId on same merchant path', () => {
  assert.equal(sameProductEvidenceSource(base + '?productId=MXP63', base + '?productId=ANC'), false);
});
test('reject different color and size query variant', () => {
  assert.equal(sameProductEvidenceSource(base + '?color=black&size=L', base + '?color=white&size=L'), false);
});
test('reject duplicated variant key concealing another variant', () => {
  assert.equal(sameProductEvidenceSource(base + '?variant=MXP63&variant=ANC', base + '?variant=MXP63'), false);
});
test('reject different SPA hash-route product', () => {
  assert.equal(sameProductEvidenceSource('https://merchant.example/#/product/ANC', 'https://merchant.example/#/product/MXP63'), false);
});
test('allow changed tracking parameters but keep same product', () => {
  assert.equal(sameProductEvidenceSource(base + '?productId=MXP63&utm_source=search&gclid=aaa', base + '?productId=MXP63&utm_source=ad&gclid=bbb'), true);
});
test('allow reordering of product-defining query parameters', () => {
  assert.equal(sameProductEvidenceSource(base + '?size=M&color=white', base + '?color=white&size=M'), true);
});
test('reject mismatched identity proof in actual live proof validator', () => {
  assert.throws(() => validateLiveProductEvidence(offer(base + '?productId=MXP63', base + '?productId=ANC'), request, when, when), /هوية المنتج/);
});
test('accept matching identity and mandatory spec proof in validator', () => {
  assert.doesNotThrow(() => validateLiveProductEvidence(offer(base + '?productId=MXP63', base + '?productId=MXP63&utm_medium=qa'), request, when, when));
});
