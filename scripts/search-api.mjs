import {verifiedTimestamp} from '../src/evidence-time.ts';
// Inject an authorized runtime provider. No stored observations or fixtures are fallback data.
export function createSearchHandler(provider) {
 return async function(req,res){
  if(req.url!=='/api/search')return false;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  const respond=(status,error)=>{res.writeHead(status);res.end(JSON.stringify({error}));};
  if(req.method!=='POST'){respond(405,'method_not_allowed');return true;}
  if((req.headers['content-type']??'').split(';',1)[0].trim().toLowerCase()!=='application/json'){
   respond(415,'unsupported_media_type');return true;
  }
  let body='';
  try{
   for await(const chunk of req){
    body+=chunk;
    if(Buffer.byteLength(body)>4096){respond(413,'payload_too_large');return true;}
   }
  }catch{respond(400,'invalid_request_body');return true;}
  let input;
  try{input=JSON.parse(body);}catch{respond(400,'invalid_json');return true;}
  if(typeof input.query!=='string'||!input.query.trim()||input.query.length>300||
    input.destination?.country!=='SA'||!['Abha','Riyadh'].includes(input.destination?.city)){
   respond(400,'invalid_search');return true;
  }
  if(typeof provider!=='function'){respond(503,'live_provider_not_connected');return true;}
  const started=new Date();
  let result;
  try{result=await provider(input);}catch{respond(502,'search_failed');return true;}
  const finished=new Date();
  const at=verifiedTimestamp(result?.retrievedAt);
  if(result?.mode!=='live'||result?.query!==input.query||
    result?.destination?.country!==input.destination.country||result?.destination?.city!==input.destination.city||
    !Number.isFinite(at)||at<started.getTime()||at>finished.getTime()||!Array.isArray(result?.offers)){
   respond(502,'invalid_provider_response');return true;
  }
  try{res.writeHead(200);res.end(JSON.stringify(result));}catch{respond(502,'invalid_provider_response');}
  return true;
 };
}
