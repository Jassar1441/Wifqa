import type { Offer, Request } from './types.ts';

export const DEMO_IDENTITY={model:'WF-DEMO',size:'100ml',concentration:'EDP',condition:'new',quantity:1};
export function demoRequest(): Request {
  return {identity:{...DEMO_IDENTITY},mustHave:{},country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false};
}
export function demoOffers(now = new Date()): Offer[] {
  const at=now.toISOString();
  const evidence=Object.fromEntries(['identity','availability','shipping','cost','delivery','returns','seller'].map(k=>[k,{status:'confirmed' as const,source:'بيانات اصطناعية لاختبار القواعد',checkedAt:at}]));
  const base:Offer={id:'A',seller:'المتجر التجريبي أ',title:'عطر تجريبي 100 مل — EDP',identity:{...DEMO_IDENTITY},specifications:{},currency:'SAR',price:120,shippingCost:25,taxIncluded:true,tax:18,fees:0,availability:'in_stock',shipping:{available:true,country:'SA',city:'Abha'},delivery:{minDays:5,maxDays:7,status:'confirmed'},returns:{days:14,cost:0,notes:'إرجاع تجريبي خلال 14 يومًا، دون تكلفة',status:'confirmed'},sellerEvidence:{verifiedIdentity:true,status:'confirmed'},evidence,dataKind:'synthetic'};
  return [base,
    {...structuredClone(base),id:'B',seller:'المتجر التجريبي ب',price:150,shippingCost:0,delivery:{minDays:2,maxDays:3,status:'estimated'},returns:{days:7,cost:15,notes:'إرجاع تجريبي خلال 7 أيام بتكلفة 15 ريال',status:'confirmed'}},
    {...structuredClone(base),id:'C',seller:'المتجر التجريبي ج',price:105,shippingCost:null,delivery:{minDays:1,maxDays:2,status:'estimated'}},
    {...structuredClone(base),id:'D',seller:'المتجر التجريبي د',price:90,identity:{...DEMO_IDENTITY,size:'50ml'},title:'عطر تجريبي 50 مل — EDP'},
    {...structuredClone(base),id:'E',seller:'المتجر التجريبي هـ',price:80,availability:'out_of_stock'},
    {...structuredClone(base),id:'F',seller:'المتجر التجريبي و',price:160,shippingCost:0,delivery:{minDays:1,maxDays:2,status:'confirmed'},returns:{days:null,cost:null,notes:'سياسة الإرجاع غير موثقة',status:'unknown'},sellerEvidence:{verifiedIdentity:false,status:'unknown'}}];
}
