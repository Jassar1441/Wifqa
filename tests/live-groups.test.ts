import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionLiveAssessments} from '../src/live-groups.ts';
import type {Assessment} from '../src/types.ts';
const row=(state:Assessment['state'],group:Assessment['group']):Assessment=>({state,group} as Assessment);
test('verified exact, alternatives, unverified, rejected, and separate variants remain distinct',()=>{
 const input=[row('eligible','exact'),row('needs_verification','exact'),row('eligible','alternative'),row('excluded','exact'),row('separate_variant','alternative')];
 const result=partitionLiveAssessments(input,[input[0],input[2]]);
 assert.deepEqual([result.exact.length,result.alternatives.length,result.needsVerification.length,result.excluded.length,result.separateVariants.length],[1,1,1,1,1]);
 assert.equal(result.exact[0],input[0]);assert.equal(result.needsVerification[0],input[1]);
 assert.equal(result.excluded[0],input[3]);assert.equal(result.separateVariants[0],input[4]);
});
test('no verified offers never upgrades unverified to eligible or rejected',()=>{
 const unverified=row('needs_verification','exact'), rejected=row('excluded','exact'), separate=row('separate_variant','alternative');
 const result=partitionLiveAssessments([unverified,rejected,separate],[]);
 assert.equal(result.exact.length,0);assert.equal(result.alternatives.length,0);assert.equal(result.needsVerification.length,1);
 assert.deepEqual(result.excluded,[rejected]);assert.deepEqual(result.separateVariants,[separate]);
});
