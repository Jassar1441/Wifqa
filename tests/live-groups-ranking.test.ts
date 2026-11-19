import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionLiveAssessments } from '../src/live-groups.ts';
import type { Assessment } from '../src/types.ts';

const assessment = (state: Assessment['state'], group: Assessment['group'], label: string): Assessment =>
  ({ state, group, offer: { id: label } } as unknown as Assessment);

test('ranking cannot promote excluded or needs-verification rows into recommendations', () => {
  const excluded = assessment('excluded', 'exact', 'excluded');
  const verification = assessment('needs_verification', 'exact', 'needs-proof');
  const eligibleExact = assessment('eligible', 'exact', 'exact');
  const eligibleAlternative = assessment('eligible', 'alternative', 'alt');
  const rows = [excluded, verification, eligibleExact, eligibleAlternative];
  const result = partitionLiveAssessments(rows, rows);
  assert.deepEqual(result.exact, [eligibleExact]);
  assert.deepEqual(result.alternatives, [eligibleAlternative]);
  assert.deepEqual(result.needsVerification, [verification]);
  assert.deepEqual(result.unranked, []);
});

test('eligible offers omitted from ranking remain visible as unranked, not promoted', () => {
  const ranked = assessment('eligible', 'exact', 'ranked');
  const unranked = assessment('eligible', 'exact', 'unranked');
  const verification = assessment('needs_verification', 'alternative', 'pending');
  const result = partitionLiveAssessments([ranked, unranked, verification], [ranked]);
  assert.deepEqual(result.exact, [ranked]);
  assert.deepEqual(result.alternatives, []);
  assert.deepEqual(result.unranked, [unranked]);
  assert.deepEqual(result.needsVerification, [verification]);
});
