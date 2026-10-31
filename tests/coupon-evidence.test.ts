import test from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/compare.ts';
import { compareExternal } from '../src/ingest.ts';
import { demoOffers, demoRequest } from '../src/fixtures.ts';
import type { Offer } from '../src/types.ts';

// Contract fixtures only. example.invalid is deliberately NOT a real store.
const NOW = new Date('2026-10-11T08:00:00Z');
const fixture = (): Offer => {
 const o = structuredClone(demoOffers(NOW)[0]);
 o.dataKind='live'; o.url='https://example.invalid/test-product';
 o.coupon={amount:20,verified:true,expiresAt:'2026-10-12T08:00:00Z',applicability:{
  offerId:o.id,seller:o.seller,identity:structuredClone(o.identity),amount:20,currency:'SAR',country:'SA',city:'Abha',
  merchandiseSubtotal:120,minimumMerchandiseSubtotal:0,
  terms:'TEST ONLY: fixed SAR20 off this offer, no membership or payment restrictions',conditionsConfirmed:true,
 }};
 o.evidence.coupon={status:'confirmed',source:o.url,checkedAt:NOW.toISOString()};
 return o;
};
test('coupon contract: complete fresh proof applies without mutating input',()=>{
 const o=fixture(),before=structuredClone(o),r=assess(o,demoRequest(),NOW);
 assert.equal(r.total,125);assert.equal(r.couponApplied,true);assert.deepEqual(o,before);
});
const mutations: [string,(o:Offer)=>void][] = [
 ['missing separate evidence',o=>{delete o.evidence.coupon;}],
 ['stale proof',o=>{o.evidence.coupon.checkedAt='2026-10-10T07:59:59Z';}],
 ['future proof',o=>{o.evidence.coupon.checkedAt='2026-10-11T08:00:01Z';}],
 ['invalid proof date',o=>{o.evidence.coupon.checkedAt='invalid';}],
 ['unknown proof',o=>{o.evidence.coupon.status='unknown';}],
 ['conflicting proof',o=>{o.evidence.coupon.status='conflicting';}],
 ['missing source',o=>{o.evidence.coupon.source='';}],
 ['unsafe live source',o=>{o.evidence.coupon.source='javascript:alert(1)';}],
 ['missing applicability',o=>{delete o.coupon!.applicability;}],
 ['wrong offer',o=>{o.coupon!.applicability!.offerId='other';}],
 ['different amount',o=>{o.coupon!.applicability!.amount=10;}],
 ['wrong currency',o=>{o.coupon!.applicability!.currency='USD';}],
 ['wrong city',o=>{o.coupon!.applicability!.city='Riyadh';}],
 ['wrong country',o=>{o.coupon!.applicability!.country='AE';}],
 ['unknown terms',o=>{o.coupon!.applicability!.conditionsConfirmed=false;}],
 ['empty terms',o=>{o.coupon!.applicability!.terms=' ';}],
 ['expired',o=>{o.coupon!.expiresAt='2026-10-11T07:59:59Z';}],
 ['invalid expiry',o=>{o.coupon!.expiresAt='invalid';}],
 ['membership required',o=>{o.coupon!.memberOnly=true;}],
 ['payment restriction',o=>{o.coupon!.paymentMethod='specific-card';}],
];
for(const [name,mutate] of mutations)test('coupon fail-closed: '+name,()=>{
 const o=fixture();mutate(o);const r=assess(o,demoRequest(),NOW);
 assert.equal(r.total,145);assert.equal(r.couponApplied,false);assert.ok(r.warnings.some(x=>x.includes('كوبون')));
});
test('freshness boundary is inclusive at 24h',()=>{
 const o=fixture();o.evidence.coupon.checkedAt='2026-10-10T08:00:00Z';
 assert.equal(assess(o,demoRequest(),NOW).total,125);
});
test('external boundary rejects malformed applicability booleans and fields',()=>{
 for(const value of [{conditionsConfirmed:'true'},{...fixture().coupon!.applicability,conditionsConfirmed:'true'}]){
  const o=fixture() as any;o.coupon.applicability=value;
  const r=compareExternal([o],demoRequest(),NOW);
  assert.equal(r.result?.ranking.length,0);assert.ok(r.issues.some(x=>x.path.endsWith('coupon.applicability')));
 }
});
test('C1: low merchandise price cannot use proof evaluated against the earlier subtotal',()=>{
 const o=fixture();o.price=30;o.coupon!.applicability!.minimumMerchandiseSubtotal=100;
 o.coupon!.applicability!.terms='TEST ONLY Minimum merchandise subtotal SAR100';
 const r=compareExternal([o],demoRequest(),NOW).result!.assessed[0];
 assert.equal(r.total,55);assert.equal(r.couponApplied,false);
});
test('C1: newly bound subtotal below minimum still cannot receive discount',()=>{
 const o=fixture();o.price=30;o.coupon!.applicability!.merchandiseSubtotal=30;
 o.coupon!.applicability!.minimumMerchandiseSubtotal=100;
 const r=compareExternal([o],demoRequest(),NOW).result!.assessed[0];
 assert.equal(r.total,55);assert.equal(r.couponApplied,false);
});
test('shipping and fees cannot make merchandise qualify for a minimum',()=>{
 const o=fixture();o.price=90;o.shippingCost=25;o.fees=5;
 o.coupon!.applicability!.merchandiseSubtotal=90;o.coupon!.applicability!.minimumMerchandiseSubtotal=100;
 const r=assess(o,demoRequest(),NOW);assert.equal(r.total,120);assert.equal(r.couponApplied,false);
});
test('exact minimum merchandise subtotal qualifies',()=>{
 const o=fixture();o.price=100;o.coupon!.applicability!.merchandiseSubtotal=100;
 o.coupon!.applicability!.minimumMerchandiseSubtotal=100;
 const r=assess(o,demoRequest(),NOW);assert.equal(r.total,105);assert.equal(r.couponApplied,true);
});
test('missing minimum is unknown, not an implied zero',()=>{
 const o=fixture();delete (o.coupon!.applicability as any).minimumMerchandiseSubtotal;
 assert.equal(assess(o,demoRequest(),NOW).couponApplied,false);
 const r=compareExternal([o],demoRequest(),NOW);assert.ok(r.issues.some(x=>x.path.endsWith('coupon.applicability')));
});
test('missing or nonfinite evaluated subtotal cannot assert applicability',()=>{
 for(const subtotal of [undefined,NaN,Infinity,-1]) {
  const o=fixture();(o.coupon!.applicability as any).merchandiseSubtotal=subtotal;
  assert.equal(assess(o,demoRequest(),NOW).couponApplied,false);
  assert.ok(compareExternal([o],demoRequest(),NOW).issues.some(x=>x.path.endsWith('coupon.applicability')));
 }
});
