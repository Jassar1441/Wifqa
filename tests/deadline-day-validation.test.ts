import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, compare } from '../src/compare.ts';
import { compareExternal, requestIssues } from '../src/ingest.ts';
import { demoOffers, demoRequest } from '../src/fixtures.ts';

const now = new Date('2026-11-24T06:00:00.000Z');

test('trusted comparison rejects fractional, negative, and unsafe deadline days', () => {
  for (const deadlineDays of [1.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
    const request = { ...demoRequest(), deadlineDays };
    const offer = demoOffers(now)[0];
    const assessment = assess(offer, request, now);
    assert.equal(assessment.state, 'excluded');
    assert.ok(assessment.reasons.includes('حد توصيل غير صالح'));
    assert.equal(compare([offer], request, now).winner, null);
  }
});

test('trusted comparison accepts a whole-day deadline that the confirmed ETA meets', () => {
  const offer = demoOffers(now)[0];
  const request = { ...demoRequest(), deadlineDays: 7 };
  assert.equal(assess(offer, request, now).state, 'eligible');
  assert.equal(compare([offer], request, now).winner?.offer.id, offer.id);
});

test('external request validation rejects fractional, negative, and unsafe deadline days', () => {
  for (const deadlineDays of [1.5, -1, Number.MAX_SAFE_INTEGER + 1]) {
    const request = { ...demoRequest(), deadlineDays };
    assert.ok(requestIssues(request).some(issue => issue.path === 'deadlineDays'));
    const result = compareExternal([demoOffers(now)[0]], request, now);
    assert.equal(result.result, null);
    assert.ok(result.issues.some(issue => issue.path === 'deadlineDays'));
  }
});

test('external request validation accepts whole-day deadlines', () => {
  const request = { ...demoRequest(), deadlineDays: 7 };
  assert.deepEqual(requestIssues(request), []);
  const result = compareExternal([demoOffers(now)[0]], request, now);
  assert.deepEqual(result.issues, []);
  assert.equal(result.result?.winner?.offer.id, 'A');
});
