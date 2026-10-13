import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {captureAirPods} from './browser-capture.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/aleph-live.json',import.meta.url)));
const s=JSON.parse(await readFile(new URL('./fixtures/aleph-search-live.json',import.meta.url)));
const names={search:'search_catalog__current',product:'get_product__current'};
test('bridge makes only bounded read-only search and exact product calls',async()=>{
 const calls=[];const r=await captureAirPods({sourceUrl:f.source_url,names,tools:{call:async(name,input)=>{calls.push({name,input});return JSON.stringify(name===names.search?s.response:f.response);}}});
 assert.equal(calls.length,2);assert.deepEqual(calls[0].input,{catalog:{query:'AirPods 4',pagination:{limit:3}}});assert.deepEqual(calls[1].input,{catalog:{id:'airpods-4-mxp63ze-a',navigate:false}});assert.ok(Date.parse(r.observed_at));
});
test('bridge refuses cart tool mapping before making any call',async()=>{
 await assert.rejects(captureAirPods({sourceUrl:f.source_url,names:{...names,product:'add_to_cart__x'},tools:{call:()=>assert.fail('must not call')}}),/Unapproved operation/);
});
