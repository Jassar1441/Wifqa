// Independent QA R29. Run in repository checkout on Node >=24:
// node --test qa/tests/r29-ranking-live-options.test.mjs
// Source-level liveRequest evaluation is NOT a browser/E2E test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partitionLiveAssessments } from '../../src/live-groups.ts';

const row=(id,state='eligible',group='exact')=>({offer:{id},state,group});
const ids=(items)=>items.map(x=>x.offer.id);

test('QA-R29-01: ranking beats source order for three exact offers',()=>{
 const a=row('A'),b=row('B'),c=row('C');
 assert.deepEqual(ids(partitionLiveAssessments([a,b,c],[c,a,b]).exact),['C','A','B']);
});
test('QA-R29-02: alternatives preserve ranking, not source order',()=>{
 const a=row('A','eligible','alternative'),b=row('B','eligible','alternative');
 assert.deepEqual(ids(partitionLiveAssessments([a,b],[b,a]).alternatives),['B','A']);
});
test('QA-R29-03: alternative never becomes exact',()=>{
 const a=row('A','eligible','alternative'),b=row('B');
 const x=partitionLiveAssessments([a,b],[a,b]);
 assert.deepEqual([ids(x.exact),ids(x.alternatives)],[['B'],['A']]);
});
test('QA-R29-04: unverified entry in ranking never becomes eligible',()=>{
 const a=row('A','needs_verification');
 const x=partitionLiveAssessments([a],[a]);
 assert.deepEqual([x.exact.length,x.needsVerification.length],[0,1]);
});
test('QA-R29-05: eligible without ranked ETA remains unranked',()=>{
 const a=row('unknownETA'),b=row('fast');
 const x=partitionLiveAssessments([a,b],[b]);
 assert.deepEqual([ids(x.exact),ids(x.unranked)],[['fast'],['unknownETA']]);
});
test('QA-R29-06: empty ranking has no winner',()=>{
 const x=partitionLiveAssessments([row('A'),row('B')],[]);
 assert.deepEqual([x.exact.length,x.unranked.length],[0,2]);
});
test('QA-R29-07: needs_verification remains visible',()=>{
 const x=partitionLiveAssessments([row('A','needs_verification'),row('B')],[]);
 assert.deepEqual([x.needsVerification.length,x.unranked.length],[1,1]);
});
test('QA-R29-08: excluded and separate_variant never become unranked',()=>{
 const x=partitionLiveAssessments([row('A','excluded'),row('B','separate_variant','alternative'),row('C')],[]);
 assert.deepEqual([x.exact.length,x.alternatives.length,ids(x.unranked),x.needsVerification.length],[0,0,['C'],0]);
});
test('QA-R29-09: ranked offer never duplicated as unranked',()=>{
 const a=row('A'),b=row('B');
 assert.deepEqual(ids(partitionLiveAssessments([a,b],[a]).unranked),['B']);
});
test('QA-R29-10: unranked keeps input order',()=>{
 const a=row('A'),b=row('B'),c=row('C');
 assert.deepEqual(ids(partitionLiveAssessments([a,b,c],[b]).unranked),['A','C']);
});

function liveRequestFor(checked){
 const source=readFileSync(new URL('../../src/app.ts',import.meta.url),'utf8');
 const line=source.split('\n').find(x=>x.includes('const liveRequest:Request='));
 assert.ok(line,'liveRequest source expression must be found');
 // Strip only TS-specific syntax, then evaluate the original object expression.
 const expression=line.trim().replace('const liveRequest:Request=','return ').replace(/byId<HTMLSelectElement>/g,'byId');
 const build=new Function('request','byId','optionalNumber',expression);
 return build({priority:'cheapest'},id=>id==='city'?{value:'Abha'}:id==='alternatives'?{checked}:null,()=>undefined);
}
test('QA-R29-11: live mode with alternatives unchecked sends false',()=>{
 assert.equal(liveRequestFor(false).allowAlternatives,false);
});
test('QA-R29-12: live mode with alternatives checked sends true (known failure)',()=>{
 assert.equal(liveRequestFor(true).allowAlternatives,true,
  'The visible alternatives checkbox must affect the live request, or be disabled with an explanation.');
});
