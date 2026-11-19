import test from 'node:test';
import assert from 'node:assert/strict';
import { sameProductEvidenceSource } from '../src/live-proof.ts';

const product = 'https://merchant.example/item';

test('R32: percent-encoded duplicate identity keys are rejected after URL decoding', () => {
  const ambiguous = product + '?variant=blue&%76ariant=red';
  assert.equal(sameProductEvidenceSource(ambiguous, ambiguous), false);
});

test('R32: percent-encoded identity key remains equivalent when unique', () => {
  assert.equal(
    sameProductEvidenceSource(product + '?%76ariant=blue&color=black', product + '?variant=blue&color=black'),
    true,
  );
});

test('R32: percent-encoded duplicate tracking keys remain ignorable', () => {
  assert.equal(
    sameProductEvidenceSource(product + '?variant=blue&%75tm_source=a&utm_source=b', product + '?variant=blue'),
    true,
  );
});
