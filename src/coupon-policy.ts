import type { Offer, Request } from './types.ts';

// A provider verified flag alone is not proof of a working coupon.
export function couponIsApplicable(offer: Pick<Offer, 'coupon' | 'evidence'>, request: Pick<Request, 'member' | 'paymentMethod'>, now = new Date()): boolean {
  const coupon = offer.coupon;
  const evidence = offer.evidence.coupon;
  if (!coupon || coupon.verified !== true || !evidence || evidence.status !== 'confirmed' || !evidence.source.trim()) return false;
  const checkedAt = Date.parse(evidence.checkedAt);
  if (!Number.isFinite(checkedAt) || checkedAt > now.getTime() || now.getTime() - checkedAt > 86400000) return false;
  if (coupon.expiresAt !== undefined) {
    const expiry = Date.parse(coupon.expiresAt);
    if (!Number.isFinite(expiry) || expiry < now.getTime()) return false;
  }
  return (!coupon.memberOnly || request.member === true) && (!coupon.paymentMethod || coupon.paymentMethod === request.paymentMethod);
}
