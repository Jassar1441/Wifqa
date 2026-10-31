import test from 'node:test';
import assert from 'node:assert/strict';
import {demoOffers,demoRequest} from '../src/fixtures.ts';
import {compare} from '../src/compare.ts';
import {buildLiveRequest} from '../src/live-request.ts';
import {REGIONS} from '../src/regions.ts';
const now=new Date('2026-10-31T10:00:00Z');
for(const priority of ['cheapest','fastest','balanced'] as const) {
  test(`${priority}: unknown regional shipping cannot enter ranking`,()=>{
    const request={...demoRequest(),region:'asir',priority};
    const offer=demoOffers(now)[0];
    // Same legacy city is insufficient without a quote for this region.
    assert.equal(compare([offer],request,now).winner,null);
    offer.shipping.region='asir';offer.shippingCost=null;
    assert.equal(compare([offer],request,now).winner,null);
    offer.shippingCost=0;offer.shipping.available=null;
    assert.equal(compare([offer],request,now).winner,null);
    offer.shipping.available=true;offer.evidence.shipping.status='estimated';
    assert.equal(compare([offer],request,now).winner,null);
    offer.evidence.shipping.status='confirmed';
    assert.equal(compare([offer],request,now).winner?.offer.id,offer.id);
    offer.shipping.region='riyadh';
    assert.equal(compare([offer],request,now).winner,null);
  });
}
test('all thirteen selectable regions survive request construction',()=>{
  for(const region of REGIONS)assert.equal(buildLiveRequest({region:region.id,priority:'cheapest',allowAlternatives:false}).region,region.id);
  assert.throws(()=>buildLiveRequest({region:'unsupported',priority:'cheapest',allowAlternatives:false}),/منطقة/);
});
