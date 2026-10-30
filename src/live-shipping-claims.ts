import type { Offer, Request } from './types.ts';
import { toHalalas } from './money.ts';

// A matching product URL alone does not prove a shipping quote for the requested
// destination. Reject contradictions that the merchant URL explicitly exposes.
// Absence of destination/price parameters is NOT proof that the quote is verified.
const COUNTRY_KEYS = new Set(['country', 'shipping_country', 'ship_to_country', 'destination_country']);
const CITY_KEYS = new Set(['city', 'shipping_city', 'ship_to_city', 'destination_city', 'delivery_city']);
const COST_KEYS = new Set(['shippingcost', 'shipping_cost', 'shipping_fee', 'delivery_fee']);

function valueFor(url: URL, aliases: Set<string>): { value?: string; invalid: boolean } {
  const matches = [...url.searchParams].filter(([key]) => aliases.has(key.toLowerCase()));
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
  return null;
}
