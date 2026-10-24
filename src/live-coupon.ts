import type { Offer } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';

// A coupon in a new live search must have evidence checked during that search.
// Missing/older proof removes the discount, never the matching product.
export function restrictLiveCouponToCurrentFetch(offer: Offer, started: Date, finished: Date): Offer {
  if (offer.dataKind !== 'live' || offer.coupon?.verified !== true) return offer;
  const checked = verifiedTimestamp(offer.evidence?.coupon?.checkedAt);
  if (Number.isFinite(checked) && Number.isFinite(started.getTime()) &&
      Number.isFinite(finished.getTime()) && checked >= started.getTime() &&
      checked <= finished.getTime()) return offer;
  return { ...offer, coupon: { ...offer.coupon, verified: false } };
}
