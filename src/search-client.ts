import { compareExternal } from './ingest.ts';
import type { Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { gateLiveOffers } from './live-offer-gate.ts';
import {isRegion} from './regions.ts';

export function supportedQuery(query: string): boolean {
  return ['apple airpods 4 without anc','airpods 4 without anc','airpods 4 بدون anc','apple airpods 4 بدون anc','airpods 4 دون anc'].includes(query.trim().toLowerCase().replace(/\s+/g,' '));
}
export async function searchAndCompare(query: string, request: Request, fetcher: typeof fetch = fetch, now = () => new Date(), options: {mode?:'live'|'demo';scenario?:string} = {}) {
  const mode=options.mode??'live';
  if (mode==='live'&&!supportedQuery(query)) throw new Error('البحث الحالي محدود بـ Apple AirPods 4 without ANC. لم نبحث عن منتج آخر.');
  const model = request?.identity?.model?.trim().toLowerCase();
  if (!['airpods 4','apple airpods 4'].includes(model ?? '') || request?.mustHave?.anc?.equals !== 0)
    throw new Error('طلب البحث الحي لا يطابق AirPods 4 دون ANC؛ لم تُجلب نتائج.');
  const started = now();
  const response = await fetcher('/api/search', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,mode,scenario:options.scenario,destination:{country:request.country,city:request.city,...(request.region?{region:request.region}:{})}})});
  if (!response.ok) throw new Error(response.status === 503 ? 'مصدر البحث الحي غير متصل حاليًا. لم نستخدم بيانات تجريبية بدلًا منه.' : 'تعذر جلب نتائج موثوقة من المصدر.');
  const payload = await response.json();
  const finished = now();
  const at = verifiedTimestamp(payload?.retrievedAt);
  if(mode==='demo') {
    const updated=verifiedTimestamp(payload?.updatedAt);
    if(payload?.mode!=='demo'||payload?.label!=='بيانات تجريبية'||payload?.query!==query||
      payload?.destination?.country!==request.country||!isRegion(request.region)||
      payload?.destination?.region!==request.region||!Number.isFinite(at)||
      at<started.getTime()||at>finished.getTime()||!Number.isFinite(updated)||updated>finished.getTime()||
      !Array.isArray(payload.offers)||payload.offers.some(offer=>offer?.dataKind!=='synthetic'))
      throw new Error('رد البيانات التجريبية لا يطابق الطلب أو المنطقة.');
    const checked=compareExternal(payload.offers,request,finished);
    return {mode:'demo' as const,label:payload.label,updatedAt:payload.updatedAt,retrievedAt:payload.retrievedAt,
      result:checked.result,issues:checked.issues};
  }
  if (payload?.mode !== 'live' || payload?.query !== query ||
      payload?.destination?.country !== request.country || payload?.destination?.city !== request.city ||
      (request.region!==undefined&&payload?.destination?.region!==request.region) ||
      !Number.isFinite(at) || at < started.getTime() || at > finished.getTime() || !Array.isArray(payload.offers))
    throw new Error('الرد ليس جلبًا حيًا مرتبطًا بهذا البحث؛ لم يُعرض.');
  const gated = gateLiveOffers(payload.offers, request, started, finished);
  const checked = compareExternal(gated.offers, request, finished);
  return {mode:'live' as const,label:undefined,updatedAt:undefined,retrievedAt:payload.retrievedAt, result:checked.result, issues:[...gated.issues,...checked.issues] };
}
