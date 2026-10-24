// Independent QA R23 — executed against Git-blob-identical src/live-proof.ts,
// src/evidence-time.ts and src/aleph-provider.ts in a local isolated harness.
// No live merchant calls; source stubs were used only for unused adapter imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLiveProductEvidence} from '../../src/live-proof.ts';
import {mapAlephRun} from '../../src/aleph-provider.ts';
const time='2026-10-24T09:00:00Z', now=new Date(time);
const request={mustHave:{anc:{equals:0},charging:{equals:'USB-C'},color:{equals:'white'}}};
const product='https://merchant.example/products/airpods-4';
const proof=source=>({status:'confirmed',source,checkedAt:time});
const offer=()=>({url:product,evidence:{identity:proof(product),'spec:anc':proof(product),'spec:charging':proof(product),'spec:color':proof(product)}});
test('QA-A control: same product proof passes',()=>assert.doesNotThrow(()=>validateLiveProductEvidence(offer(),request,now,now)));
test('QA-A defect: another product on same merchant origin is accepted',()=>{
 const o=offer();for(const e of Object.values(o.evidence))e.source='https://merchant.example/products/airpods-pro';
 assert.doesNotThrow(()=>validateLiveProductEvidence(o,request,now,now));
});
test('QA-A control: other merchant origin rejected',()=>{
 const o=offer();o.evidence.identity.source='https://other.example/products/airpods-4';
 assert.throws(()=>validateLiveProductEvidence(o,request,now,now),/هوية المنتج/);
});
test('QA-B defect: Aleph adapter output lacks mandatory spec proofs',()=>{
 const run={observed_at:time,discovery_method:'fixture-only',product_response:{structuredContent:{
  id:'fixture-id',title:'AirPods 4',handle:'airpods-4',url:'https://alephksa.com/ar/products/airpods-4',available:true,
  variants:[{sku:'MXP63ZE/A',price:{currency:'SAR',amount:44900},availability:{available:true}}]
 }}};
 const input={query:'Apple AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}};
 const mapped=mapAlephRun(run,input).offers[0];
 assert.deepEqual(['spec:anc','spec:charging','spec:color'].filter(k=>Object.hasOwn(mapped.evidence,k)),[]);
 assert.throws(()=>validateLiveProductEvidence(mapped,request,now,now),/anc/);
});
