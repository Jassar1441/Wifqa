import type {Offer,Request} from './types.ts';
import {compare} from './compare.ts';

type Obj=Record<string,unknown>;
export interface InputIssue { path:string; message:string }
const object=(v:unknown):v is Obj=>v!==null && typeof v==='object' && !Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string' && v.trim().length>0;
const number=(v:unknown):v is number=>typeof v==='number' && Number.isFinite(v);
const optionalText=(v:unknown)=>v===undefined || text(v);
const nullableNumber=(v:unknown)=>v===null || number(v);
const status=(v:unknown)=>['confirmed','estimated','unknown','conflicting'].includes(v as string);
const identity=(v:unknown)=>object(v) && ['model','size','concentration','condition'].every(k=>optionalText(v[k])) && (v.quantity===undefined || (number(v.quantity)&&Number.isInteger(v.quantity)&&v.quantity>0));

export function offerIssues(value:unknown):InputIssue[] {
 const issues:InputIssue[]=[];
 const check=(ok:boolean,path:string)=>{if(!ok)issues.push({path,message:'حقل مفقود أو نوع بيانات غير صالح'});};
 if(!object(value))return [{path:'offer',message:'العرض يجب أن يكون سجل بيانات'}];
 const o=value;
 for(const k of ['id','seller','title','currency'])check(text(o[k]),k);
 check(identity(o.identity),'identity');
 check(object(o.specifications)&&Object.values(o.specifications).every(v=>v===undefined||typeof v==='string'||number(v)),'specifications');
 for(const k of ['price','shippingCost','tax','fees'])check(nullableNumber(o[k]),k);
 check(o.taxIncluded===null||typeof o.taxIncluded==='boolean','taxIncluded');
 check(['in_stock','out_of_stock','unknown'].includes(o.availability as string),'availability');
 check(object(o.shipping)&&(o.shipping.available===null||typeof o.shipping.available==='boolean')&&text(o.shipping.country)&&text(o.shipping.city),'shipping');
 check(object(o.delivery)&&nullableNumber(o.delivery.minDays)&&nullableNumber(o.delivery.maxDays)&&status(o.delivery.status),'delivery');
 check(object(o.returns)&&nullableNumber(o.returns.days)&&nullableNumber(o.returns.cost)&&typeof o.returns.notes==='string'&&status(o.returns.status),'returns');
 check(object(o.sellerEvidence)&&typeof o.sellerEvidence.verifiedIdentity==='boolean'&&status(o.sellerEvidence.status),'sellerEvidence');
 check(object(o.evidence)&&Object.values(o.evidence).every(e=>object(e)&&status(e.status)&&typeof e.source==='string'&&typeof e.checkedAt==='string'),'evidence');
 check(['synthetic','live'].includes(o.dataKind as string),'dataKind');
 check(optionalText(o.url),'url');
 if(o.coupon!==undefined){
  const c=o.coupon;
  check(object(c)&&number(c.amount)&&typeof c.verified==='boolean'&&optionalText(c.expiresAt)&&optionalText(c.paymentMethod)&&(c.memberOnly===undefined||typeof c.memberOnly==='boolean'),'coupon');
  if(object(c)&&c.applicability!==undefined){const a=c.applicability;
   check(object(a)&&['offerId','seller','currency','country','city','terms'].every(k=>text(a[k]))&&object(a.identity)&&identity(a.identity)&&text(a.identity.model)&&number(a.amount)&&number(a.merchandiseSubtotal)&&number(a.minimumMerchandiseSubtotal)&&a.minimumMerchandiseSubtotal>=0&&a.merchandiseSubtotal>=0&&typeof a.conditionsConfirmed==='boolean','coupon.applicability');
  }
 }
 return issues;
}

export function requestIssues(value:unknown):InputIssue[] {
 if(!object(value))return [{path:'request',message:'الطلب يجب أن يكون سجل بيانات'}];
 const r=value,issues:InputIssue[]=[];
 const check=(ok:boolean,path:string)=>{if(!ok)issues.push({path,message:'حقل طلب مفقود أو غير صالح'});};
 check(identity(r.identity),'identity');
 check(object(r.identity)&&text(r.identity.model),'identity.model');
 for(const k of ['country','city','currency'])check(text(r[k]),k);
 check(['cheapest','fastest','balanced'].includes(r.priority as string),'priority');
 check(typeof r.allowAlternatives==='boolean','allowAlternatives');
 check(object(r.mustHave)&&Object.values(r.mustHave).every(c=>object(c)&&Object.keys(c).every(k=>['equals','min','max'].includes(k))&&(c.equals!==undefined||c.min!==undefined||c.max!==undefined)&&(c.equals===undefined||text(c.equals)||number(c.equals))&&(c.min===undefined||number(c.min))&&(c.max===undefined||number(c.max))&&(!(number(c.min)&&number(c.max))||c.min<=c.max)),'mustHave');
 for(const k of ['budget','deadlineDays'])check(r[k]===undefined||(number(r[k])&&r[k]>=0),k);
 check(r.member===undefined||typeof r.member==='boolean','member');
 check(optionalText(r.paymentMethod),'paymentMethod');
 return issues;
}

// External connectors must use this boundary rather than the trusted typed engine.
// Validation checks structure; source assertions still require independent evidence.
export function compareExternal(rawOffers:unknown,rawRequest:unknown,now=new Date()) {
 const issues=requestIssues(rawRequest);
 if(!Array.isArray(rawOffers))return {result:null,issues:[...issues,{path:'offers',message:'قائمة العروض غير صالحة'}]};
 if(issues.length)return {result:null,issues};
 const accepted:Offer[]=[];
 const ids=new Set<string>();
 for(let i=0;i<rawOffers.length;i++){
  const item=rawOffers[i],errors=offerIssues(item);
  if(errors.length){issues.push(...errors.map(e=>({...e,path:`offers[${i}].${e.path}`})));continue;}
  const offer=item as Offer;
  if(ids.has(offer.id)){issues.push({path:`offers[${i}].id`,message:'معرف عرض مكرر؛ يلزم معرف فريد لكل عرض وبائع'});continue;}
  ids.add(offer.id);accepted.push(offer);
 }
 return {result:compare(accepted,rawRequest as Request,now),issues};
}

