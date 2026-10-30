import test from 'node:test';
import assert from 'node:assert/strict';
import { sameProductEvidenceSource, validateLiveProductEvidence } from '../src/live-proof.ts';

const base = 'https://merchant.example/products/airpods-4';
const checkedAt = '2026-10-30T07:00:00.000Z';
const now = new Date(checkedAt);
const evidence = (source: string) => ({ status: 'confirmed' as const, source, checkedAt });

test('R32: repeated identical variant keys fail even if offer and proof URLs match', () => {
  const ambiguous = base + '?variant=ANC&variant=ANC';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});

test('R32: conflicting productId values fail even when both URLs repeat them', () => {
  const ambiguous = base + '?productId=ANC&productId=MXP63';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});

test('R32: case-variant repeated identifier keys fail closed', () => {
  const ambiguous = base + '?productId=ANC&productid=MXP63';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});

test('R32: duplicated tracking keys do not make unique product identity ambiguous', () => {
  const source = base + '?variant=ANC&utm_source=a&utm_source=b';
  const product = base + '?variant=ANC&utm_source=c';
  assert.equal(sameProductEvidenceSource(source, product), true);
});

test('R32: validator rejects duplicated offer identity even with identical proof', () => {
  const ambiguous = base + '?variant=ANC&variant=MXP63';
  const offer = { url: ambiguous, evidence: { identity: evidence(ambiguous) } };
  assert.throws(() => validateLiveProductEvidence(offer, {mustHave:{}}, now, now), /هوية المنتج/);
});

test('R32: unique variant identifiers and reordered query fields remain valid', () => {
  assert.equal(sameProductEvidenceSource(base + '?variant=ANC&color=white', base + '?color=white&variant=ANC'), true);
});
