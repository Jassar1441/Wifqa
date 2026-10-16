import test from 'node:test';
import assert from 'node:assert/strict';
import { couponIsApplicable } from '../src/coupon-policy.ts';
import { offerEvidenceText } from '../src/ui-facts.ts';

// QA regression: all URLs and offers below are fictional; no merchant access.
const request = {country:'SA',city:'Abha',currency:'SAR'};
const couponOffer = () => ({
  id:'sku-1',price:100,currency:'SAR',dataKind:'live',url:'https://merchant.example/p/sku-1',
  coupon:{amount:10,verified:true,expiresAt:'2026-02-30T23:59:59Z',applicability:{
    offerId:'sku-1',amount:10,currency:'SAR',country:'SA',city:'Abha',
    merchandiseSubtotal:100,minimumMerchandiseSubtotal:0,
    terms:'QA TEST ONLY',conditionsConfirmed:true}},
  evidence:{coupon:{status:'confirmed',source:'https://merchant.example/p/sku-1',checkedAt:'2026-03-01T11:30:00Z'}}
});
test('QA-A coupon rejects impossible calendar expiry',()=>{
  assert.equal(couponIsApplicable(couponOffer() as any,request as any,new Date('2026-03-01T12:00:00Z')),false);
});
test('QA-B UI never labels timezone-free live price evidence as fresh',()=>{
  const offer={dataKind:'live',evidence:Object.fromEntries(['cost','availability','shipping'].map(k=>[k,{
    status:'confirmed',source:'https://merchant.example/p/sku-1',checkedAt:'2026-10-16T09:00:00'}]))};
  const out=offerEvidenceText(offer as any,new Date('2026-10-16T09:30:00Z'));
  assert.doesNotMatch(out,/حديث بحسب البيانات المدخلة/);
});
