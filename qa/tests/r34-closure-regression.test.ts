import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveRequest } from '../../src/live-request.ts';
import { toHalalas } from '../../src/money.ts';
import { couponIsApplicable } from '../../src/coupon-policy.ts';
import { sameProductEvidenceSource } from '../../src/live-proof.ts';

// R34 QA regression file. These imports target actual repository modules.
// NOT EXECUTED inside this repository at report time: requires Node >=24.
const now = new Date('2026-10-29T14:00:00Z');
const url = 'https://merchant.example/airpods-4?variant=no-anc';
const request = { country:'SA', city:'Abha', currency:'SAR' } as const;
function couponOffer() {
  return {
    id:'one', seller:'Merchant', identity:{model:'AirPods 4',condition:'new',quantity:1},
    price:450, currency:'SAR', dataKind:'live' as const, url,
    evidence:{coupon:{status:'confirmed' as const,source:url,checkedAt:now.toISOString()}},
    coupon:{amount:20,verified:true,applicability:{
      offerId:'one',seller:'Merchant',identity:{model:'AirPods 4',condition:'new',quantity:1},
      amount:20,currency:'SAR',country:'SA',city:'Abha',
      merchandiseSubtotal:450,minimumMerchandiseSubtotal:0,
      terms:'Synthetic QA fixture only',conditionsConfirmed:true,
    }},
  };
}
test('R29: checked alternatives passed through',()=>{
  assert.equal(buildLiveRequest({city:'Abha',priority:'cheapest',allowAlternatives:true}).allowAlternatives,true);
});
test('R29: unchecked alternatives passed through',()=>{
  assert.equal(buildLiveRequest({city:'Abha',priority:'cheapest',allowAlternatives:false}).allowAlternatives,false);
});
test('R29: budget and deadline passed through',()=>{
  const r=buildLiveRequest({city:'Abha',priority:'fastest',allowAlternatives:true,budget:500,deadlineDays:3});
  assert.equal(r.budget,500); assert.equal(r.deadlineDays,3);
});
test('R33: ordinary binary decimal artifact converts to 30 halalas',()=>{
  assert.equal(toHalalas(0.1+0.2),30);
});
test('R33: fractional halala 100.0000000005 rejected',()=>{
  assert.equal(toHalalas(100.0000000005),null);
});
test('R33: coupon amounts with equivalent halalas match',()=>{
  const o=couponOffer();o.coupon.amount=0.1+0.2;o.coupon.applicability.amount=0.3;
  assert.equal(couponIsApplicable(o,request,now),true);
});
test('R33: equivalent basket subtotals match',()=>{
  const o=couponOffer();o.price=99.9+0.2;o.coupon.applicability.merchandiseSubtotal=100.1;
  assert.equal(couponIsApplicable(o,request,now),true);
});
test('R32: conflicting duplicate variant keys must fail evidence identity',()=>{
  const ambiguous='https://merchant.example/p?variant=anc&variant=no-anc';
  assert.equal(sameProductEvidenceSource(ambiguous,ambiguous),false);
});
