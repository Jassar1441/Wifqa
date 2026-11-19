import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {createSearchHandler} from '../scripts/search-api.mjs';
test('real local HTTP endpoint fails closed without merchant provider',async()=>{const handler=createSearchHandler();const server=createServer(handler);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));try{const address=server.address() as {port:number};const response=await fetch(`http://127.0.0.1:${address.port}/api/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'Apple AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}})});assert.equal(response.status,503);assert.equal((await response.json()).error,'live_provider_not_connected');assert.equal(response.headers.get('Cache-Control'),'no-store');}finally{await new Promise<void>(r=>server.close(()=>r()));}});

async function withApi(handler:any,body:string,headers:Record<string,string>={}) {
 const server=createServer(handler);
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const address=server.address() as {port:number};
  return await fetch(`http://127.0.0.1:${address.port}/api/search`,{method:'POST',headers,body});
 } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
}
test('rejects unsupported media type with 415',async()=>{
 const response=await withApi(createSearchHandler(async()=>({mode:'live'})),JSON.stringify({query:'AirPods',destination:{country:'SA',city:'Abha'}}));
 assert.equal(response.status,415);assert.equal((await response.json()).error,'unsupported_media_type');
});
test('malformed JSON is a 400 client error',async()=>{
 const response=await withApi(createSearchHandler(async()=>({mode:'live'})),'{bad json',{'Content-Type':'application/json'});
 assert.equal(response.status,400);assert.equal((await response.json()).error,'invalid_json');
});
test('oversized search payload is rejected with 413',async()=>{
 const response=await withApi(createSearchHandler(async()=>({mode:'live'})),'x'.repeat(5000),{'Content-Type':'application/json'});
 assert.equal(response.status,413);assert.equal((await response.json()).error,'payload_too_large');
});
test('provider errors remain gateway failures',async()=>{
 const response=await withApi(createSearchHandler(async()=>{throw new Error('private provider error');}),JSON.stringify({query:'AirPods 4',destination:{country:'SA',city:'Abha'}}),{'Content-Type':'application/json'});
 assert.equal(response.status,502);assert.equal((await response.json()).error,'search_failed');
});

const validBody=JSON.stringify({query:'AirPods 4 without ANC',destination:{country:'SA',city:'Abha'}});
const validEnvelope=()=>({mode:'live',query:'AirPods 4 without ANC',destination:{country:'SA',city:'Abha'},retrievedAt:new Date().toISOString(),offers:[]});
test('provider envelope must echo query and destination with a fresh timestamp and offers array',async()=>{
 const invalid=validEnvelope();invalid.query='different query';
 const response=await withApi(createSearchHandler(async()=>invalid),validBody,{'Content-Type':'application/json'});
 assert.equal(response.status,502);assert.equal((await response.json()).error,'invalid_provider_response');
});
test('valid provider envelope is accepted by the API',async()=>{
 const response=await withApi(createSearchHandler(async()=>validEnvelope()),validBody,{'Content-Type':'application/json'});
 assert.equal(response.status,200);assert.equal((await response.json()).mode,'live');
});
test('provider envelope with missing offers is rejected',async()=>{
 const invalid=validEnvelope();delete invalid.offers;
 const response=await withApi(createSearchHandler(async()=>invalid),validBody,{'Content-Type':'application/json'});
 assert.equal(response.status,502);assert.equal((await response.json()).error,'invalid_provider_response');
});
