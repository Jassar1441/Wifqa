import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../src/coupon-policy.ts';

function fixture(expiresAt: string): any {
 const now = '2026-10-25T12:00:00Z';
 const identity={model:'AirPods 4',condition:'new',quantity:1};
 const offer={id:'offer1',seller:'Merchant',identity,price:449,currency:'SAR',dataKind:'live',url:'https://merchant.example/airpods-4',
  coupon:{amount:20,verified:true,expiresAt,applicability:{offerId:'offer1',seller:'Merchant',identity,amount:20,currency:'SAR',country:'SA',city:'Abha',merchandiseSubtotal:449,minimumMerchandiseSubtotal:0,terms:'valid test-only offer',conditionsConfirmed:true}},
  evidence:{coupon:{status:'confirmed',source:'https://merchant.example/coupon',checkedAt:now}}};
 const request={country:'SA',city:'Abha',currency:'SAR'};
 return {offer,request};
}
function applicable(expiry: string, now: string) {
 const {offer,request}=fixture(expiry);
 offer.evidence.coupon.checkedAt=now;
 return couponIsApplicable(offer,request,new Date(now));
}
test('Saudi date-only coupon is valid through last millisecond of local expiry day',()=>{
 assert.equal(applicable('2026-10-25','2026-10-25T20:59:59.999Z'),true);
});
test('Saudi date-only coupon expires at 00:00 the next local day',()=>{
 assert.equal(applicable('2026-10-25','2026-10-25T21:00:00.000Z'),false);
});
test('impossible date-only expiry never applies',()=>{
 assert.equal(applicable('2026-02-30','2026-02-28T20:00:00Z'),false);
});
test('explicit UTC timestamp preserves exact instant',()=>{
 assert.equal(applicable('2026-10-25T18:00:00Z','2026-10-25T18:00:00Z'),true);
 assert.equal(applicable('2026-10-25T18:00:00Z','2026-10-25T18:00:00.001Z'),false);
});
test('ambiguous local timestamp cannot authorize discount',()=>{
 assert.equal(applicable('2026-10-25T23:59:59','2026-10-25T17:00:00Z'),false);
});
