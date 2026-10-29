import test from 'node:test';
import assert from 'node:assert/strict';
import { toHalalas } from '../src/money.ts';

test('R33: valid two-decimal values normalize to whole halalas', () => {
  assert.equal(toHalalas(100.35), 10035);
  assert.equal(toHalalas(0.29), 29);
  assert.equal(toHalalas(0.1 + 0.2), 30);
  assert.equal(toHalalas(99.9 + 0.2), 10010);
});
test('R33: fractional halalas and unsafe inputs are rejected', () => {
  for (const n of [100.0000000005, 100.005, 0.001, -1, Infinity, NaN, Number.MAX_SAFE_INTEGER]) {
    assert.equal(toHalalas(n), null, String(n));
  }
});
