import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoProvider} from '../scripts/demo-provider.mjs';
import {searchAndCompare} from '../src/search-client.ts';
import {buildLiveRequest} from '../src/live-request.ts';
import {demoDatasetIsStale} from '../src/demo-freshness.ts';
const data=JSON.parse(await readFile(new URL('../data/products.json',import.meta.url),'utf8'));
const now=()=>new Date(data.updatedAt);
const provider=createDemoProvider({clock:now});
const query='Apple AirPods 4 without ANC';
const request=region=>buildLiveRequest({region,priority:'cheapest',allowAlternatives:false});
test('explicit demo flows through JSON provider, validation and comparison with selected region',async()=>{
  const calls:any[]=[];
  const fetcher=async(_url,options)=>{
    const input=JSON.parse(options.body);calls.push(input);
    return new Response(JSON.stringify(await provider(input)),{status:200});
  };
  const asir=await searchAndCompare(query,request('asir'),fetcher as typeof fetch,now,{mode:'demo'});
  const riyadh=await searchAndCompare(query,request('riyadh'),fetcher as typeof fetch,now,{mode:'demo'});
  assert.equal(asir.mode,'demo');assert.equal(asir.updatedAt,data.updatedAt);
  assert.equal(calls[0].destination.region,'asir');assert.equal(calls[1].destination.region,'riyadh');
  assert.equal(asir.result?.winner?.offer.id,'unverified-discount');
  assert.equal(riyadh.result?.winner?.offer.id,'blocked-region');
  assert.equal(asir.result?.purchaseGoalMet,false);
  assert.ok(asir.result?.allSynthetic);
});
test('demo must be explicit and cannot bypass live response protections',async()=>{
  const payload=await provider({query,destination:{country:'SA',region:'asir'}});
  const fetcher=async()=>new Response(JSON.stringify(payload));
  await assert.rejects(searchAndCompare(query,request('asir'),fetcher as typeof fetch,now));
  for(const mutate of [
    p=>{p.mode='live';},p=>{p.label='live';},p=>{p.destination.region='riyadh';},
    p=>{p.offers[0].dataKind='live';},p=>{p.updatedAt='invalid';},p=>{p.retrievedAt='2026-10-01T00:00:00Z';},
  ]){
    const bad=structuredClone(payload);mutate(bad);
    await assert.rejects(searchAndCompare(query,request('asir'),(async()=>new Response(JSON.stringify(bad))) as typeof fetch,now,{mode:'demo'}));
  }
});
test('demo scenarios apply without rewriting observation times',async()=>{
  const unavailable=await provider({query,destination:{country:'SA',region:'asir'},scenario:'unavailable'});
  assert.ok(unavailable.offers.every(o=>o.availability==='out_of_stock'));
  const conflicting=await provider({query,destination:{country:'SA',region:'asir'},scenario:'conflicting'});
  assert.equal(conflicting.offers.find(o=>o.id==='regional').evidence.price.status,'conflicting');
  assert.equal(conflicting.updatedAt,data.updatedAt);
});

// A demo request may be fresh while the underlying price and shipping observations are not.
test('expired regional demo data remains historical and cannot enter the current ranking',async()=>{
  const later=()=>new Date(Date.parse(data.updatedAt)+2*86400000);
  const historicalProvider=createDemoProvider({clock:later});
  const fetcher=async(_url,options)=>new Response(JSON.stringify(await historicalProvider(JSON.parse(options.body))),{status:200});
  const response=await searchAndCompare(query,request('asir'),fetcher as typeof fetch,later,{mode:'demo'});
  assert.equal(response.updatedAt,data.updatedAt);
  assert.equal(response.result?.winner,null);
  assert.equal(response.result?.ranking.length,0);
  assert.equal(demoDatasetIsStale(response.updatedAt,later()),true);
  assert.equal(demoDatasetIsStale(response.updatedAt,now()),false);
});
test('demo freshness check fails closed on invalid or future snapshot times',()=>{
  assert.equal(demoDatasetIsStale('not-a-timestamp',now()),true);
  assert.equal(demoDatasetIsStale(new Date(Date.parse(data.updatedAt)+1000).toISOString(),now()),true);
  assert.equal(demoDatasetIsStale(data.updatedAt,new Date(NaN)),true);
});
