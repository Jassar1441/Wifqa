import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionLiveAssessments } from '../src/live-groups.ts';
import type { Assessment } from '../src/types.ts';
const row = (id: string, state: Assessment['state'], group: Assessment['group']): Assessment =>
  ({offer:{id},state,group} as Assessment);

test('live exact cards follow comparison ranking rather than source order', () => {
  const expensive=row('expensive','eligible','exact');
  const cheap=row('cheap','eligible','exact');
  const result=partitionLiveAssessments([expensive,cheap],[cheap,expensive]);
  assert.deepEqual(result.exact.map(a=>a.offer.id),['cheap','expensive']);
});
test('ranked alternatives retain ranking order without mixing with exact products', () => {
  const altExpensive=row('alt-expensive','eligible','alternative');
  const exact=row('exact','eligible','exact');
  const altCheap=row('alt-cheap','eligible','alternative');
  const result=partitionLiveAssessments([altExpensive,exact,altCheap],[exact,altCheap,altExpensive]);
  assert.deepEqual(result.exact.map(a=>a.offer.id),['exact']);
  assert.deepEqual(result.alternatives.map(a=>a.offer.id),['alt-cheap','alt-expensive']);
});
test('eligible offer omitted from fastest ranking is not presented as recommended', () => {
  const unknownEta=row('unknown-eta','eligible','exact');
  const fast=row('fast','eligible','exact');
  const result=partitionLiveAssessments([unknownEta,fast],[fast]);
  assert.deepEqual(result.exact.map(a=>a.offer.id),['fast']);
  assert.deepEqual(result.unranked.map(a=>a.offer.id),['unknown-eta']);
});
test('unverified, excluded and unranked remain separate', () => {
  const exact=row('exact','eligible','exact');
  const unranked=row('unranked','eligible','exact');
  const uncertain=row('uncertain','needs_verification','exact');
  const excluded=row('excluded','excluded','exact');
  const different=row('different','separate_variant','alternative');
  const result=partitionLiveAssessments([unranked,uncertain,excluded,exact,different],[exact]);
  assert.deepEqual(result.exact.map(a=>a.offer.id),['exact']);
  assert.deepEqual(result.unranked.map(a=>a.offer.id),['unranked']);
  assert.deepEqual(result.needsVerification.map(a=>a.offer.id),['uncertain']);
  assert.deepEqual(result.alternatives,[]);
});
test('no ranking means no winner, even with eligible but unranked offers', () => {
  const candidate=row('unknown-eta','eligible','exact');
  const result=partitionLiveAssessments([candidate],[]);
  assert.equal(result.exact.length,0);
  assert.equal(result.unranked[0],candidate);
});
test('invalid ranked entry is never promoted to eligible card', () => {
  const uncertain=row('uncertain','needs_verification','exact');
  const result=partitionLiveAssessments([uncertain],[uncertain]);
  assert.equal(result.exact.length,0);
  assert.equal(result.needsVerification[0],uncertain);
});
