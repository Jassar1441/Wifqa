import {readFile} from 'node:fs/promises';
import {isRegion} from '../src/regions.ts';
import {offerIssues} from '../src/ingest.ts';
import {verifiedTimestamp} from '../src/evidence-time.ts';

const dataFile=new URL('../data/products.json',import.meta.url);
const unknown=()=>({status:'unknown',source:'',checkedAt:''});
const proof=value=>({status:value.status,source:value.source,checkedAt:value.checkedAt});

export function createDemoProvider({file=dataFile,clock=()=>new Date()}={}) {
  return async function(input) {
    if(input?.destination?.country!=='SA'||!isRegion(input.destination.region)||typeof input.query!=='string')
      throw new Error('Invalid demo destination or query');
    const data=JSON.parse(await readFile(file,'utf8'));
    if(data.schemaVersion!==1||!Array.isArray(data.products)||!Number.isFinite(verifiedTimestamp(data.updatedAt)))
      throw new Error('Invalid demo dataset');
    const region=input.destination.region;
    const query=input.query.trim().toLowerCase();
    const matches = !query || /^(apple )?airpods 4 (without anc|بدون anc|دون anc)$/.test(query)
      ? data.products : data.products.filter(product=>`${product.title} ${product.identity.model}`.toLowerCase().includes(query));
    const offers=matches.map(product=>{
      const quote=product.shippingByRegion[region];
      const base={status:'confirmed',source:`data/products.json#${product.id}`,checkedAt:data.updatedAt};
      const evidence={identity:base,availability:base,price:proof(product.price),cost:proof(product.price),
        shipping:quote ? proof(quote.available===true ? quote.cost : quote) : unknown(),delivery:quote ? proof(quote.arrival) : unknown()};
      // Both support and cost must be known; a numeric quote alone is insufficient.
      if(quote?.available===true && (quote.cost.status!=='confirmed'||quote.status!=='confirmed'))
        evidence.shipping.status=quote.cost.status==='estimated'?'estimated':'unknown';
      for(const key of Object.keys(product.specifications))evidence[`spec:${key}`]=base;
      if(product.coupon)evidence.coupon=unknown();
      const offer={
        id:product.id,seller:product.seller,title:product.title,identity:product.identity,
        specifications:product.specifications,currency:data.currency,price:product.price.value,
        shippingCost:quote?.cost.value??null,taxIncluded:true,tax:null,fees:0,
        availability:product.availability,
        shipping:{available:quote?.available??null,country:'SA',city:region,region},
        delivery:quote ? {minDays:quote.arrival.minDays,maxDays:quote.arrival.maxDays,status:quote.arrival.status}
          : {minDays:null,maxDays:null,status:'unknown'},
        returns:{days:null,cost:null,notes:'غير معروف في بيانات التجربة',status:'unknown'},
        sellerEvidence:{verifiedIdentity:false,status:'unknown'},evidence,dataKind:'synthetic',
        ...(product.coupon ? {coupon:product.coupon} : {}),
      };
      if(input.scenario==='unavailable')offer.availability='out_of_stock';
      if(input.scenario==='conflicting'&&product.id==='regional') {
        offer.evidence.cost.status='conflicting';offer.evidence.price.status='conflicting';
      }
      const issues=offerIssues(offer);
      if(issues.length)throw new Error(`Invalid demo offer ${product.id}: ${issues.map(x=>x.path).join(', ')}`);
      return offer;
    });
    return {mode:'demo',label:'بيانات تجريبية',updatedAt:data.updatedAt,retrievedAt:clock().toISOString(),
      query:input.query,destination:{country:'SA',region,city:region},offers};
  };
}
