import {createDemoProvider} from './demo-provider.mjs';
import {isRegion} from '../src/regions.ts';

// Demo fallback is always explicitly labelled and never presented as live data.
export function createSearchHandler(provider, {demoProvider=createDemoProvider()}={}) {
 return async function(req,res){
  if(req.url!=='/api/search')return false;
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.writeHead(405);res.end(JSON.stringify({error:'method_not_allowed'}));return true;}
  let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)throw Error('too_large');}const input=JSON.parse(body);
   const destination=input.destination;
   const validDestination=destination?.country==='SA' && (isRegion(destination.region) ||
     (destination.region===undefined && ['Abha','Riyadh'].includes(destination.city)));
   if(typeof input.query!=='string'||!input.query.trim()||input.query.length>300||!validDestination||
      (input.mode!==undefined&&!['live','demo'].includes(input.mode))){res.writeHead(400);res.end(JSON.stringify({error:'invalid_search'}));return true;}
   // An explicit live-only request must fail closed, not silently switch to demo.
   if(input.mode==='live'&&typeof provider!=='function'){
     res.writeHead(503);res.end(JSON.stringify({error:'live_provider_unavailable'}));return true;
   }
   const useLive=typeof provider==='function'&&input.mode!=='demo';
   const result=useLive ? await provider(input) : await demoProvider({...input,destination:{
     ...destination,region:destination.region??(destination.city==='Abha'?'asir':'riyadh'),
   }});
   res.writeHead(200);res.end(JSON.stringify(result));
  }catch{res.writeHead(502);res.end(JSON.stringify({error:'search_failed'}));}return true;
 };
}
