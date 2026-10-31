import type { Evidence, Offer } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { toHalalas } from './money.ts';

export interface FieldFact {
  status: 'confirmed' | 'estimated' | 'unknown';
  source: string;
  checkedAt: string;
}
const freshness = 24 * 60 * 60 * 1000;
function fact(proof: Evidence | undefined, hasValue: boolean, now: Date): FieldFact {
  const at = verifiedTimestamp(proof?.checkedAt);
  const valid = hasValue && Boolean(proof?.source?.trim()) && Number.isFinite(at) &&
    at <= now.getTime() && now.getTime() - at <= freshness;
  return {
    status: valid && (proof?.status === 'confirmed' || proof?.status === 'estimated') ? proof.status : 'unknown',
    source: proof?.source ?? '',
    checkedAt: proof?.checkedAt ?? '',
  };
}

export function offerFieldFacts(offer: Offer, now = new Date()) {
  const delivery = offer.delivery;
  const price = fact(offer.evidence.price ?? offer.evidence.cost, toHalalas(offer.price) !== null, now);
  const shipping = fact(offer.evidence.shipping,
    offer.shipping.available !== null && (offer.shipping.available === false || toHalalas(offer.shippingCost) !== null), now);
  const arrival = fact(offer.evidence.delivery,
    typeof delivery.minDays === 'number' && typeof delivery.maxDays === 'number' &&
    Number.isFinite(delivery.minDays) && Number.isFinite(delivery.maxDays) &&
    delivery.minDays >= 0 && delivery.minDays <= delivery.maxDays &&
    (delivery.status === 'confirmed' || delivery.status === 'estimated'), now);
  if (arrival.status !== 'unknown' && delivery.status === 'estimated') arrival.status = 'estimated';
  return { price, shipping, arrival };
}

const labels = { confirmed: 'مؤكد', estimated: 'تقديري', unknown: 'غير معروف' };
export function fieldFactsText(offer: Offer, now = new Date()): string {
  const facts = offerFieldFacts(offer, now);
  return (['price', 'shipping', 'arrival'] as const).map((key) => {
    const value = facts[key];
    const label = {price:'السعر',shipping:'الشحن',arrival:'موعد الوصول'}[key];
    return `${label}: ${labels[value.status]} · المصدر: ${value.source || 'غير معروف'} · وقت التحقق: ${value.checkedAt || 'غير معروف'}`;
  }).join('\n');
}
