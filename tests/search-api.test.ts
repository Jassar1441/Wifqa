import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createSearchHandler} from '../scripts/search-api.mjs';

async function withServer(handler,run) {
  const server=createServer(handler);
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try{await run(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/search`);}
  finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
const body=(region='asir')=>({query:'Apple AirPods 4 without ANC',destination:{country:'SA',region}});
const post=(url,value)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});

test('HTTP search without live provider returns labelled regional demo instead of 503',async()=>{
  await withServer(createSearchHandler(),async url=>{
    const response=await post(url,body());
    assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
    const payload=await response.json();
    assert.equal(payload.mode,'demo');assert.equal(payload.label,'بيانات تجريبية');
    assert.ok(Number.isFinite(Date.parse(payload.updatedAt)));
    assert.equal(payload.destination.region,'asir');
    assert.ok(payload.offers.every(o=>o.dataKind==='synthetic'));
    const riyadh=await (await post(url,body('riyadh'))).json();
    assert.equal(riyadh.offers.find(o=>o.id==='regional').delivery.status,'estimated');
    assert.equal(payload.offers.find(o=>o.id==='regional').delivery.status,'confirmed');
  });
});
test('explicit demo makes no call to an injected live provider',async()=>{
  await withServer(createSearchHandler(()=>{throw new Error('external provider must not run');}),async url=>{
    const response=await post(url,{...body(),mode:'demo'});
    assert.equal(response.status,200);assert.equal((await response.json()).mode,'demo');
  });
});
test('invalid destinations, malformed input and unsupported methods still fail validation',async()=>{
  await withServer(createSearchHandler(),async url=>{
    assert.equal((await post(url,body('unsupported'))).status,400);
    assert.equal((await post(url,{...body(),destination:{country:'US',region:'asir'}})).status,400);
    assert.equal((await post(url,{...body(),query:''})).status,400);
    assert.equal((await post(url,{...body(),mode:'snapshot'})).status,400);
    assert.equal((await fetch(url)).status,405);
    assert.equal((await fetch(url,{method:'POST',body:'invalid JSON'})).status,502);
  });
});
test('demo read errors remain visible rather than returning fake success',async()=>{
  await withServer(createSearchHandler(undefined,{demoProvider:async()=>{throw new Error('unreadable file');}}),async url=>{
    const response=await post(url,body());
    assert.equal(response.status,502);assert.equal((await response.json()).error,'search_failed');
  });
});
test('legacy city input is translated into an explicit demo region',async()=>{
  await withServer(createSearchHandler(),async url=>{
    const response=await post(url,{query:body().query,destination:{country:'SA',city:'Abha'}});
    assert.equal(response.status,200);assert.equal((await response.json()).destination.region,'asir');
  });
});
