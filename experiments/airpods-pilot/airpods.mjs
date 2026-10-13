/** Read-only, single-store pilot. Transport is supplied by the browser host. */
export const TARGET = Object.freeze({
  sku: 'MXP63ZE/A',
  handle: 'airpods-4-mxp63ze-a',
  url: 'https://alephksa.com/ar/products/airpods-4-mxp63ze-a',
  destination: 'Abha, Saudi Arabia',
});

function structured(response) {
  // The browser host returns JSON text; saved connector fixtures may be objects.
  if (typeof response === 'string') {
    try { response = JSON.parse(response); }
    catch { throw new Error('Merchant tool returned invalid JSON'); }
  }
  if (response?.isError || !response?.structuredContent) {
    throw new Error('Merchant tool failed or returned no structured content');
  }
  return response.structuredContent;
}

export function normalizeProduct(response, { observed_at, observation_time_precision = 'exact' }) {
  if (!observed_at || !Number.isFinite(Date.parse(observed_at))) {
    throw new Error('A valid observation timestamp is required');
  }
  const product = structured(response);
  const url = new URL(product.url, 'https://alephksa.com');
  if (url.origin !== 'https://alephksa.com' || url.pathname !== '/ar/products/' + TARGET.handle) {
    throw new Error('Unexpected merchant or product URL');
  }
  if (product.handle !== TARGET.handle || /active noise cancellation|\bANC\b/i.test(product.title ?? '')) {
    throw new Error('Product identity is not the standard AirPods 4');
  }
  const variants = product.variants?.filter(v => v.sku === TARGET.sku) ?? [];
  if (variants.length !== 1) throw new Error('Exactly one matching standard SKU is required');
  const variant = variants[0];
  if (variant.price?.currency !== 'SAR' || !Number.isSafeInteger(variant.price.amount) || variant.price.amount <= 0) {
    throw new Error('Invalid SAR minor-unit price');
  }
  const available = product.available === true && variant.availability?.available === true
    ? true : product.available === false || variant.availability?.available === false ? false : null;
  return {
    source_url: url.href,
    observed_at,
    observation_time_precision,
    product_id: product.id,
    variant_id: variant.id,
    sku: variant.sku,
    match_basis: 'Exact merchant SKU MXP63ZE/A and reviewed product handle; standard non-ANC variant',
    price: {
      amount: variant.price.amount / 100,
      currency: 'SAR',
      raw_amount: variant.price.amount,
      conversion_basis: 'Aleph get_product-specific minor units, cross-checked against merchant page and response text SAR 449.00 on 2026-10-13',
    },
    availability: { merchant_signal: available, fulfillment_confirmed: false },
    shipping: { destination: TARGET.destination, confirmed: false, charge: null, delivery_date: null },
    total_delivered_price: null,
  };
}

/** Logical transport methods map to the CURRENT browser's registered WebMCP tools.
 * This module neither supplies an HTTP endpoint nor bypasses the browser host.
 */
export async function checkAirPods({ transport, observation }) {
  if (typeof transport?.searchCatalog !== 'function' || typeof transport?.getProduct !== 'function') {
    throw new Error('A registered merchant browser transport is required');
  }
  const search = structured(await transport.searchCatalog({ query: 'AirPods 4', limit: 3 }));
  if (!Array.isArray(search.products)) throw new Error('Invalid catalog response');
  const discovery = {
    query: 'AirPods 4',
    returned_count: search.products.length,
    status: search.products.length === 0 ? 'empty_result' : 'candidates_returned_not_yet_matched',
  };
  // A manually verified locator is an explicit fallback, never a fabricated search hit.
  const response = await transport.getProduct({ known_handle: TARGET.handle });
  return {
    discovery,
    retrieval: { method: 'direct_product_using_manually_verified_handle', general_search_verified: false },
    offer: normalizeProduct(response, observation),
  };
}
