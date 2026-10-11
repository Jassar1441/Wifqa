import {assess,compare} from '../../src/compare.ts';
import {demoOffers,demoRequest} from '../../src/fixtures.ts';
const now=new Date('2026-10-11T08:00:00+03:00');
const base=()=>structuredClone(demoOffers(now)[0]);
const request=()=>demoRequest();
const cases=[
 ['null_identity',o=>o.identity=null],
 ['missing_shipping',o=>delete o.shipping],
 ['missing_evidence',o=>delete o.evidence],
 ['string_tax_false',o=>{o.price=100;o.shippingCost=0;o.taxIncluded='false';o.tax=15;}],
 ['string_coupon_verified_false',o=>o.coupon={amount:20,verified:'false'}],
 ['unknown_data_kind',o=>{o.dataKind='unexpected';delete o.url;}],
 ['invalid_delivery_status',o=>o.delivery.status='invalid'],
 ['reflag_fixture_live',o=>{o.dataKind='live';o.url='https://example.invalid/no-product';}]
];
for(const [id,mutate]of cases){
 const o=base();mutate(o);
 try{const r=compare([o],request(),now);console.log(JSON.stringify({id,state:r.assessed[0].state,total:r.assessed[0].total,ranked:r.ranking.length,purchaseGoalMet:r.purchaseGoalMet}));}
 catch(e){console.log(JSON.stringify({id,error:e.name,message:e.message}));}
}
const offer=base();offer.specifications.voltage=7.4;
const req=request();req.mustHave={voltage:{min:NaN}};
console.log('INVALID_REQUEST_RANGE',JSON.stringify({state:assess(offer,req,now).state}));
