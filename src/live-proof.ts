import type { Evidence, Offer, Request } from './types.ts';
import { verifiedTimestamp } from './evidence-time.ts';

// A same-store URL for a different product or variant is not proof for this offer.
// Ignore tracking parameters but preserve SKU/variant identifiers when present.
export function sameProductEvidenceSource(sourceValue: string, offerValue: string): boolean {
  try {
    const source = new URL(sourceValue);
    const product = new URL(offerValue);
    if (source.protocol !== 'https:' || product.protocol !== 'https:' ||
        source.username || source.password || product.username || product.password ||
        source.origin !== product.origin || source.pathname !== product.pathname) return false;
    return ['variant', 'sku'].every(key =>
      source.searchParams.get(key) === product.searchParams.get(key));
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
