import { compareExternal } from './ingest.ts';
import type { Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { gateLiveOffers } from './live-offer-gate.ts';

export function supportedQuery(query: string): boolean {
  return ['apple airpods 4 without anc','airpods 4 without anc','airpods 4 بدون anc','apple airpods 4 بدون anc','airpods 4 دون anc'].includes(query.trim().toLowerCase().replace(/\s+/g,' '));
}
export async function searchAndCompare(query: string, request: Request, fetcher: typeof fetch = fetch, now = () => new Date()) {
  if (!supportedQuery(query)) throw new Error('البحث الحالي محدود بـ Apple AirPods 4 without ANC. لم نبحث عن منتج آخر.');
  const model = request?.identity?.model?.trim().toLowerCase();
  if (!['airpods 4','apple airpods 4'].includes(model ?? '') || request?.mustHave?.anc?.equals !== 0)
    throw new Error('طلب البحث الحي لا يطابق AirPods 4 دون ANC؛ لم تُجلب نتائج.');
  const started = now();
  const response = await fetcher('/api/search', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,destination:{country:request.country,city:request.city}})});
  if (!response.ok) throw new Error(response.status === 503 ? 'مصدر البحث الحي غير متصل حاليًا. لم نستخدم بيانات تجريبية بدلًا منه.' : 'تعذر جلب نتائج موثوقة من المصدر.');
  const payload = await response.json();
  const finished = now();
  const at = verifiedTimestamp(payload?.retrievedAt);
  if (payload?.mode !== 'live' || payload?.query !== query ||
      payload?.destination?.country !== request.country || payload?.destination?.city !== request.city ||
      !Number.isFinite(at) || at < started.getTime() || at > finished.getTime() || !Array.isArray(payload.offers))
    throw new Error('الرد ليس جلبًا حيًا مرتبطًا بهذا البحث؛ لم يُعرض.');
  const gated = gateLiveOffers(payload.offers, request, started, finished);
  const checked = compareExternal(gated.offers, request, finished);
  return { retrievedAt:payload.retrievedAt, result:checked.result, issues:[...gated.issues,...checked.issues] };
}
