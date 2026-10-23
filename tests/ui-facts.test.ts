import test from 'node:test';
import assert from 'node:assert/strict';
import { priceBreakdownText, offerEvidenceText } from '../src/ui-facts.ts';
import type { Assessment, Offer } from '../src/types.ts';

const NOW = new Date('2026-10-13T07:00:00Z');
function offer(): Offer {
  const evidence = Object.fromEntries(['cost','availability','shipping'].map(key =>
    [key,{status:'confirmed',source:'مصدر تجربة',checkedAt:'2026-10-13T06:00:00Z'}]));
  return {
    id:'fixture', seller:'تجريبي', title:'منتج اصطناعي', identity:{model:'TEST'},
    specifications:{}, currency:'SAR', price:100, shippingCost:20, taxIncluded:true,
    tax:15, fees:5, coupon:{amount:10,verified:true},
    availability:'in_stock', shipping:{available:true,country:'SA',city:'Abha'},
    delivery:{minDays:1,maxDays:2,status:'estimated'},
    returns:{days:null,cost:null,notes:'',status:'unknown'},
    sellerEvidence:{verifiedIdentity:false,status:'unknown'},
    evidence, dataKind:'synthetic',
  };
}
function assessment(o=offer(), applied=false, total=125): Assessment {
  return {offer:o,state:'eligible',group:'exact',reasons:[],warnings:[],
    total,couponApplied:applied,balanceScore:null};
}
test('price breakdown explicitly explains an applied coupon and reconciles total',()=>{
  const output=priceBreakdownText(assessment(offer(),true,115));
  assert.match(output,/خصم منطبق/);
  assert.match(output,/الإجمالي/);
  assert.match(output,/الشحن/);
});
test('unused coupon is clearly not included in total',()=>{
  const output=priceBreakdownText(assessment());
  assert.match(output,/الكوبون غير محتسب/);
  assert.doesNotMatch(output,/خصم منطبق/);
});
test('incomplete total never pretends shipping is free',()=>{
  const o=offer();o.shippingCost=null;
  assert.match(priceBreakdownText(assessment(o,false,null)),/غير مكتمل/);
});
test('synthetic provenance cannot look like verified merchant stock',()=>{
  const output=offerEvidenceText(offer(),NOW);
  assert.match(output,/اصطناعية للتجربة فقط/);
  assert.match(output,/محاكاة فقط/);
  assert.match(output,/السعر والتكلفة/);
  assert.match(output,/التوفر/);
  assert.match(output,/الشحن/);
});
test('old and future evidence are not shown as current',()=>{
  const old=offer();old.evidence.cost.checkedAt='2026-10-10T06:00:00Z';
  assert.match(offerEvidenceText(old,NOW),/قديم؛ يحتاج تحديثًا/);
  const future=offer();future.evidence.cost.checkedAt='2026-10-14T06:00:00Z';
  assert.match(offerEvidenceText(future,NOW),/وقت فحص غير صالح/);
});
test('live label still discloses lack of independent verification',()=>{
  const o=offer();o.dataKind='live';
  assert.match(offerEvidenceText(o,NOW),/لم تُتحقق استقلاليًا/);
});
test('missing source is explicit rather than inventing evidence',()=>{
  const o=offer();delete o.evidence.cost;
  assert.match(offerEvidenceText(o,NOW),/المصدر غير محدد/);
});

test('foreign-currency totals are never labeled as Saudi riyals',()=>{
  const usd=offer();usd.currency='USD';
  const text=priceBreakdownText(assessment(usd,false,125));
  assert.match(text,/الإجمالي.*USD/);
  assert.doesNotMatch(text,/ريال/);
  assert.match(priceBreakdownText(assessment()),/الإجمالي.*ريال/);
});
