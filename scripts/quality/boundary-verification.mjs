import assert from 'node:assert/strict';
import {compareExternal} from '../../src/ingest.ts';
import {compare} from '../../src/compare.ts';
import {demoOffers,demoRequest} from '../../src/fixtures.ts';
const now=new Date('2026-10-11T08:00:00+03:00');
const base=()=>structuredClone(demoOffers(now)[0]);
const mutations=[
 ['null_identity',o=>o.identity=null],
 ['missing_shipping',o=>delete o.shipping],
 ['missing_evidence',o=>delete o.evidence],
 ['string_tax_false',o=>o.taxIncluded='false'],
 ['string_coupon_verified_false',o=>o.coupon={amount:20,verified:'false'}],
 ['unknown_data_kind',o=>o.dataKind='unexpected'],
 ['invalid_delivery_status',o=>o.delivery.status='invalid']
];
for(const[id,mutate]of mutations){
 const bad=base();bad.id='bad';mutate(bad);
 const good=base();good.id='good';
 const r=compareExternal([bad,good],demoRequest(),now);
 assert.ok(r.issues.length>0,id);
 assert.deepEqual(r.result.ranking.map(a=>a.offer.id),['good'],id);
 console.log('PASS boundary isolates '+id);
}
for(const c of [{min:NaN},{min:12,max:7}]){
 const req=demoRequest();req.mustHave={voltage:c};
 assert.equal(compareExternal([base()],req,now).result,null);
}
const req=demoRequest();req.allowAlternatives='false';
assert.equal(compareExternal([base()],req,now).result,null);
const live=base();live.dataKind='live';live.url='https://example.invalid/no-product';
const r=compare([live],demoRequest(),now);
assert.equal(r.eligibleLiveCandidateCount,1);
assert.equal(r.purchaseGoalMet,false);
assert.equal(r.fulfillmentStatus,'not_verified');
console.log('PASS invalid request bounds/booleans and candidate-only fulfillment contract');
