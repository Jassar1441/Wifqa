import test from 'node:test';
import assert from 'node:assert/strict';
import { restrictLiveCouponToCurrentFetch } from '../../src/live-coupon.ts';
import { searchAndCompare } from '../../src/search-client.ts';
import { demoOffers, demoRequest } from '../../src/fixtures.ts';

const at = '2026-10-24T14:00:02.000Z';
const now = () => new Date(at);
const query = 'Apple AirPods 4 without ANC';
const proof = () => ({ status: 'confirmed' as const, source: 'https://example.com/p/airpods', checkedAt: at });

test('QA R24: expired-for-this-fetch coupon proof cannot reduce a live offer', () => {
  const original = { dataKind: 'live', coupon: { amount: 20, verified: true }, evidence: { coupon: { ...proof(), checkedAt: '2026-10-24T13:59:59Z' } } } as any;
  const safe = restrictLiveCouponToCurrentFetch(original, new Date('2026-10-24T14:00:00Z'), new Date('2026-10-24T14:00:05Z'));
  assert.equal(safe.coupon.verified, false);
  assert.equal(original.coupon.verified, true, 'original merchant record must not be mutated');
});

test('QA R24 regression (currently fails): malformed second live offer must not hide valid first offer', async () => {
  const request = demoRequest();
  request.identity.model = 'AirPods 4';
  request.mustHave = { anc: { equals: 0 } };
  const valid = demoOffers(now())[0];
  valid.identity.model = 'AirPods 4';
  valid.specifications.anc = 0;
  valid.dataKind = 'live';
  valid.url = 'https://example.com/p/airpods';
  delete valid.coupon;
  for (const entry of Object.values(valid.evidence)) Object.assign(entry, proof());
  valid.evidence['spec:anc'] = proof();
  const invalid = structuredClone(valid);
  invalid.id = 'BAD';
  delete invalid.evidence.identity;
  const payload = { mode: 'live', query, destination: { country: request.country, city: request.city }, retrievedAt: at, offers: [valid, invalid] };
  const fetcher = async () => new Response(JSON.stringify(payload), { status: 200 });
  const output = await searchAndCompare(query, request, fetcher as typeof fetch, now);
  assert.ok(output.result, 'valid first offer must remain visible');
  assert.equal(output.result.assessed.length, 1);
  assert.ok(output.issues.some(issue => issue.path.startsWith('offers[1]')));
});
