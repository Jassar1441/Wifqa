import test from 'node:test';
import assert from 'node:assert/strict';
import {offerIssues} from '../src/ingest.ts';
import {compare,deliveryText} from '../src/compare.ts';
import {demoOffers,demoRequest} from '../src/fixtures.ts';

const now=new Date('2026-10-11T08:00:00Z');
const base=()=>structuredClone(demoOffers(now)[0]);

test('ingress rejects fractional or negative delivery days and reversed ETA ranges',()=>{
 for(const [minDays,maxDays] of [[1.5,2],[1,-0.5],[3,2]]){
  const o=base();o.delivery={minDays,maxDays,status:'confirmed'};
  assert.ok(offerIssues(o).some(i=>i.path==='delivery'));
 }
});

test('ingress accepts integer ETA ranges and unknown claims with missing days',()=>{
 const valid=base();valid.delivery={minDays:1,maxDays:2,status:'confirmed'};
 assert.deepEqual(offerIssues(valid),[]);
 const unknown=base();unknown.delivery={minDays:null,maxDays:null,status:'unknown'};
 assert.deepEqual(offerIssues(unknown),[]);
});

test('delivery display and fastest ranking do not treat fractional days as valid',()=>{
 const fractional=base();fractional.delivery={minDays:1.5,maxDays:2.5,status:'confirmed'};
 assert.match(deliveryText(fractional,now),/غير موثق/);
 const request={...demoRequest(),priority:'fastest'};
 assert.equal(compare([fractional],request,now).ranking.length,0);
});

test('fractional deadline is invalid',()=>{
 const request={...demoRequest(),deadlineDays:1.5};
 const result=compare([base()],request,now);
 assert.ok(result.assessed[0].state==='excluded');
 assert.ok(result.assessed[0].reasons.some(x=>x.includes('حد توصيل غير صالح')));
});
