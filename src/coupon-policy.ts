import type { Offer, Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';

const same = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n * 100));
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
    if (new URL(offer.url).origin !== new URL(evidence.source).origin) return false;
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
    const expiry = verifiedTimestamp(coupon.expiresAt);
    if (!Number.isFinite(expiry) || expiry < now.getTime()) return false;
  }
  return (!coupon.memberOnly || request.member === true) && (!coupon.paymentMethod || coupon.paymentMethod === request.paymentMethod);
}

