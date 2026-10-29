import test from 'node:test';
import assert from 'node:assert/strict';
import {couponIsApplicable} from '../src/coupon-policy.ts';
import type {Offer,Request} from '../src/types.ts';

const now = new Date('2026-10-28T14:00:00Z');
const product = 'https://merchant.example/airpods-4?variant=no-anc';
const request: Request={identity:{model:'AirPods 4',condition:'new',quantity:1},mustHave:{},country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false};
function offer():Offer {
  return {id:'live-one',seller:'Test merchant',title:'Fixture only',identity:{...request.identity},specifications:{},currency:'SAR',price:450,shippingCost:20,taxIncluded:true,tax:null,fees:0,availability:'in_stock',shipping:{available:true,country:'SA',city:'Abha'},delivery:{minDays:null,maxDays:null,status:'unknown'},returns:{days:null,cost:null,notes:'',status:'unknown'},sellerEvidence:{verifiedIdentity:false,status:'unknown'},dataKind:'live',url:product,
    evidence:{coupon:{status:'confirmed',source:product,checkedAt:now.toISOString()}},
    coupon:{amount:20,verified:true,applicability:{offerId:'live-one',seller:'Test merchant',identity:{...request.identity},amount:20,currency:'SAR',country:'SA',city:'Abha',merchandiseSubtotal:450,minimumMerchandiseSubtotal:0,terms:'Coupon scoped to this model and merchant',conditionsConfirmed:true}}};
}
test('P1 coupon evidence from different variant at same merchant must not apply',()=>{
 const o=offer();o.evidence.coupon.source='https://merchant.example/airpods-4?variant=anc';
 assert.equal(couponIsApplicable(o,request,now),false);
});
test('P1 coupon evidence from another product page at same merchant must not apply',()=>{
 const o=offer();o.evidence.coupon.source='https://merchant.example/airpods-pro?variant=no-anc';
 assert.equal(couponIsApplicable(o,request,now),false);
});
test('P1 coupon proof for same product with tracking-only parameters still applies',()=>{
 const o=offer();o.evidence.coupon.source=product+'&utm_campaign=offer';
 assert.equal(couponIsApplicable(o,request,now),true);
});
test('P1 coupon amount with fraction of halala cannot be counted',()=>{
 const o=offer();o.coupon!.amount=20.005;o.coupon!.applicability!.amount=20.005;
 assert.equal(couponIsApplicable(o,request,now),false);
});
test('P1 coupon merchandise subtotal with fraction of halala cannot be counted',()=>{
 const o=offer();o.price=450.005;o.coupon!.applicability!.merchandiseSubtotal=450.005;
 assert.equal(couponIsApplicable(o,request,now),false);
});
test('P1 coupon minimum with fraction of halala cannot be counted',()=>{
 const o=offer();o.coupon!.applicability!.minimumMerchandiseSubtotal=0.005;
 assert.equal(couponIsApplicable(o,request,now),false);
});
test('P1 valid two-decimal coupon remains applicable',()=>{
 const o=offer();o.coupon!.amount=20.25;o.coupon!.applicability!.amount=20.25;
 assert.equal(couponIsApplicable(o,request,now),true);
});

test('P1 generic merchant coupon page alone cannot establish product-specific applicability',()=>{
 const o=offer();o.evidence.coupon.source='https://merchant.example/coupons';
 assert.equal(couponIsApplicable(o,request,now),false);
});

test('R33 coupon scope amount matches equivalent integer halalas',()=>{
 const o=offer();o.coupon!.amount=0.1+0.2;o.coupon!.applicability!.amount=0.3;
 assert.equal(couponIsApplicable(o,request,now),true);
});
test('R33 merchandise subtotal matches equivalent integer halalas',()=>{
 const o=offer();o.price=99.9+0.2;o.coupon!.applicability!.merchandiseSubtotal=100.1;
 assert.equal(couponIsApplicable(o,request,now),true);
});
test('R33 fractional halala near 100 SAR is never accepted as a coupon',()=>{
 const o=offer();o.coupon!.amount=100.0000000005;o.coupon!.applicability!.amount=100.0000000005;
 assert.equal(couponIsApplicable(o,request,now),false);
});
