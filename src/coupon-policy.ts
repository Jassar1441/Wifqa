import type { Offer, Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { sameProductEvidenceSource } from './live-proof.ts';

const same = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
// Monetary inputs must already be whole halalas. Never round a fractional
// halala into a cheaper displayed total or an apparently valid coupon.
const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 &&
  Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) <= 1e-7;
const safeSource = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
};

// Separate proof and structured terms are required; arbitrary terms text is not executable.
const identityFields = ['model', 'size', 'concentration', 'condition', 'quantity'] as const;
const identicalField = (a: unknown, b: unknown): boolean =>
  typeof a === 'string' && typeof b === 'string' ? same(a, b) : a === b;

export function couponIsApplicable(offer: Pick<Offer, 'id' | 'seller' | 'identity' | 'price' | 'currency' | 'dataKind' | 'coupon' | 'evidence' | 'url'>, request: Pick<Request, 'member' | 'paymentMethod' | 'country' | 'city' | 'currency'>, now = new Date()): boolean {
  const coupon = offer.coupon;
  const evidence = offer.evidence.coupon;
  if (!coupon || coupon.verified !== true || !evidence || evidence.status !== 'confirmed' || typeof evidence.source !== 'string' || !evidence.source.trim()) return false;
  if (!Number.isFinite(now.getTime())) return false;
  // A live coupon must be supported by proof from the same merchant origin.
  if (offer.dataKind === 'live') {
    if (!offer.url || !safeSource(offer.url) || !safeSource(evidence.source)) return false;
    // Same merchant alone is insufficient: another SKU/variant coupon page
    // cannot establish that this exact product qualifies for the discount.
    if (!sameProductEvidenceSource(evidence.source, offer.url)) return false;
  }
  const checkedAt = verifiedTimestamp(evidence.checkedAt);
  if (!Number.isFinite(checkedAt) || checkedAt > now.getTime() || now.getTime() - checkedAt > 86400000) return false;
  const scope = coupon.applicability;
  if (!scope || scope.conditionsConfirmed !== true || typeof scope.terms !== 'string' || !scope.terms.trim()) return false;
  if (scope.offerId !== offer.id || !same(scope.seller, offer.seller) || scope.amount !== coupon.amount || !money(coupon.amount)) return false;
  // A coupon proven for a different model/size/variant must not be reused.
  if (!scope.identity || typeof scope.identity !== 'object' || !same(scope.identity.model, offer.identity.model) ||
      !identityFields.every(key => identicalField(scope.identity[key], offer.identity[key]))) return false;
  if (!same(scope.currency, offer.currency) || !same(scope.currency, request.currency) || !same(scope.country, request.country) || !same(scope.city, request.city)) return false;
  if (!money(offer.price) || !money(scope.merchandiseSubtotal) || scope.merchandiseSubtotal !== offer.price) return false;
  // Never discount shipping, taxes, or fees, even when delivered total covers it.
  if (Math.round(coupon.amount * 100) > Math.round(offer.price * 100)) return false;
  // Never count shipping, taxes or fees toward a merchandise-only minimum.
  if (!money(scope.minimumMerchandiseSubtotal) || scope.merchandiseSubtotal < scope.minimumMerchandiseSubtotal) return false;
  if (coupon.expiresAt !== undefined) {
    // Date-only merchant deadlines expire at the END of that date in Saudi Arabia
    // (Asia/Riyadh, UTC+03:00); full timestamps must carry their own UTC offset.
    const expiry = /^\d{4}-\d{2}-\d{2}$/.test(coupon.expiresAt)
      ? verifiedTimestamp(`${coupon.expiresAt}T23:59:59.999+03:00`)
      : verifiedTimestamp(coupon.expiresAt);
    if (!Number.isFinite(expiry) || expiry < now.getTime()) return false;
  }
  return (!coupon.memberOnly || request.member === true) && (!coupon.paymentMethod || coupon.paymentMethod === request.paymentMethod);
}

