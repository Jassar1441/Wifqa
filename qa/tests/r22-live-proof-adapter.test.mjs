import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLiveProductEvidence} from '../../src/live-proof.ts';
import {mapAlephRun} from '../../src/aleph-provider.ts';

const at='2026-10-23T14:00:00Z',clock=new Date(at);
const req={mustHave:{color:{equals:'white'},charging:{equals:'USB-C'},anc:{equals:0}}};
const evidence=(source)=>({status:'confirmed',source,checkedAt:at});
const correct='https://merchant.example/products/airpods-4';
const unrelated='https://merchant.example/products/other-product';
const input={url:correct,evidence:{identity:evidence(unrelated),'spec:color':evidence(unrelated),'spec:charging':evidence(unrelated),'spec:anc':evidence(unrelated)}};

test('QA-R22-1: unrelated same-merchant product MUST NOT validate',()=>{
  assert.throws(()=>validateLiveProductEvidence(input,req,clock,clock),/دليل|هوية|المنتج/);
});
test('QA-R22-1 control: missing required ANC proof is rejected',()=>{
  const bad=structuredClone(input);delete bad.evidence['spec:anc'];
  assert.throws(()=>validateLiveProductEvidence(bad,req,clock,clock),/anc/);
});
const run={observed_at:at,product_response:{structuredContent:{id:'product-1',title:'AirPods 4',url:'https://alephksa.com/ar/products/airpods-4',handle:'airpods-4',available:true,variants:[{sku:'MXP63ZE/A',price:{currency:'SAR',amount:44900},availability:{available:true}}]}}};
test('QA-R22-2: Aleph adapter emits per-spec evidence required by live validator',()=>{
  const result=mapAlephRun(run,{query:'Apple AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}});
  assert.equal(result.offers.length,1);
  const o=result.offers[0];
  for(const key of Object.keys(req.mustHave))assert.ok(o.evidence[`spec:${key}`],`missing spec:${key}`);
  assert.doesNotThrow(()=>validateLiveProductEvidence(o,req,clock,clock));
});
test('QA-R22-2 control: Aleph adapter maps target SKU and SAR amount',()=>{
  const o=mapAlephRun(run,{query:'Apple AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}}).offers[0];
  assert.equal(o.price,449);assert.equal(o.currency,'SAR');assert.equal(o.identity.model,'AirPods 4');
});
