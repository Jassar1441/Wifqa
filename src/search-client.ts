import {compareExternal} from './ingest.ts';
import type {Request} from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { validateLiveProductEvidence } from './live-proof.ts';
export function supportedQuery(query:string):boolean {
 return ['apple airpods 4 without anc','airpods 4 without anc','airpods 4 بدون anc','apple airpods 4 بدون anc','airpods 4 دون anc'].includes(query.trim().toLowerCase().replace(/\s+/g,' '));
}
export async function searchAndCompare(query:string, request:Request, fetcher:typeof fetch=fetch, now=()=>new Date()) {
  if(!supportedQuery(query))throw new Error('البحث الحالي محدود بـ Apple AirPods 4 without ANC. لم نبحث عن منتج آخر.');
  // The only enabled live query is AirPods 4 without ANC; reject a mismatched request before fetching.
  const model=request?.identity?.model?.trim().toLowerCase();
  if(!['airpods 4','apple airpods 4'].includes(model ?? '') || request?.mustHave?.anc?.equals!==0)
    throw new Error('طلب البحث الحي لا يطابق AirPods 4 دون ANC؛ لم تُجلب نتائج.');
  const started=now();
  const response=await fetcher('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,destination:{country:request.country,city:request.city}})});
  if(!response.ok) throw new Error(response.status===503?'مصدر البحث الحي غير متصل حاليًا. لم نستخدم بيانات تجريبية بدلًا منه.':'تعذر جلب نتائج موثوقة من المصدر.');
  const payload=await response.json();const finished=now();
  const at=verifiedTimestamp(payload?.retrievedAt);
  if(payload?.mode!=='live'||payload?.query!==query||payload?.destination?.country!==request.country||payload?.destination?.city!==request.city||!Number.isFinite(at)||at<started.getTime()||at>finished.getTime()||!Array.isArray(payload.offers))throw new Error('الرد ليس جلبًا حيًا مرتبطًا بهذا البحث؛ لم يُعرض.');
  for(const offer of payload.offers){
    if(offer?.dataKind!=='live')throw new Error('رفض بيانات تجريبية في مسار البحث الحي.');
    // A claimed live price/stock source must belong to this product's HTTPS merchant origin.
    let merchant: URL;
    try {merchant=new URL(offer.url);} catch {throw new Error('رابط المنتج من المتجر غير صالح.');}
    if(merchant.protocol!=='https:'||merchant.username||merchant.password)throw new Error('رابط المنتج من المتجر غير آمن.');
    validateLiveProductEvidence(offer, request, started, finished);
    // Any affirmative shipping or priced-shipping claim needs merchant-origin proof.
    // Unknown shipping remains unknown; never upgrade it to verified.
    if(offer?.shipping?.available===true || typeof offer?.shippingCost==='number'){
      const proof=offer?.evidence?.shipping;
      const checked=verifiedTimestamp(proof?.checkedAt);
      let source:URL;
      try {source=new URL(proof?.source);} catch {throw new Error('مصدر الشحن غير صالح.');}
      if(proof?.status!=='confirmed'||!Number.isFinite(checked)||checked<started.getTime()||checked>finished.getTime()||source.protocol!=='https:'||source.username||source.password||source.origin!==merchant.origin)throw new Error('دليل الشحن لا يطابق متجر المنتج أو وقت الجلب.');
    }
    for(const key of ['cost','availability']){const e=offer?.evidence?.[key],t=verifiedTimestamp(e?.checkedAt);let source: URL;
      try {source=new URL(e?.source);} catch {throw new Error('مصدر السعر أو التوفر غير صالح.');}
      if(e?.status!=='confirmed'||!Number.isFinite(t)||t<started.getTime()||t>finished.getTime()||source.protocol!=='https:'||source.username||source.password||source.origin!==merchant.origin)throw new Error('مصدر السعر أو التوفر لا يطابق متجر المنتج في هذا الجلب.');}
  }
  return {retrievedAt:payload.retrievedAt,...compareExternal(payload.offers,request,finished)};
}
