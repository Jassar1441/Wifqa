import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoProvider} from '../scripts/demo-provider.mjs';
import {compareExternal} from '../src/ingest.ts';
import {buildLiveRequest} from '../src/live-request.ts';
import {offerFieldFacts} from '../src/field-facts.ts';
const data=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url),'utf8'));
const now=new Date(data.updatedAt);
const provider=createDemoProvider({clock:()=>now});
const input=region=>({query:'Apple AirPods 4 without ANC',destination:{country:'SA',region}});
test('demo reads JSON, identifies synthetic data and preserves update/observation times',async()=>{
  const result=await provider(input('asir'));
  assert.equal(result.mode,'demo');assert.equal(result.label,'بيانات تجريبية');
  assert.equal(result.updatedAt,data.updatedAt);assert.equal(result.offers.length,6);
  assert.ok(result.offers.every(o=>o.dataKind==='synthetic'&&!o.url));
  assert.equal(result.offers[0].evidence.price.checkedAt,data.products[0].price.checkedAt);
});
test('unknown shipping, different variant, blocked region and estimated price cannot win',async()=>{
  const payload=await provider(input('asir'));
  for(const priority of ['cheapest','fastest','balanced'] as const){
    const request=buildLiveRequest({region:'asir',priority,allowAlternatives:false});
    const result=compareExternal(payload.offers,request,now);
    assert.deepEqual(result.issues,[]);
    assert.ok(result.result?.winner);
    for(const id of ['unknown-shipping','different-variant','blocked-region','estimated-price'])
      assert.ok(!result.result?.ranking.some(a=>a.offer.id===id),`${priority}: ${id}`);
    const coupon=result.result!.assessed.find(a=>a.offer.id==='unverified-discount')!;
    assert.equal(coupon.couponApplied,false);assert.equal(coupon.total,449);
  }
});
test('same merchant has confirmed arrival in Asir and estimated arrival in Riyadh',async()=>{
  const asir=(await provider(input('asir'))).offers.find(o=>o.id==='regional');
  const riyadh=(await provider(input('riyadh'))).offers.find(o=>o.id==='regional');
  assert.equal(offerFieldFacts(asir,now).arrival.status,'confirmed');
  assert.equal(offerFieldFacts(riyadh,now).arrival.status,'estimated');
  assert.equal(asir.shippingCost,15);assert.equal(riyadh.shippingCost,10);
});
test('unlisted region stays unknown and does not borrow another regional quote',async()=>{
  const result=await provider(input('jazan'));
  const request=buildLiveRequest({region:'jazan',priority:'cheapest',allowAlternatives:false});
  assert.ok(result.offers.every(o=>o.shipping.available===null&&o.shippingCost===null));
  assert.equal(compareExternal(result.offers,request,now).result?.winner,null);
  await assert.rejects(provider(input('unknown')),/destination/);
});
test('data timestamps do not get refreshed by a later request',async()=>{
  const later=new Date(now.getTime()+3*86400000);
  const result=await createDemoProvider({clock:()=>later})(input('asir'));
  assert.equal(result.updatedAt,data.updatedAt);
  assert.equal(result.offers[0].evidence.cost.checkedAt,data.updatedAt);
  assert.equal(offerFieldFacts(result.offers[0],later).price.status,'unknown');
});
