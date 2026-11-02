import type { Offer, Request } from './types.ts';
import { toHalalas } from './money.ts';
import { sameProductEvidenceSource } from './live-proof.ts';

// A matching product URL alone does not prove a shipping quote for the requested
// destination. Reject contradictions that the merchant URL explicitly exposes.
// Absence of destination/price parameters is NOT proof that the quote is verified.
const COUNTRY_KEYS = new Set(['country', 'shipping_country', 'ship_to_country', 'destination_country']);
const CITY_KEYS = new Set(['city', 'shipping_city', 'ship_to_city', 'destination_city', 'delivery_city']);
const COST_KEYS = new Set(['shippingcost', 'shipping_cost', 'shipping_fee', 'delivery_fee']);
const ETA_MIN_KEYS = new Set(['delivery_min_days', 'min_delivery_days', 'eta_min_days']);
const ETA_MAX_KEYS = new Set(['delivery_max_days', 'max_delivery_days', 'eta_max_days']);

// Quote fields describe delivery, not the product variant. Strip them only
// when matching shipping/delivery evidence; identity, price and seller proofs
// must still match the exact product URL.
const QUOTE_KEYS = new Set([...COUNTRY_KEYS, ...CITY_KEYS, ...COST_KEYS, ...ETA_MIN_KEYS, ...ETA_MAX_KEYS]);
export function sameProductShippingEvidenceSource(source: string, offerUrl: string): boolean {
  try {
    const withoutQuote = (value: string) => {
      const url = new URL(value);
      for (const key of [...url.searchParams.keys()])
        if (QUOTE_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
      // SPA product routes may carry quote metadata after the fragment's ?.
      // Preserve route and variant selectors while removing quote-only keys.
      const fragment = url.hash.slice(1);
      const queryAt = fragment.indexOf('?');
      if (queryAt >= 0) {
        const params = new URLSearchParams(fragment.slice(queryAt + 1));
        for (const key of [...params.keys()])
          if (QUOTE_KEYS.has(key.toLowerCase())) params.delete(key);
        url.hash = fragment.slice(0, queryAt) + (params.size ? '?' + params.toString() : '');
      }
      return url.href;
    };
    return sameProductEvidenceSource(withoutQuote(source), withoutQuote(offerUrl));
  } catch { return false; }
}


function valueFor(url: URL, aliases: Set<string>): { value?: string; invalid: boolean } {
  const fragment = url.hash.slice(1);
  const queryAt = fragment.indexOf('?');
  const fragmentParams = new URLSearchParams(queryAt >= 0 ? fragment.slice(queryAt + 1) : '');
  const matches = [...url.searchParams, ...fragmentParams]
    .filter(([key]) => aliases.has(key.toLowerCase()));
  if (matches.length > 1) return { invalid: true };
  if (!matches.length) return { invalid: false };
  const value = matches[0][1].trim();
  return value ? { value, invalid: false } : { invalid: true };
}
const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

export function shippingQuoteConflict(
  source: string,
  request: Pick<Request, 'country' | 'city'>,
  shipping: Offer['shipping'],
  shippingCost: Offer['shippingCost'],
  requireCompleteQuote = true,
): string | null {
  let url: URL;
  try { url = new URL(source); }
  catch { return 'رابط دليل الشحن غير صالح.'; }

  const country = valueFor(url, COUNTRY_KEYS);
  const city = valueFor(url, CITY_KEYS);
  const cost = valueFor(url, COST_KEYS);
  if (country.invalid || city.invalid || cost.invalid)
    return 'دليل الشحن يحتوي حقول وجهة أو تكلفة مكررة أو فارغة.';

  if (country.value && (normalized(country.value) !== normalized(request.country) ||
      normalized(country.value) !== normalized(shipping.country)))
    return 'بلد الشحن في الدليل لا يطابق بلد الطلب والعرض.';

  if (city.value && (normalized(city.value) !== normalized(request.city) ||
      normalized(city.value) !== normalized(shipping.city)))
    return 'مدينة الشحن في الدليل لا تطابق مدينة الطلب والعرض.';

  if (cost.value !== undefined) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(cost.value))
      return 'تكلفة الشحن في الدليل ليست مبلغًا صحيحًا بالهللة.';
    const quoted = toHalalas(Number(cost.value));
    const offered = toHalalas(shippingCost);
    if (quoted === null || offered === null || quoted !== offered)
      return 'تكلفة الشحن في الدليل تختلف عن التكلفة المحتسبة للعرض.';
  }
  // A product page with no destination/price fields is not affirmative proof
  // of a shipping quote. Reject missing proof instead of displaying a live total.
  if (requireCompleteQuote && shipping.available === true && (!country.value || !city.value))
    return 'دليل الشحن لا يثبت بلد ومدينة الوجهة المطلوبة.';
  if (requireCompleteQuote && typeof shippingCost === 'number' && cost.value === undefined)
    return 'دليل الشحن لا يثبت تكلفة الشحن المحتسبة.';
  return null;
}

// A destination/price quote does not establish delivery speed. Bind any
// confirmed/estimated delivery claim to explicit minimum and maximum days.
// These URL fields are only a structural consistency check, not independent
// proof that a merchant really promised this delivery window.
export function deliveryQuoteConflict(source: string, delivery: Offer['delivery']): string | null {
  let url: URL;
  try { url = new URL(source); }
  catch { return 'رابط دليل مدة التوصيل غير صالح.'; }
  const min = valueFor(url, ETA_MIN_KEYS);
  const max = valueFor(url, ETA_MAX_KEYS);
  if (min.invalid || max.invalid || min.value === undefined || max.value === undefined)
    return 'دليل مدة التوصيل لا يثبت الحد الأدنى والأقصى للأيام دون تكرار.';
  const wholeDays = (value: string) => /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value));
  if (!wholeDays(min.value) || !wholeDays(max.value) ||
      Number(min.value) > Number(max.value) ||
      Number(min.value) !== delivery.minDays || Number(max.value) !== delivery.maxDays)
    return 'مدة التوصيل في الدليل لا تطابق الأيام المعلنة للعرض.';
  return null;
}
