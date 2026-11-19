import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedTimestamp } from '../src/evidence-time.ts';

test('verifiedTimestamp accepts valid UTC and offset timestamps', () => {
  assert.equal(verifiedTimestamp('2026-11-19T00:00:00Z'), Date.parse('2026-11-19T00:00:00Z'));
  assert.equal(verifiedTimestamp('2026-11-19T03:00:00+03:00'), Date.parse('2026-11-19T00:00:00Z'));
  assert.equal(verifiedTimestamp('2026-11-18T19:00:00-05:00'), Date.parse('2026-11-19T00:00:00Z'));
  assert.equal(verifiedTimestamp('2024-02-29T12:30:45.123Z'), Date.parse('2024-02-29T12:30:45.123Z'));
});

test('verifiedTimestamp rejects invalid calendar dates and time fields', () => {
  for (const value of [
    '2025-02-29T12:00:00Z',
    '2026-04-31T12:00:00Z',
    '2026-13-01T12:00:00Z',
    '2026-11-19T24:00:00Z',
    '2026-11-19T12:60:00Z',
    '2026-11-19T12:00:60Z',
    '2026-11-19',
    '2026-11-19T12:00:00',
    'not-a-date',
  ]) assert.ok(Number.isNaN(verifiedTimestamp(value)), value);
});

test('verifiedTimestamp rejects malformed or out-of-range timezone offsets', () => {
  for (const value of [
    '2026-11-19T12:00:00+14:01',
    '2026-11-19T12:00:00+15:00',
    '2026-11-19T12:00:00+01:60',
    '2026-11-19T12:00:00-99:00',
    '2026-11-19T12:00:00+1:00',
  ]) assert.ok(Number.isNaN(verifiedTimestamp(value)), value);
});
