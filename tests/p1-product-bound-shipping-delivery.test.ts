import test from 'node:test';
import assert from 'node:assert/strict';
import { gateLiveOffers } from '../src/live-offer-gate.ts';
import type { Offer, Request } from '../src/types.ts';

const at = '2026-10-28T07:00:00.000Z';
const now = new Date(at);
const url = 'https://merchant.example/airpods-4?variant=no-anc';
const quote = url + '&country=SA&city=Abha&shipping_cost=25&delivery_min_days=1&delivery_max_days=2';
const proof = (source = url) => ({status:'confirmed' as const,source,checkedAt:at});
const request: Request = {
  identity:{model:'AirPods 4',condition:'new',quantity:1},mustHave:{anc:{equals:0}},
  country:'SA',city:'Abha',currency:'SAR',priority:'fastest',allowAlternatives:false,
};
function offer(id:string):Offer {
 return {id,seller:'Synthetic test merchant',title:'AirPods 4 synthetic record',
  identity:{model:'AirPods 4',condition:'new',quantity:1},specifications:{anc:0},currency:'SAR',
  price:450,shippingCost:25,taxIncluded:true,tax:null,fees:0,availability:'in_stock',
  shipping:{available:true,country:'SA',city:'Abha'},delivery:{minDays:1,maxDays:2,status:'confirmed'},
  returns:{days:null,cost:null,notes:'غير موثق',status:'unknown'},
  sellerEvidence:{verifiedIdentity:false,status:'unknown'},
  evidence:{identity:proof(),'spec:anc':proof(),cost:proof(),availability:proof(),shipping:proof(quote),delivery:proof(quote)},
  dataKind:'live',url};
}
test('shipping evidence for another variant on same merchant is quarantined, not used for delivered total',()=>{
 const bad=offer('wrong-shipping');bad.evidence.shipping=proof('https://merchant.example/airpods-4?variant=anc');
 const gated=gateLiveOffers([bad,offer('valid')],request,now,now);
 assert.equal(gated.offers[0],null);
 assert.equal((gated.offers[1] as Offer).id,'valid');
 assert.ok(gated.issues.some(x=>x.path==='offers[0].evidence' && /الشحن/.test(x.message)));
});
test('shipping evidence from a different product page on same merchant is quarantined',()=>{
 const bad=offer('wrong-product');bad.evidence.shipping=proof('https://merchant.example/airpods-pro');
 assert.equal(gateLiveOffers([bad],request,now,now).offers[0],null);
});
test('delivery evidence for another variant on same merchant cannot claim fastest',()=>{
 const bad=offer('wrong-eta');bad.evidence.delivery=proof('https://merchant.example/airpods-4?variant=anc');
 const gated=gateLiveOffers([bad],request,now,now);
 const kept=gated.offers[0] as Offer;
 assert.equal(kept.id,'wrong-eta');
 assert.equal(kept.delivery.status,'unknown');
 assert.equal(kept.delivery.maxDays,null);
 assert.equal(kept.evidence.delivery,undefined);
 assert.ok(gated.issues.some(x=>x.path==='claims[0].delivery'));
});
test('delivery evidence from another product path is downgraded without quarantining offer',()=>{
 const bad=offer('wrong-path');bad.evidence.delivery=proof('https://merchant.example/airpods-pro');
 const gated=gateLiveOffers([bad],request,now,now);
 assert.equal((gated.offers[0] as Offer).delivery.status,'unknown');
 assert.equal(gated.issues.length,1);
});
test('same exact product and variant evidence with tracking-only parameters is retained',()=>{
 const valid=offer('tracked');
 valid.evidence.shipping=proof(quote+'&utm_source=campaign');
 valid.evidence.delivery=proof(quote+'&gclid=abc');
 const gated=gateLiveOffers([valid],request,now,now);
 assert.equal((gated.offers[0] as Offer).delivery.status,'confirmed');
 assert.equal((gated.offers[0] as Offer).shippingCost,25);
 assert.deepEqual(gated.issues,[]);
});
