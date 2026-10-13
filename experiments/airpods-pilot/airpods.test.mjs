import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeProduct,checkAirPods} from './airpods.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/aleph-live.json',import.meta.url)));
const s=JSON.parse(await readFile(new URL('./fixtures/aleph-search-live.json',import.meta.url)));
test('real captured observation preserves price and unknown shipping',()=>{
 const o=normalizeProduct(f.response,f); assert.equal(o.price.amount,449); assert.equal(o.availability.merchant_signal,true); assert.equal(o.shipping.charge,null); assert.equal(o.total_delivered_price,null);
});
test('empty live search remains empty despite successful direct lookup',async()=>{
 const r=await checkAirPods({transport:{searchCatalog:async()=>s.response,getProduct:async()=>f.response},observation:f}); assert.equal(r.discovery.status,'empty_result'); assert.equal(r.retrieval.general_search_verified,false);
});
test('rejects wrong ANC SKU; mutation is test-only',()=>{const r=structuredClone(f.response);r.structuredContent.variants[0].sku='MXP93ZE/A';assert.throws(()=>normalizeProduct(r,f));});
test('rejects missing timestamp',()=>assert.throws(()=>normalizeProduct(f.response,{})));
test('does not invent availability when missing',()=>{const r=structuredClone(f.response);delete r.structuredContent.available;delete r.structuredContent.variants[0].availability;assert.equal(normalizeProduct(r,f).availability.merchant_signal,null);});
test('rejects other merchant URL',()=>{const r=structuredClone(f.response);r.structuredContent.url='https://example.com/product';assert.throws(()=>normalizeProduct(r,f));});
test('rejects invalid price instead of producing a result',()=>{const r=structuredClone(f.response);r.structuredContent.variants[0].price.amount=null;assert.throws(()=>normalizeProduct(r,f));});
test('fails closed on merchant errors',()=>assert.throws(()=>normalizeProduct({isError:true},f)));
test('accepts actual browser JSON-string transport responses',async()=>{
 const r=await checkAirPods({transport:{searchCatalog:async()=>JSON.stringify(s.response),getProduct:async()=>JSON.stringify(f.response)},observation:f});assert.equal(r.offer.price.amount,449);assert.equal(r.discovery.status,'empty_result');
});
test('rejects malformed browser JSON',()=>assert.throws(()=>normalizeProduct('{invalid',f),/invalid JSON/));
