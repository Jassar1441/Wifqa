import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAlephRun } from '../../src/aleph-provider.ts';
import { gateLiveOffers } from '../../src/live-offer-gate.ts';
import { liveIssueSummary } from '../../src/live-issues.ts';

// QA regression cases, intentionally failing on PR #20 head until corrected.
// Synthetic Aleph-shaped response. No real merchant lookup or price verification.
const at = '2026-10-25T07:00:00.000Z';
const clock = new Date(at);
const input = { query:'Apple AirPods 4 without ANC', destination:{country:'SA',city:'Abha'} };
const request:any = {
  identity:{model:'AirPods 4',condition:'new',quantity:1},
  mustHave:{color:{equals:'white'},charging:{equals:'USB-C'},anc:{equals:0}},
  country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false
};
function mapped() {
  const run:any = {
    observed_at:at,
    product_response:{structuredContent:{
      id:'qa-product-1',title:'AirPods 4',handle:'airpods-4',
      url:'https://alephksa.com/ar/products/airpods-4',available:true,
      variants:[{sku:'MXP63ZE/A',price:{currency:'SAR',amount:44900},availability:{available:true}}]
    }}
  };
  return mapAlephRun(run,input).offers[0];
}
function withSpecProofs() {
  const offer:any = mapped();
  for(const key of ['color','charging','anc'])
    offer.evidence['spec:'+key] = {...offer.evidence.identity};
  return offer;
}
test('QA-R25-1 adapter must provide proof for each required spec',()=>{
  const offer:any=mapped();
  const result=gateLiveOffers([offer],request,clock,clock);
  assert.equal(result.offers.filter(Boolean).length,1,
    'Adapter output should be compatible with live gate; current output is quarantined');
});
test('QA-R25-control added mandatory proofs allow same offer through gate',()=>{
  const result=gateLiveOffers([withSpecProofs()],request,clock,clock);
  assert.equal(result.offers.filter(Boolean).length,1);
  assert.equal(result.issues.length,0);
});
test('QA-R25-2 no coupon must not trigger cancelled-discount warning',()=>{
  const offer:any=withSpecProofs();
  assert.equal(offer.coupon,undefined);
  offer.evidence.coupon={status:'confirmed',source:17,checkedAt:at};
  const result=gateLiveOffers([offer],request,clock,clock);
  assert.equal(result.offers.filter(Boolean).length,1);
  assert.equal(result.issues.filter(x=>x.path.startsWith('discounts[')).length,0,
    'No coupon was offered; discount cancellation message is inaccurate');
  assert.doesNotMatch(liveIssueSummary(result.issues)??'',/أُلغي خصم/);
});
test('QA-R25-3 stale coupon should produce explicit discount audit issue',()=>{
  const offer:any=withSpecProofs();
  offer.coupon={amount:10,verified:true};
  offer.evidence.coupon={status:'confirmed',
    source:'https://alephksa.com/ar/products/airpods-4',
    checkedAt:'2026-10-24T07:00:00Z'};
  const result=gateLiveOffers([offer],request,clock,clock);
  assert.equal((result.offers[0] as any).coupon.verified,false);
  assert.ok(result.issues.some(x=>x.path.startsWith('discounts[')),
    'Stale proof disables discount but should be recorded for explicit UI warning');
});
