import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverAirPods } from '../src/aleph-discovery.ts';

// Synthetic responses only. This regression should fail until the detail
// vendor is checked against the discovered catalog vendor.
const names = {
  search: 'search_catalog__qa',
  browse: 'browse_store__qa',
  product: 'get_product__qa',
};
function setup(detailVendor: string | undefined) {
  const item = { id: 'qa-id', handle: 'airpods-4', title: 'AirPods 4', vendor: 'Apple' };
  const detail = { ...item, vendor: detailVendor };
  return {
    tools: {
      call: async (name: string) => ({
        structuredContent: name === names.search ? { products: [item] } : detail,
      }),
    },
    names,
    query: 'AirPods 4 without ANC',
    clock: () => '2026-10-14T08:00:00.000Z',
  };
}
test('control: matching vendor accepted', async () => {
  const r = await discoverAirPods(setup('Apple'));
  assert.equal(r.product_response.structuredContent.vendor, 'Apple');
});
test('reject conflicting detail vendor', async () => {
  await assert.rejects(discoverAirPods(setup('Different Vendor')), /vendor|identity|conflict/i);
});
test('reject missing detail vendor', async () => {
  await assert.rejects(discoverAirPods(setup(undefined)), /vendor|identity|conflict/i);
});
