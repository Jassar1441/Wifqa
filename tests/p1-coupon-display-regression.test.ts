import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../src/coupon-policy.ts';
import { offerEvidenceText } from '../src/ui-facts.ts';

const NOW = new Date('2026-10-17T12:00:00Z');
const request = {country:'SA', city:'Abha', currency:'SAR'};
function couponOffer(amount:number) {
  return {id:'offer-1',seller:'test merchant',identity:{model:'TEST',condition:'new',quantity:1},price:120,currency:'SAR',dataKind:'live' as const,url:'https://merchant.example/p/1',
    coupon:{amount,verified:true,applicability:{offerId:'offer-1',seller:'test merchant',identity:{model:'TEST',condition:'new',quantity:1},amount,currency:'SAR',country:'SA',city:'Abha',merchandiseSubtotal:120,minimumMerchandiseSubtotal:0,terms:'Test merchandise only',conditionsConfirmed:true}},
    evidence:{coupon:{status:'confirmed' as const,source:'https://merchant.example/p/1',checkedAt:'2026-10-17T11:00:00Z'}}};
}
function displayOffer(checkedAt:string) {
  return {dataKind:'live' as const,evidence:{
    cost:{status:'confirmed' as const,source:'https://merchant.example/p/1',checkedAt},
    availability:{status:'confirmed' as const,source:'https://merchant.example/p/1',checkedAt:'2026-10-17T11:00:00Z'},
    shipping:{status:'confirmed' as const,source:'https://merchant.example/p/1',checkedAt:'2026-10-17T11:00:00Z'}}};
}
test('P1 valid coupon with same merchant and fresh proof',()=>assert.equal(couponIsApplicable(couponOffer(20),request,NOW),true));
test('P1 coupon cannot consume shipping or fees',()=>assert.equal(couponIsApplicable(couponOffer(130),request,NOW),false));
test('P1 coupon exactly merchandise subtotal',()=>assert.equal(couponIsApplicable(couponOffer(120),request,NOW),true));
test('P1 coupon one cent over merchandise subtotal',()=>assert.equal(couponIsApplicable(couponOffer(120.01),request,NOW),false));
test('P1 UI invalid calendar date is not fresh',()=>assert.match(offerEvidenceText(displayOffer('2026-02-30T11:00:00Z'),NOW),/وقت فحص غير صالح/));
test('P1 UI missing timezone is not fresh',()=>assert.match(offerEvidenceText(displayOffer('2026-10-17T11:00:00'),NOW),/وقت فحص غير صالح/));
test('P1 UI Saudi explicit offset is accepted',()=>assert.match(offerEvidenceText(displayOffer('2026-10-17T14:00:00+03:00'),NOW),/حديث بحسب البيانات المدخلة/));
test('P1 UI future timestamp is rejected',()=>assert.match(offerEvidenceText(displayOffer('2026-10-18T11:00:00Z'),NOW),/وقت فحص غير صالح/));
