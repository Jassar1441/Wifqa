// Inject an authorized runtime provider. No stored observations or fixtures are fallback data.
export function createSearchHandler(provider) {
 return async function(req,res){
  if(req.url!=='/api/search')return false;
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.writeHead(405);res.end(JSON.stringify({error:'method_not_allowed'}));return true;}
  let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)throw Error('too_large');}const input=JSON.parse(body);
   if(typeof input.query!=='string'||!input.query.trim()||input.query.length>300||input.destination?.country!=='SA'||!['Abha','Riyadh'].includes(input.destination?.city)){res.writeHead(400);res.end(JSON.stringify({error:'invalid_search'}));return true;}
   if(typeof provider!=='function'){res.writeHead(503);res.end(JSON.stringify({error:'live_provider_not_connected'}));return true;}
   const result=await provider(input);res.writeHead(200);res.end(JSON.stringify(result));
  }catch{res.writeHead(502);res.end(JSON.stringify({error:'search_failed'}));}return true;
 };
}
