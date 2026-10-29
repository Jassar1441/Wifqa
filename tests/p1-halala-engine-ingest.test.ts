import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, compare } from '../src/compare.ts';
import { compareExternal, offerIssues, requestIssues } from '../src/ingest.ts';
import type { Offer, Request } from '../src/types.ts';

// Synthetic fixtures only. No live merchant or checkout claim.
const now = new Date('2026-10-29T07:00:00Z');
const proof = {status:'confirmed' as const,source:'synthetic test fixture',checkedAt:now.toISOString()};
const request: Request = {identity:{model:'TEST-ONE',condition:'new',quantity:1},mustHave:{},country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false};
function fixture(id='valid'): Offer {
 return {id,title:'Synthetic test',seller:'Test seller',identity:{...request.identity},specifications:{},
  price:100,shippingCost:10,taxIncluded:true,tax:null,fees:0,currency:'SAR',availability:'in_stock',
  shipping:{available:true,country:'SA',city:'Abha'},delivery:{minDays:2,maxDays:3,status:'confirmed'},
  returns:{days:14,cost:0,notes:'Synthetic',status:'confirmed'},sellerEvidence:{verifiedIdentity:false,status:'unknown'},
  evidence:{identity:{...proof},availability:{...proof},shipping:{...proof},cost:{...proof},delivery:{...proof}},dataKind:'synthetic'};
}

test('P1 engine: fractional halala product price must not be rounded into a confirmed total',()=>{
 const o=fixture();o.price=100.005;const a=assess(o,request,now);
 assert.equal(a.state,'excluded');assert.equal(a.total,null);assert.equal(compare([o],request,now).winner,null);
});
test('P1 engine: fractional halala shipping and fees cannot influence cheapest ranking',()=>{
 for(const key of ['shippingCost','fees'] as const){const o=fixture(key);o[key]=0.005;const a=assess(o,request,now);assert.equal(a.state,'excluded',key);assert.equal(a.total,null,key);}
});
test('P1 engine: fractional halala excluded tax cannot become a confirmed total',()=>{
 const o=fixture();o.taxIncluded=false;o.tax=15.005;const a=assess(o,request,now);
 assert.equal(a.state,'excluded');assert.equal(a.total,null);
});
test('P1 engine: fractional halala budget is rejected rather than rounded',()=>{
 const o=fixture();const a=assess(o,{...request,budget:110.005},now);
 assert.equal(a.state,'excluded');assert.ok(a.reasons.some(x=>x.includes('ميزانية غير صالحة')));
});
test('P1 engine: legitimate two-decimal amounts remain exact',()=>{
 const o=fixture();o.price=100.1;o.shippingCost=0.2;o.fees=0.05;
 const a=assess(o,request,now);assert.equal(a.state,'eligible');assert.equal(a.total,100.35);
});
test('P1 ingress: fractional price is quarantined per offer; valid competitor stays rankable',()=>{
 const bad=fixture('bad');bad.price=99.005;const good=fixture('good');
 const result=compareExternal([bad,good],request,now);
 assert.equal(result.result?.ranking.length,1);assert.equal(result.result?.winner?.offer.id,'good');
 assert.ok(result.issues.some(i=>i.path==='offers[0].price'));
});
test('P1 ingress: fractional shipping, fees and tax each get field-specific issues',()=>{
 for(const key of ['shippingCost','fees','tax'] as const){const o=fixture();o[key]=0.005;
  assert.ok(offerIssues(o).some(i=>i.path===key),key);
 }
});
test('P1 ingress: fractional coupon amount and basket minimum are rejected structurally',()=>{
 const o=fixture();o.coupon={amount:20.005,verified:true,applicability:{offerId:o.id,seller:o.seller,identity:{...o.identity},amount:20.005,currency:'SAR',country:'SA',city:'Abha',merchandiseSubtotal:100,minimumMerchandiseSubtotal:0.005,terms:'Synthetic only',conditionsConfirmed:true}};
 const issues=offerIssues(o);
 assert.ok(issues.some(i=>i.path==='coupon'));
 assert.ok(issues.some(i=>i.path==='coupon.applicability'));
});
test('P1 ingress: fractional budget fails request validation before ranking',()=>{
 assert.ok(requestIssues({...request,budget:110.005}).some(i=>i.path==='budget'));
});
test('P1 ingress: valid cents and nullable tax remain accepted',()=>{
 const o=fixture();o.price=100.1;o.shippingCost=0.2;o.fees=0.05;
 assert.deepEqual(offerIssues(o),[]);
 assert.deepEqual(requestIssues({...request,budget:110.35}),[]);
});
