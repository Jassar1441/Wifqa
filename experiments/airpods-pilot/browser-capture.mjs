/** Browser-host bridge. Pass current, inspected registrations from fetchTools().
 * No network credentials, cart operations, or standalone scraping endpoints.
 */
export async function captureAirPods({ tools, names, sourceUrl, clock = () => new Date().toISOString() }) {
  if (sourceUrl !== 'https://alephksa.com/ar/products/airpods-4-mxp63ze-a') throw new Error('Unexpected source');
  if (!/^search_catalog__/.test(names.search) || !/^get_product__/.test(names.product)) throw new Error('Unapproved operation');
  const searchRequest = { catalog: { query: 'AirPods 4', pagination: { limit: 3 } } };
  const productRequest = { catalog: { id: 'airpods-4-mxp63ze-a', navigate: false } };
  const started_at = clock();
  const search = await tools.call(names.search, searchRequest);
  const search_observed_at = clock();
  const product = await tools.call(names.product, productRequest);
  const observed_at = clock();
  return { source_url: sourceUrl, started_at, search_observed_at, observed_at,
    observation_time_precision: 'exact_client_clock',
    method: 'live_browser_WebMCP', requests: { search: searchRequest, product: productRequest },
    search_response: search, product_response: product };
}
