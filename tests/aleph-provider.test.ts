import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mapAlephRun} from '../src/aleph-provider.ts';
const recorded=JSON.parse(readFileSync(new URL('./fixtures/aleph-recorded-2026-10-13.json',import.meta.url),'utf8'));
// Historical response replay, never served as a live search result.
const input={query:'Apple AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}};
function run(){return {...recorded,product_response:JSON.parse(recorded.product_response)};}
test('historical merchant response maps 449 SAR without inventing shipping or taxes',()=>{
 const result=mapAlephRun(run(),input); const o=result.offers[0];
 assert.equal(o.price,449);assert.equal(o.availability,'in_stock');
 assert.equal(o.shippingCost,null);assert.equal(o.tax,null);assert.equal(o.fees,null);
 assert.equal(o.shipping.available,null);assert.equal(result.retrievedAt,recorded.observed_at);
 assert.equal(o.evidence.cost.source,recorded.source_url);
});
test('rejects ANC SKU even under standard product title',()=>{
 const r=run();r.product_response.structuredContent.variants[0].sku='MXP93ZE/A';assert.throws(()=>mapAlephRun(r,input),/Variant/);
});
test('rejects unrelated merchant URL',()=>{
 const r=run();r.product_response.structuredContent.url='https://example.com/ar/products/airpods-4-mxp63ze-a';assert.throws(()=>mapAlephRun(r,input),/Variant/);
});
test('rejects invalid currency',()=>{
 const r=run();r.product_response.structuredContent.variants[0].price.currency='USD';assert.throws(()=>mapAlephRun(r,input),/Price/);
});
test('does not infer stock from missing variant availability',()=>{
 const r=run();delete r.product_response.structuredContent.variants[0].availability;assert.equal(mapAlephRun(r,input).offers[0].availability,'unknown');
});
