import type { Assessment, Offer, Request, Identity, Evidence } from './types.ts';
import { couponIsApplicable } from './coupon-policy.ts';
import { verifiedTimestamp } from './evidence-time.ts';

const fields: (keyof Identity)[] = ['model', 'size', 'concentration', 'condition', 'quantity'];
const same = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string'
  ? a.trim().toLowerCase() === b.trim().toLowerCase() : a === b;
const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n*100));
const cents = (n: number) => Math.round(n * 100);
export const BALANCE_RULE = 'قواعد ترجيح أولية للتجربة: 60% للتكلفة النهائية، 25% لسرعة الوصول، 10% لوضوح الإرجاع، 5% لدليل هوية البائع. لا تتجاوز هذه النقاط الشروط الإلزامية، وليست نسبة جودة أو نجاح.';

function evidenceOk(e: Evidence | undefined, now: Date, freshness: number): boolean {
  if (!e || e.status !== 'confirmed' || typeof e.source!=='string' || !e.source.trim()) return false;
  const at = verifiedTimestamp(e.checkedAt);
  return Number.isFinite(at) && at <= now.getTime() && now.getTime() - at <= freshness;
}

export function deliveryText(offer:Offer, now=new Date()):string {
  const d=offer.delivery;
  if(!money(d.minDays)||!money(d.maxDays)||d.minDays>d.maxDays||d.status==='unknown'||d.status==='conflicting'||!evidenceOk(offer.evidence.delivery,now,24*60*60*1000)) return 'موعد الوصول غير موثق أو يحتاج تحققًا';
  return `${d.minDays}–${d.maxDays} أيام ${d.status==='estimated'?'(تقديري، ليس ضمانًا)':offer.dataKind==='synthetic'?'(مؤكد في بيانات التجربة فقط)':'(موثق وقت التحقق)'} `;
}
export function sellerText(offer:Offer, now=new Date()):string {
  return offer.sellerEvidence.verifiedIdentity && offer.sellerEvidence.status==='confirmed' && evidenceOk(offer.evidence.seller,now,24*60*60*1000)
    ? offer.dataKind==='synthetic'?'موثقة في بيانات التجربة؛ ليست ضمانًا':'دليل هوية متاح؛ ليس ضمانًا للجودة'
    : 'دليل هوية البائع غير مكتمل أو يحتاج تحديثًا';
}
export function returnsText(offer:Offer, now=new Date()):string {
  const r=offer.returns;
  return r.status==='confirmed' && money(r.days) && money(r.cost) && evidenceOk(offer.evidence.returns,now,24*60*60*1000)?r.notes:'سياسة الإرجاع أو تكلفته غير موثقة';
}

export function assess(offer: Offer, request: Request, now = new Date()): Assessment {
  const r: Assessment = {offer, state:'eligible', group:'exact', reasons:[], warnings:[], total:null, couponApplied:false, balanceScore:null};
  const reject = (message: string) => { r.state='excluded'; r.reasons.push(message); };
  const unknown = (message: string) => { if(r.state === 'eligible') r.state='needs_verification'; r.reasons.push(message); };
  const fresh = 24 * 60 * 60 * 1000;
  if (!offer.id || !offer.title || !offer.seller) unknown('هوية العرض أو البائع ناقصة');
  let variant = false;
  for (const f of fields) {
    if (request.identity[f] === undefined) continue;
    if (offer.identity[f] === undefined) unknown(`معلومة هوية المنتج ناقصة: ${f}`);
    else if (!same(offer.identity[f], request.identity[f])) variant=true;
  }
  if(variant) {
    if(!request.allowAlternatives) {r.state='separate_variant'; r.reasons.push('نسخة مختلفة عن المنتج المطلوب؛ البدائل غير مطلوبة');}
    else {r.group='alternative'; r.warnings.push('بديل يختلف عن نسخة المنتج المطلوبة؛ راجع الفروق');}
  }
  for (const [key, c] of Object.entries(request.mustHave)) {
    const value=offer.specifications[key];
    if(value === undefined) {unknown(`شرط إلزامي غير موثق: ${key}`); continue;}
    if ((c.equals!==undefined && !same(value,c.equals)) ||
        (c.min!==undefined && (typeof value !== 'number' || !Number.isFinite(value) || value<c.min)) ||
        (c.max!==undefined && (typeof value !== 'number' || !Number.isFinite(value) || value>c.max))) reject(`مخالفة شرط إلزامي: ${key}`);
    if(!evidenceOk(offer.evidence[`spec:${key}`] ?? offer.evidence.identity, now, 365*24*60*60*1000)) unknown(`دليل الشرط غير مكتمل: ${key}`);
  }
  if(!evidenceOk(offer.evidence.identity,now,365*24*60*60*1000)) unknown('دليل هوية المنتج ناقص أو متعارض');
  if(offer.availability==='out_of_stock') reject('المنتج غير متوفر');
  else if(offer.availability!=='in_stock') unknown('التوفر غير مؤكد');
  if(!evidenceOk(offer.evidence.availability,now,fresh)) unknown('التوفر يحتاج تحققًا حديثًا');
  if(offer.shipping.available===false || !same(offer.shipping.country, request.country) || !same(offer.shipping.city,request.city)) reject('الشحن غير متاح للوجهة المطلوبة');
  else if(offer.shipping.available!==true) unknown('إمكانية الشحن غير مؤكدة');
  if(!evidenceOk(offer.evidence.shipping,now,fresh)) unknown('دليل الشحن يحتاج تحققًا');
  if(!same(offer.currency,request.currency)) unknown('العملة مختلفة؛ يلزم تحويل موثق قبل المقارنة');
  const values=[offer.price,offer.shippingCost,offer.fees];
  if (values.some(v => v!==null && !money(v))) reject('قيمة تكلفة غير صالحة');
  else if(values.some(v=>v===null) || offer.taxIncluded===null || (!offer.taxIncluded && offer.tax===null)) unknown('التكلفة النهائية غير مكتملة');
  else if(!offer.taxIncluded && !money(offer.tax)) reject('قيمة ضريبة غير صالحة');
  else if(money(offer.price) && money(offer.shippingCost) && money(offer.fees)) {
    let sum = cents(offer.price)+cents(offer.shippingCost)+cents(offer.fees)+(offer.taxIncluded?0:cents(offer.tax!));
    if(!Number.isSafeInteger(sum)) {reject('التكلفة خارج نطاق الحساب الآمن'); return r;}
    const coupon=offer.coupon;
    if(coupon) {
      const allowed=couponIsApplicable(offer,request,now);
      if(!money(coupon.amount) || cents(coupon.amount)>sum) reject('قيمة خصم غير صالحة');
      else if(allowed) {sum-=cents(coupon.amount); r.couponApplied=true;}
      else r.warnings.push('لا يوجد دليل حديث مستقل للكوبون أو شروطه لا تنطبق؛ الإجمالي دون الخصم');
    }
    r.total=sum/100;
    if(!evidenceOk(offer.evidence.cost,now,fresh)) unknown('دليل السعر أو مكونات التكلفة يحتاج تحديثًا');
  }
  if(request.budget!==undefined) {
    if(!money(request.budget)) reject('ميزانية غير صالحة');
    else if(r.total===null) unknown('لا يمكن تأكيد الالتزام بالميزانية دون إجمالي');
    else if(r.total>request.budget) reject('يتجاوز الميزانية الشاملة');
  }
  const d=offer.delivery;
  const durationValid=money(d.minDays) && money(d.maxDays) && d.minDays<=d.maxDays;
  if(!durationValid || d.status==='unknown' || d.status==='conflicting') r.warnings.push('موعد الوصول غير مؤكد');
  else if(d.status==='estimated') r.warnings.push('موعد الوصول تقديري، وليس ضمانًا');
  if(request.deadlineDays!==undefined) {
    if(!money(request.deadlineDays)) reject('حد توصيل غير صالح');
    else if(!durationValid || d.status!=='confirmed' || !evidenceOk(offer.evidence.delivery,now,fresh)) unknown('لا يمكن تأكيد الالتزام بموعدك الضروري');
    else if(d.maxDays!>request.deadlineDays) reject('يتجاوز موعد الوصول المطلوب');
  }
  if(!evidenceOk(offer.evidence.delivery,now,fresh)) r.warnings.push('دليل مدة التوصيل ناقص أو قديم');
  if(offer.dataKind==='live' && (!offer.url || !safeUrl(offer.url))) unknown('رابط المنتج غير صالح');
  if(offer.dataKind==='synthetic') r.warnings.push('بيانات اختبار؛ ليست فرصة شراء حقيقية');
  return r;
}

export function safeUrl(value: string): boolean {
  try {const u=new URL(value);return u.protocol==='https:' && Boolean(u.hostname) && !u.username && !u.password;} catch {return false;}
}

export function compare(offers: Offer[], request: Request, now = new Date()) {
  const assessed=offers.map(o=>assess(o,request,now));
  const eligible=assessed.filter(a=>a.state==='eligible' && a.total!==null);
  const deliveryKnown=(a: Assessment)=>a.offer.delivery.status==='confirmed' || a.offer.delivery.status==='estimated';
  const duration=(a: Assessment)=>deliveryKnown(a) && money(a.offer.delivery.minDays) && money(a.offer.delivery.maxDays) && a.offer.delivery.minDays<=a.offer.delivery.maxDays && evidenceOk(a.offer.evidence.delivery,now,24*60*60*1000)?a.offer.delivery.maxDays:Infinity;
  for(const a of eligible) {
    const minTotal=Math.min(...eligible.filter(b=>b.group===a.group).map(b=>b.total!));
    const days=duration(a);
    const returns=a.offer.returns;
    const returnScore=returns.status==='confirmed' && money(returns.days) && money(returns.cost) && evidenceOk(a.offer.evidence.returns,now,24*60*60*1000)?(Math.min(returns.days,30)/30)*(returns.cost===0?1:.5):0;
    const identityScore=a.offer.sellerEvidence.status==='confirmed' && a.offer.sellerEvidence.verifiedIdentity && evidenceOk(a.offer.evidence.seller,now,24*60*60*1000)?1:0;
    a.balanceScore=60*(a.total===0?1:minTotal/a.total!)+25*(Number.isFinite(days)?1/(1+days):0)+10*returnScore+5*identityScore;
  }
  eligible.sort((a,b)=> {
    if(a.group!==b.group) return a.group==='exact'?-1:1;
    const difference=request.priority==='fastest'?duration(a)-duration(b):request.priority==='balanced'?b.balanceScore!-a.balanceScore!:a.total!-b.total!;
    return (Number.isNaN(difference)?0:difference) || a.total!-b.total! || a.offer.id.localeCompare(b.offer.id);
  });
  const ranking=eligible.filter(a=>request.priority!=='fastest' || Number.isFinite(duration(a)));
  return {ranking, assessed, winner:ranking[0] ?? null,
    // The engine has no checkout or live-page verification evidence.
    // Retained for compatibility; an eligible input is never proof of fulfillment.
    purchaseGoalMet:false,
    eligibleLiveCandidateCount:ranking.filter(a=>a.offer.dataKind==='live').length,
    fulfillmentStatus:'not_verified' as const,
    allSynthetic:offers.every(o=>o.dataKind==='synthetic'), balanceRule:BALANCE_RULE};
}
