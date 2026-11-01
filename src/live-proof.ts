import type { Evidence, Offer, Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';

// A same-store URL for a different product or variant is not proof for this offer.
// Ignore only known tracking parameters; any other query key may select a product.
// URL fragments can also contain product routes in single-page merchant apps.
const trackingParam = (key: string): boolean =>
  /^utm_/i.test(key) || ['gclid', 'fbclid', 'msclkid'].includes(key.toLowerCase());

// Duplicate identity keys are ambiguous even when the evidence URL is identical
// to the offer URL. Fail closed instead of accepting the first/last value.
const identityParams = (url: URL): [string, string][] | null => {
  const seen = new Set<string>();
  const values: [string, string][] = [];
  // A SPA fragment can select a product variant just like the outer query.
  // Reject repeated identity keys across both locations, including mixed case.
  const fragment = url.hash.slice(1);
  const queryAt = fragment.indexOf('?');
  const fragmentParams = queryAt >= 0
    ? new URLSearchParams(fragment.slice(queryAt + 1))
    : new URLSearchParams();
  for (const [key, value] of [...url.searchParams, ...fragmentParams]) {
    if (trackingParam(key)) continue;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) return null;
    seen.add(normalized);
    values.push([key, value]);
  }
  return values.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
};

export function sameProductEvidenceSource(sourceValue: string, offerValue: string): boolean {
  try {
    const source = new URL(sourceValue);
    const product = new URL(offerValue);
    if (source.protocol !== 'https:' || product.protocol !== 'https:' ||
        source.username || source.password || product.username || product.password ||
        source.origin !== product.origin || source.pathname !== product.pathname ||
        source.hash !== product.hash) return false;
    const sourceIdentity = identityParams(source);
    const productIdentity = identityParams(product);
    return sourceIdentity !== null && productIdentity !== null &&
      JSON.stringify(sourceIdentity) === JSON.stringify(productIdentity);
  } catch { return false; }
}

// A claimed live product match needs same-merchant, in-request evidence for identity
// and each mandatory specification. A fresh envelope alone proves neither.
export function validateLiveProductEvidence(
  offer: Pick<Offer, 'url' | 'evidence'>,
  request: Pick<Request, 'mustHave'>,
  started: Date,
  finished: Date,
): void {
  let merchant: URL;
  try { merchant = new URL(offer.url ?? ''); }
  catch { throw new Error('رابط هوية المنتج غير صالح.'); }
  if (merchant.protocol !== 'https:' || merchant.username || merchant.password)
    throw new Error('رابط هوية المنتج غير آمن.');

  const requireProof = (proof: Evidence | undefined, label: string) => {
    const checked = verifiedTimestamp(proof?.checkedAt);
    let source: URL;
    try { source = new URL(proof?.source ?? ''); }
    catch { throw new Error(`دليل ${label} غير صالح.`); }
    if (proof?.status !== 'confirmed' || !Number.isFinite(checked) ||
        checked < started.getTime() || checked > finished.getTime() ||
        source.protocol !== 'https:' || source.username || source.password ||
        source.origin !== merchant.origin ||
        !sameProductEvidenceSource(source.href, merchant.href))
      throw new Error(`دليل ${label} غير مؤكد أو لا يطابق المتجر ووقت الجلب.`);
  };

  requireProof(offer.evidence?.identity, 'هوية المنتج');
  for (const key of Object.keys(request.mustHave))
    requireProof(offer.evidence?.[`spec:${key}`], `المواصفة ${key}`);
}
