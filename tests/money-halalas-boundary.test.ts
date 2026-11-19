import test from 'node:test';
import assert from 'node:assert/strict';
import { toHalalas } from '../src/money.ts';

test('R33: smallest whole-halal amounts are accepted but sub-halala values are rejected', () => {
  assert.equal(toHalalas(0), 0);
  assert.equal(toHalalas(0.01), 1);
  assert.equal(toHalalas(0.02), 2);
  assert.equal(toHalalas(0.001), null);
  assert.equal(toHalalas(0.009), null);
});

test('R33: decimal strings and non-number values are never silently converted', () => {
  for (const value of ['10.25', '0', null, true, {}, []]) assert.equal(toHalalas(value), null);
});

test('R33: halala conversion rejects values beyond safe integer precision', () => {
  assert.equal(toHalalas(Number.MAX_SAFE_INTEGER / 100), null);
  assert.equal(toHalalas(1e20), null);
});
