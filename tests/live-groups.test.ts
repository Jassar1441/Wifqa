import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionLiveAssessments} from '../src/live-groups.ts';
import type {Assessment} from '../src/types.ts';
const row=(state:Assessment['state'],group:Assessment['group']):Assessment=>({state,group} as Assessment);
test('verified exact, alternatives, and unverified offers are separate',()=>{
 const input=[row('eligible','exact'),row('needs_verification','exact'),row('eligible','alternative'),row('excluded','exact'),row('separate_variant','alternative')];
 const result=partitionLiveAssessments(input);
 assert.deepEqual([result.exact.length,result.alternatives.length,result.needsVerification.length],[1,1,1]);
 assert.equal(result.exact[0],input[0]);assert.equal(result.needsVerification[0],input[1]);
});
test('no verified offers never upgrades unverified to eligible',()=>{
 const result=partitionLiveAssessments([row('needs_verification','exact')]);
 assert.equal(result.exact.length,0);assert.equal(result.alternatives.length,0);assert.equal(result.needsVerification.length,1);
});
