import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLiveProductEvidence } from '../src/live-proof.ts';
import { gateLiveOffers } from '../src/live-offer-gate.ts';
import { compareExternal } from '../src/ingest.ts';

const at = '2026-10-26T07:00:00.000Z';
const now = new Date(at);
const url = 'https://merchant.example/products/airpods-4?variant=MXP63';
const quote = url + '&country=SA&city=Abha&shipping_cost=0';
const proof = (source = url) => ({status:'confirmed' as const,source,checkedAt:at});
const request: any = {
 identity:{model:'AirPods 4',condition:'new',quantity:1},
 mustHave:{anc:{equals:0},charging:{equals:'USB-C'}},
 country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false,
};
function offer(id='good'): any { return {
 id,seller:'Test merchant',title:'AirPods 4 without ANC',url,
 identity:{model:'AirPods 4',condition:'new',quantity:1},specifications:{anc:0,charging:'USB-C'},
 currency:'SAR',price:449,shippingCost:0,taxIncluded:true,tax:null,fees:0,
 availability:'in_stock',shipping:{available:true,country:'SA',city:'Abha'},
 delivery:{minDays:1,maxDays:2,status:'confirmed'},returns:{days:7,cost:0,notes:'test',status:'confirmed'},
 sellerEvidence:{verifiedIdentity:true,status:'confirmed'},
 evidence:{identity:proof(),'spec:anc':proof(),'spec:charging':proof(),cost:proof(),availability:proof(),shipping:proof(quote),delivery:proof(quote),returns:proof(),seller:proof()},
 dataKind:'live',
};}
function checked(items: any[]) {
 const gated = gateLiveOffers(items,request,now,now);
 return {gated,compared:compareExternal(gated.offers,request,now)};
}
test('P1 identity proof for another product path is rejected',()=>{
 const bad=offer();bad.evidence.identity.source='https://merchant.example/products/airpods-pro';
 assert.throws(()=>validateLiveProductEvidence(bad,request,now,now),/هوية المنتج/);
});
test('P1 mandatory spec proof for a different SKU variant is rejected',()=>{
 const bad=offer();bad.evidence['spec:anc'].source='https://merchant.example/products/airpods-4?variant=ANC';
 assert.throws(()=>validateLiveProductEvidence(bad,request,now,now),/anc/);
});
test('P1 cost proof from another same-merchant product is quarantined without losing good offer',()=>{
 const bad=offer('bad');bad.evidence.cost.source='https://merchant.example/products/airpods-pro';
 const {gated,compared}=checked([bad,offer('good')]);
 assert.equal(compared.result?.assessed.length,1);
 assert.equal(compared.result?.assessed[0].offer.id,'good');
 assert.ok(gated.issues.some(i=>i.path==='offers[0].evidence'));
});
test('P1 availability proof for different SKU variant is quarantined',()=>{
 const bad=offer('bad');bad.evidence.availability.source='https://merchant.example/products/airpods-4?variant=ANC';
 const {gated,compared}=checked([bad,offer('good')]);
 assert.equal(compared.result?.assessed.length,1);
 assert.ok(gated.issues.some(i=>i.path==='offers[0].evidence'));
});
test('P1 tracking query differences do not reject same product and variant',()=>{
 const good=offer();
 good.evidence.identity.source=url+'&utm_source=merchant';
 good.evidence.cost.source=url+'&utm_campaign=verified';
 const {gated,compared}=checked([good]);
 assert.ok(gated.issues.every(i=>i.path.endsWith('.seller')));
 assert.equal(compared.result?.assessed.length,1);
});
