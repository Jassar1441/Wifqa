import test from 'node:test';
import assert from 'node:assert/strict';
import { gateLiveOffers } from '../src/live-offer-gate.ts';
import { liveIssueSummary } from '../src/live-issues.ts';
import { compareExternal } from '../src/ingest.ts';

const at='2026-10-25T07:00:00.000Z';
const clock=new Date(at);
const proof=()=>({status:'confirmed',source:'https://merchant.example/airpods-4',checkedAt:at});
const quote='https://merchant.example/airpods-4?country=SA&city=Abha&shipping_cost=0&delivery_min_days=1&delivery_max_days=2';
const request:any={identity:{model:'AirPods 4',condition:'new',quantity:1},mustHave:{anc:{equals:0},charging:{equals:'USB-C'}},country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false};
function offer(id='a'):any{return {
 id,seller:'Test-only merchant',title:'Test-only AirPods 4',identity:{model:'AirPods 4',condition:'new',quantity:1},
 specifications:{anc:0,charging:'USB-C'},currency:'SAR',price:449,shippingCost:0,taxIncluded:true,tax:null,fees:0,
 availability:'in_stock',shipping:{available:true,country:'SA',city:'Abha'},
 delivery:{minDays:1,maxDays:2,status:'confirmed'},returns:{days:7,cost:0,notes:'test only',status:'confirmed'},
 sellerEvidence:{verifiedIdentity:true,status:'confirmed'},
 evidence:{identity:proof(),'spec:anc':proof(),'spec:charging':proof(),cost:proof(),availability:proof(),shipping:{...proof(),source:quote},delivery:{...proof(),source:quote},returns:proof(),seller:proof()},
 dataKind:'live',url:'https://merchant.example/airpods-4'};}
function run(raw:any[]){const gated=gateLiveOffers(raw,request,clock,clock);const compared=compareExternal(gated.offers,request,clock);return {gated,compared,issues:[...gated.issues,...compared.issues]};}

test('valid live record remains eligible while unproven seller identity is downgraded',()=>{const r=run([offer()]);assert.equal(r.compared.result?.assessed.length,1);assert.equal(r.issues.length,1);assert.equal(r.issues[0].path,'claims[0].seller');assert.equal(r.compared.result?.assessed[0].offer.sellerEvidence.verifiedIdentity,false);});
test('bad product identity proof quarantines only that record, not another merchant offer',()=>{
 const bad=offer('bad');bad.evidence.identity.source='https://another.example/product';
 const r=run([bad,offer('good')]);assert.equal(r.compared.result?.assessed.length,1);assert.match(liveIssueSummary(r.issues)!,/عزل 1 عرض/);
});
test('missing mandatory specification proof quarantines one offer',()=>{const bad=offer();delete bad.evidence['spec:anc'];const r=run([bad,offer('good')]);assert.equal(r.compared.result?.assessed.length,1);assert.ok(r.issues.some(x=>x.path==='offers[0].evidence'));});
test('old shipping proof cannot support a shipping claim',()=>{const bad=offer();bad.evidence.shipping.checkedAt='2026-10-24T07:00:00Z';assert.equal(run([bad,offer('good')]).compared.result?.assessed.length,1);});
test('old cost proof cannot support live price',()=>{const bad=offer();bad.evidence.cost.checkedAt='2026-10-24T07:00:00Z';assert.equal(run([bad,offer('good')]).compared.result?.assessed.length,1);});
test('malformed coupon terms remove only discount, preserve product and warn accurately',()=>{
 const bad=offer();bad.coupon={amount:100,verified:true,applicability:{seller:'wrong'}};
 const r=run([bad]);assert.equal(r.compared.result?.assessed.length,1);assert.equal(r.gated.offers[0].coupon,undefined);
 assert.match(liveIssueSummary(r.issues)!,/أُلغي خصم/);assert.doesNotMatch(liveIssueSummary(r.issues)!,/عزل \d+ عرض/);
});
test('malformed coupon evidence removes coupon proof without hiding product',()=>{
 const bad=offer();bad.coupon={amount:10,verified:true};bad.evidence.coupon={status:'confirmed',source:77,checkedAt:at};
 const r=run([bad]);assert.equal(r.compared.result?.assessed.length,1);assert.equal(r.gated.offers[0].coupon,undefined);assert.equal(r.gated.offers[0].evidence.coupon,undefined);
});
test('malformed base price remains quarantined and is never made eligible',()=>{const bad=offer();bad.price='449';const r=run([bad,offer('good')]);assert.equal(r.compared.result?.assessed.length,1);assert.match(liveIssueSummary(r.issues)!,/عزل 1 عرض/);});
test('synthetic record mixed with live is rejected for the whole response',()=>{const bad=offer();bad.dataKind='synthetic';assert.throws(()=>run([offer('good'),bad]),/بيانات تجريبية/);});
test('duplicate source identifiers remain rejected by the external boundary',()=>{const r=run([offer('same'),offer('same')]);assert.equal(r.compared.result?.assessed.length,1);assert.match(liveIssueSummary(r.issues)!,/عزل 1 عرض/);});
test('malformed coupon plus bad identity proof reports both, but never counts discount as rejected offer',()=>{
 const bad=offer();bad.coupon={amount:'invalid',verified:true};bad.evidence.identity.source='https://another.example/p';
 const r=run([bad]);assert.equal(r.compared.result?.assessed.length,0);const notice=liveIssueSummary(r.issues)!;
 assert.match(notice,/عزل 1 عرض/);assert.match(notice,/أُلغي خصم/);
});
