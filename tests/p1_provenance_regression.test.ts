import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../src/coupon-policy.ts';
import { searchAndCompare } from '../src/search-client.ts';
import { demoOffers, demoRequest } from '../src/fixtures.ts';

// Contract-only fixtures. No live merchant API calls or prices.
const NOW = new Date('2026-10-15T10:30:00+03:00');
const QUERY = 'Apple AirPods 4 without ANC';
const request = () => demoRequest();
function couponOffer() {
  const o = structuredClone(demoOffers(NOW)[0]);
  o.dataKind='live';o.url='https://merchant.example/item';
  o.coupon={amount:10,verified:true,expiresAt:'2026-10-16T23:59:59+03:00',
    applicability:{offerId:o.id,amount:10,currency:'SAR',country:'SA',city:'Abha',
      merchandiseSubtotal:120,minimumMerchandiseSubtotal:0,terms:'TEST ONLY',conditionsConfirmed:true}};
  o.evidence.coupon={status:'confirmed',source:'https://merchant.example/coupon',
    checkedAt:'2026-10-15T10:00:00+03:00'};
  return o;
}
test('P1 coupon accepts explicit Saudi timezone and scoped proof',()=>{
  assert.equal(couponIsApplicable(couponOffer(),request(),NOW),true);
});
test('P1 coupon refuses expiry without explicit timezone',()=>{
  const o=couponOffer();o.coupon!.expiresAt='2026-10-16T23:59:59';
  assert.equal(couponIsApplicable(o,request(),NOW),false);
});
test('P1 coupon refuses evidence time without explicit timezone',()=>{
  const o=couponOffer();o.evidence.coupon.checkedAt='2026-10-15T10:00:00';
  assert.equal(couponIsApplicable(o,request(),NOW),false);
});
test('P1 coupon refuses date-only expiry instead of guessing end of day',()=>{
  const o=couponOffer();o.coupon!.expiresAt='2026-10-16';
  assert.equal(couponIsApplicable(o,request(),NOW),false);
});
test('P1 coupon rejects cross-merchant evidence',()=>{
  const o=couponOffer();o.evidence.coupon.source='https://different.example/coupon';
  assert.equal(couponIsApplicable(o,request(),NOW),false);
});
function livePayload(){
  const o=structuredClone(demoOffers(NOW)[0]);
  o.dataKind='live';o.url='https://merchant.example/item';delete o.coupon;
  for(const evidence of Object.values(o.evidence)){
    evidence.checkedAt=NOW.toISOString();evidence.source='https://merchant.example/item';
    evidence.status='confirmed';
  }
  return {mode:'live',query:QUERY,destination:{country:'SA',city:'Abha'},
    retrievedAt:NOW.toISOString(),offers:[o]};
}
const fetchPayload=(payload:unknown)=>async()=>new Response(JSON.stringify(payload),{status:200});
const clock=()=>NOW;
test('P1 live search rejects shipping evidence from another merchant',async()=>{
  const p=livePayload();p.offers[0].evidence.shipping.source='https://different.example/shipping';
  await assert.rejects(searchAndCompare(QUERY,request(),fetchPayload(p) as typeof fetch,clock),/الشحن/);
});
test('P1 live search accepts same-origin shipping proof',async()=>{
  const p=livePayload();
  const result=await searchAndCompare(QUERY,request(),fetchPayload(p) as typeof fetch,clock);
  assert.equal(result.result?.assessed.length,1);
});
test('P1 unknown shipping is not silently confirmed',async()=>{
  const p=livePayload();p.offers[0].shipping.available=null;p.offers[0].shippingCost=null;
  p.offers[0].evidence.shipping={status:'unknown',source:'',checkedAt:NOW.toISOString()};
  const result=await searchAndCompare(QUERY,request(),fetchPayload(p) as typeof fetch,clock);
  assert.equal(result.result?.ranking.length,0);
});
