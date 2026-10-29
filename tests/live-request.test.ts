import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveRequest } from '../src/live-request.ts';

test('R29: live search honors checked alternatives option', () => {
  const request = buildLiveRequest({ city: 'Abha', priority: 'cheapest', allowAlternatives: true });
  assert.equal(request.allowAlternatives, true);
  assert.equal(request.city, 'Abha');
  assert.deepEqual(request.mustHave.anc, { equals: 0 });
});
test('R29: live search excludes alternatives when unchecked', () => {
  const request = buildLiveRequest({ city: 'Riyadh', priority: 'fastest', allowAlternatives: false, budget: 500 });
  assert.equal(request.allowAlternatives, false);
  assert.equal(request.priority, 'fastest');
  assert.equal(request.budget, 500);
});

test('R29: UI forwards the actual checkbox state to the live request', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(app, /allowAlternatives:input\('alternatives'\)\.checked/);
});
