import {discoverAirPods} from './aleph-discovery.ts';
import {supportedQuery} from './search-client.ts';
// This adapter needs current inspected WebMCP registrations supplied by its host.
// The Node server cannot obtain these browser-session capabilities by itself.
export function createAlephProvider(tools:any,names:any,clock=()=>new Date().toISOString()){
 return async function(input:any){
  if(!supportedQuery(input.query)||input.destination?.country!=='SA'||!['Abha','Riyadh'].includes(input.destination?.city))throw new Error('Unsupported request');
  const run=await discoverAirPods({tools,names,query:'Apple AirPods 4 without ANC',clock});
  return mapAlephRun(run,input);
 };
}
export function mapAlephRun(run:any,input:any){
 const p=run.product_response?.structuredContent;
 const variants=p?.variants?.filter((v:any)=>v.sku==='MXP63ZE/A')??[];
 const url=new URL(p?.url,'https://alephksa.com');
 if(p?.title!=='AirPods 4'||variants.length!==1||url.origin!=='https://alephksa.com'||url.username||url.password||url.pathname!=='/ar/products/'+p.handle)throw new Error('Variant mismatch');
 const v=variants[0];if(v.price?.currency!=='SAR'||!Number.isSafeInteger(v.price.amount)||v.price.amount<=0)throw new Error('Price invalid');
 const at=run.observed_at;if(!Number.isFinite(Date.parse(at)))throw new Error('Timestamp invalid');
 const proof={status:'confirmed',source:url.href,checkedAt:at};
 const unknown={status:'unknown',source:'',checkedAt:at};
 return {mode:'live',query:input.query,destination:input.destination,retrievedAt:at,discoveryMethod:run.discovery_method,offers:[{
  id:p.id,seller:'ألف',title:p.title,identity:{model:'AirPods 4',condition:'new',quantity:1},
  specifications:{color:'white',charging:'USB-C',anc:0},currency:'SAR',price:v.price.amount/100,
  shippingCost:null,taxIncluded:null,tax:null,fees:null,
  availability:p.available===true&&v.availability?.available===true?'in_stock':p.available===false||v.availability?.available===false?'out_of_stock':'unknown',
  shipping:{available:null,country:input.destination.country,city:input.destination.city},
  delivery:{minDays:null,maxDays:null,status:'unknown'},returns:{days:null,cost:null,notes:'غير متحقق',status:'unknown'},sellerEvidence:{verifiedIdentity:false,status:'unknown'},
  evidence:{identity:proof,cost:proof,availability:proof,shipping:unknown,delivery:unknown},dataKind:'live',url:url.href
 }]};
}
