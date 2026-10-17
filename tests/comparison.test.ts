import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,compare,safeUrl,deliveryText,sellerText,returnsText} from '../src/compare.ts';
import {demoOffers,demoRequest} from '../src/fixtures.ts';
import type {Offer,Request} from '../src/types.ts';

const NOW=new Date('2026-10-11T08:00:00Z');
const base=()=>structuredClone(demoOffers(NOW)[0]);
const req=()=>demoRequest();
const evaluate=(o:Offer,r:Request=req())=>assess(o,r,NOW);
const ranking=(offers:Offer[],r:Request=req())=>compare(offers,r,NOW);
function candidate(id:string,price:number,shipping=0):Offer{const o=base();o.id=id;o.price=price;o.shippingCost=shipping;return o;}
function couponProof(o:Offer):void {
 o.coupon!.applicability={offerId:o.id,amount:o.coupon!.amount,currency:o.currency,country:'SA',city:'Abha',merchandiseSubtotal:o.price!,minimumMerchandiseSubtotal:0,terms:'TEST ONLY: explicit no minimum, membership/payment conditions as declared',conditionsConfirmed:true};
}

test('QE01 exact synthetic offer has correct total but does not achieve purchase goal',()=>{
 const result=ranking([base()]);assert.equal(result.winner?.total,145);assert.equal(result.purchaseGoalMet,false);assert.equal(result.allSynthetic,true);
});
test('QE02 mandatory mismatch cannot be rescued by a low price',()=>{
 const r=req();r.mustHave={voltage:{equals:11.1}};const bad=candidate('bad',1);bad.specifications.voltage=7.4;const good=base();good.specifications.voltage=11.1;
 assert.equal(evaluate(bad,r).state,'excluded');assert.equal(ranking([bad,good],r).winner?.offer.id,'A');
});
test('QE03 missing mandatory specification is unverified',()=>{const r=req();r.mustHave={voltage:{equals:11.1}};assert.equal(evaluate(base(),r).state,'needs_verification');});
for(const [field,value]of Object.entries({model:'different',size:'50ml',concentration:'EDT',condition:'used',quantity:2})){
 test(`QE04–08 identity mismatch in ${field} is separated`,()=>{const o=base();Object.assign(o.identity,{[field]:value});assert.equal(evaluate(o).state,'separate_variant');assert.equal(ranking([o]).winner,null);});
}
test('QE09 cheaper item with expensive shipping is not cheapest total',()=>{assert.equal(ranking([candidate('item',90,50),candidate('total',110,0)]).winner?.offer.id,'total');});
test('QE10 unknown shipping is not silently zero',()=>{const o=candidate('unknown',1);o.shippingCost=null;const a=evaluate(o);assert.equal(a.total,null);assert.equal(a.state,'needs_verification');assert.equal(ranking([o,base()]).winner?.offer.id,'A');});
test('QE11 included tax is not added twice',()=>{const o=candidate('a',100,15);o.taxIncluded=true;o.tax=15;assert.equal(evaluate(o).total,115);});
test('QE12 excluded tax and confirmed fees are added',()=>{const o=candidate('a',100,10);o.taxIncluded=false;o.tax=15;o.fees=5;assert.equal(evaluate(o).total,130);});
test('QE13 unknown fees mean an incomplete total',()=>{const o=base();o.fees=null;assert.equal(evaluate(o).total,null);});
test('QE14 membership coupon does not apply automatically',()=>{const o=base();o.coupon={amount:20,verified:true,memberOnly:true};assert.equal(evaluate(o).total,145);assert.equal(evaluate(o).couponApplied,false);});
test('QE15 coupon requires fresh specific evidence',()=>{const o=base();o.coupon={amount:20,verified:true,memberOnly:true};couponProof(o);o.evidence.coupon={status:'confirmed',source:'اختبار كوبون',checkedAt:NOW.toISOString()};const r=req();r.member=true;assert.equal(evaluate(o,r).total,125);});
test('coupon verified flag alone cannot reduce total',()=>{const o=base();o.coupon={amount:20,verified:true};assert.equal(evaluate(o).total,145);assert.equal(evaluate(o).couponApplied,false);});
test('QE16 unverified coupon cannot establish a lower confirmed total',()=>{const o=base();o.coupon={amount:20,verified:false};assert.equal(evaluate(o).total,145);});
test('expired coupon does not apply',()=>{const o=base();o.coupon={amount:20,verified:true,expiresAt:'2026-10-10'};assert.equal(evaluate(o).total,145);});
test('payment-specific coupon needs evidence and matching method',()=>{const o=base();o.coupon={amount:20,verified:true,paymentMethod:'cardA'};couponProof(o);o.evidence.coupon={status:'confirmed',source:'اختبار كوبون',checkedAt:NOW.toISOString()};assert.equal(evaluate(o).total,145);const r=req();r.paymentMethod='cardA';assert.equal(evaluate(o,r).total,125);});
test('QE17 sold out offer is excluded',()=>{const o=base();o.availability='out_of_stock';assert.equal(evaluate(o).state,'excluded');});
test('QE18 Saudi shipping does not establish Abha delivery',()=>{const o=base();o.shipping.city='Riyadh';assert.equal(evaluate(o).state,'excluded');});
test('QE19 unknown destination support requires verification',()=>{const o=base();o.shipping.available=null;assert.equal(evaluate(o).state,'needs_verification');});
test('QE20 priority changes winner from cheaper to faster',()=>{const r=req();const cheap=base();const fast=candidate('fast',160);fast.delivery={minDays:1,maxDays:2,status:'confirmed'};assert.equal(ranking([cheap,fast],r).winner?.offer.id,'A');r.priority='fastest';assert.equal(ranking([cheap,fast],r).winner?.offer.id,'fast');});
test('QE21 estimated delivery remains explicitly estimated and is not guaranteed for a deadline',()=>{const o=base();o.delivery.status='estimated';assert.ok(evaluate(o).warnings.some(x=>x.includes('تقديري')));const r=req();r.deadlineDays=10;assert.equal(evaluate(o,r).state,'needs_verification');});
test('unknown duration cannot win fastest priority',()=>{const o=candidate('unknown',1);o.delivery.minDays=null;o.delivery.maxDays=null;o.delivery.status='unknown';const r=req();r.priority='fastest';assert.equal(ranking([o,base()],r).winner?.offer.id,'A');});
test('QE22 balance is deterministic and exposes its rule',()=>{const r=req();r.priority='balanced';const a=ranking(demoOffers(NOW),r);const b=ranking(demoOffers(NOW),r);assert.equal(a.winner?.offer.id,b.winner?.offer.id);assert.match(a.balanceRule,/60%/);});
test('QE23 seller price and return policies remain separate',()=>{const a=base();const b=candidate('B',160);b.seller='other';b.returns={days:7,cost:20,notes:'paid',status:'confirmed'};const result=ranking([a,b]);assert.equal(result.ranking.length,2);assert.equal(result.ranking[0].offer.returns.cost,0);assert.equal(result.ranking[1].offer.returns.cost,20);});
test('QE24 alternative cannot enter requested-product ranking without permission',()=>{const alt=candidate('alt',1);alt.identity.size='50ml';assert.equal(ranking([alt,base()]).ranking.length,1);});
test('QE25 permitted alternatives are a separate group after the requested product',()=>{const alt=candidate('alt',1);alt.identity.size='50ml';const r=req();r.allowAlternatives=true;const result=ranking([alt,base()],r);assert.equal(result.ranking[0].group,'exact');assert.equal(result.ranking[1].group,'alternative');});
test('QE26 budget includes shipping',()=>{const r=req();r.budget=100;assert.equal(evaluate(candidate('over',95,10),r).state,'excluded');assert.equal(evaluate(candidate('within',90,10),r).state,'eligible');});
test('QE27 conflicting price evidence does not produce a winner',()=>{const o=base();o.evidence.cost.status='conflicting';assert.equal(ranking([o]).winner,null);});
test('live offer with unsafe purchase URL needs verification',()=>{const o=base();o.dataKind='live';o.url='javascript:alert(1)';assert.equal(evaluate(o).state,'needs_verification');});
test('QE29 negative amount is excluded, not a bargain',()=>{const o=base();o.price=-5;assert.equal(evaluate(o).state,'excluded');assert.equal(evaluate(o).total,null);});
test('QE30 unsupported currency cannot win without sourced conversion',()=>{const o=candidate('USD',1);o.currency='USD';assert.equal(evaluate(o).state,'needs_verification');assert.equal(ranking([o,base()]).winner?.offer.id,'A');});
test('stale and future evidence require verification',()=>{for(const date of ['2026-10-09T08:00:00Z','2026-10-12T08:00:00Z']){const o=base();o.evidence.cost.checkedAt=date;assert.equal(evaluate(o).state,'needs_verification');}});
test('confirmed arrival after required deadline is excluded',()=>{const r=req();r.deadlineDays=3;assert.equal(evaluate(base(),r).state,'excluded');});
test('money calculations preserve cents',()=>{assert.equal(evaluate(candidate('cents',.1,.2)).total,.3);});
test('discount above total is invalid',()=>{const o=base();o.coupon={amount:200,verified:true};assert.equal(evaluate(o).state,'excluded');});
test('safe links require HTTPS and disallow credentials',()=>{assert.equal(safeUrl('https://example.com/product'),true);for(const s of ['javascript:alert(1)','data:text/html,x','http://example.com','https://user:pass@example.com'])assert.equal(safeUrl(s),false);});
test('quality regression: reversed delivery interval cannot win fastest',()=>{const bad=candidate('invalid-duration',1);bad.delivery={minDays:10,maxDays:1,status:'confirmed'};const r=req();r.priority='fastest';assert.equal(ranking([bad,base()],r).winner?.offer.id,'A');});
test('quality regression: cheap alternative cannot alter exact-product balance winner',()=>{const cheap=candidate('cheap',100);cheap.delivery={minDays:10,maxDays:10,status:'confirmed'};const fast=candidate('fast',200);fast.delivery={minDays:1,maxDays:1,status:'confirmed'};const r=req();r.priority='balanced';r.allowAlternatives=true;const before=ranking([cheap,fast],r).winner?.offer.id;const alt=candidate('alt',1);alt.identity.model='other';assert.equal(ranking([cheap,fast,alt],r).winner?.offer.id,before);});
test('quality regression: huge finite value cannot produce Infinity winner',()=>{const o=candidate('huge',1e308);const r=ranking([o]);assert.equal(r.winner,null);assert.equal(r.assessed[0].total,null);});
test('sum of valid components beyond integer safety is rejected',()=>{const o=candidate('overflow',90_000_000_000_000,90_000_000_000_000);assert.equal(evaluate(o).state,'excluded');assert.equal(evaluate(o).total,null);});
test('quality regression: unknown and conflicting delivery are not described as confirmed',()=>{for(const status of ['unknown','conflicting'] as const){const o=base();o.delivery.status=status;assert.match(deliveryText(o,NOW),/غير موثق/);assert.doesNotMatch(deliveryText(o,NOW),/مؤكد/);}});
test('quality regression: reversed delivery interval is not described as confirmed',()=>{const o=base();o.delivery.minDays=10;o.delivery.maxDays=1;assert.match(deliveryText(o,NOW),/غير موثق/);});
test('quality regression: seller identity flag requires confirmed fresh evidence',()=>{const o=base();o.sellerEvidence.status='unknown';assert.match(sellerText(o,NOW),/غير مكتمل/);o.sellerEvidence.status='confirmed';o.evidence.seller.checkedAt='2026-10-09';assert.match(sellerText(o,NOW),/غير مكتمل/);});
test('return-policy display requires days, cost, and fresh evidence',()=>{const o=base();o.returns.cost=null;assert.match(returnsText(o,NOW),/غير موثقة/);});


test('P1 impossible cost timestamp excludes ranking',()=>{const o=base();o.evidence.cost.checkedAt='2026-02-30T11:00:00Z';assert.equal(ranking([o]).winner,null);});
