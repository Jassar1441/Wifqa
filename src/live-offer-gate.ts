import type { Offer, Request, Evidence } from './types.ts';
import type { InputIssue } from './ingest.ts';
import { offerIssues } from './ingest.ts';
import { verifiedTimestamp } from './evidence-time.ts';
import { validateLiveProductEvidence } from './live-proof.ts';
import { restrictLiveCouponToCurrentFetch } from './live-coupon.ts';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function validEvidenceShape(value: unknown): value is Evidence {
  return object(value) &&
    ['confirmed', 'estimated', 'unknown', 'conflicting'].includes(value.status as string) &&
    typeof value.source === 'string' && typeof value.checkedAt === 'string';
}

function proofFromMerchant(proof: Evidence | undefined, merchant: URL, started: Date, finished: Date): boolean {
  const checked = verifiedTimestamp(proof?.checkedAt);
  try {
    const source = new URL(proof?.source ?? '');
    return proof?.status === 'confirmed' && Number.isFinite(checked) &&
      checked >= started.getTime() && checked <= finished.getTime() &&
      source.protocol === 'https:' && !source.username && !source.password &&
      source.origin === merchant.origin;
  } catch { return false; }
}

// Quarantine a bad product proof per record, not every otherwise valid offer.
// A malformed coupon is a nonblocking discount failure, never proof of a cheaper total.
export function gateLiveOffers(rawOffers: unknown[], request: Request, started: Date, finished: Date) {
  const issues: InputIssue[] = [];
  const offers = rawOffers.map((raw, index) => {
    if (!object(raw)) return raw; // compareExternal will quarantine malformed records.
    if (raw.dataKind === 'synthetic') throw new Error('رفض بيانات تجريبية في مسار البحث الحي.');

    let candidate: Record<string, unknown> = raw;
    const couponErrors = offerIssues(raw).some(issue => issue.path === 'coupon' || issue.path.startsWith('coupon.'));
    const evidence = object(raw.evidence) ? raw.evidence : null;
    const malformedCouponProof = evidence && Object.hasOwn(evidence, 'coupon') && !validEvidenceShape(evidence.coupon);
    if (couponErrors || malformedCouponProof) {
      candidate = { ...raw, coupon: undefined };
      if (malformedCouponProof && evidence) {
        const { coupon: _ignored, ...otherEvidence } = evidence;
        candidate.evidence = otherEvidence;
      }
      issues.push({path:`discounts[${index}]`,message:'دليل الكوبون أو بنيته غير صالح؛ لم يُحتسب الخصم'});
    }
    // Structural errors still go through the existing external-data boundary.
    if (offerIssues(candidate).length) return candidate;
    const offer = candidate as unknown as Offer;
    if (offer.dataKind !== 'live') return candidate;
    try {
      validateLiveProductEvidence(offer, request, started, finished);
      const merchant = new URL(offer.url!);
      if ((offer.shipping.available === true || typeof offer.shippingCost === 'number') &&
          !proofFromMerchant(offer.evidence.shipping, merchant, started, finished))
        throw new Error('دليل الشحن لا يطابق المتجر أو وقت الجلب.');
      for (const key of ['cost', 'availability'] as const) {
        if (!proofFromMerchant(offer.evidence[key], merchant, started, finished))
          throw new Error(`دليل ${key} لا يطابق المتجر أو وقت الجلب.`);
      }
    } catch (error) {
      issues.push({path:`offers[${index}].evidence`,message:error instanceof Error ? error.message : 'دليل العرض غير صالح'});
      return null;
    }
    return restrictLiveCouponToCurrentFetch(offer, started, finished);
  });
  return { offers, issues };
}
