import test from 'node:test';
import assert from 'node:assert/strict';
// Independent predicate reproduction of PR #26, NOT a full repository integration test.
// Source: src/live-proof.ts SHA 9d1b73531dcc544486ca12c265d28d3f9b160d14
//         src/live-offer-gate.ts SHA 89644036af19d3e443682b14ef99aa4407e34941
const trackingParam = key => /^utm_/i.test(key) || ['gclid','fbclid','msclkid'].includes(key.toLowerCase());
const identityParams = url => [...url.searchParams].filter(([key])=>!trackingParam(key)).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
function sameProductEvidenceSource(sourceValue,offerValue) {
 try {
  const source=new URL(sourceValue),product=new URL(offerValue);
  if(source.protocol!=='https:'||product.protocol!=='https:'||source.username||source.password||product.username||product.password||source.origin!==product.origin||source.pathname!==product.pathname||source.hash!==product.hash)return false;
  return JSON.stringify(identityParams(source))===JSON.stringify(identityParams(product));
 }catch{return false;}
}
function verifiedTimestamp(value) {
 if(typeof value!=='string')return NaN;
 const match=/^(\\d{4})-(\\d\\d)-(\\d\\d)T(\\d\\d):(\\d\\d):(\\d\\d)(?:\\.\\d+)?(Z|[+-]\\d\\d:\\d\\d)$/.exec(value);
 if(!match)return NaN;
 const [year,month,day,hour,minute,second]=match.slice(1,7).map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 const zone=match[7],offsetH=zone==='Z'?0:Number(zone.slice(1,3)),offsetM=zone==='Z'?0:Number(zone.slice(4,6));
 if(month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59||offsetH>14||offsetM>59||(offsetH===14&&offsetM!==0))return NaN;
 const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:NaN;
}
function proofFromMerchant(proof,merchant,started,finished,productBound=false){
 const checked=verifiedTimestamp(proof?.checkedAt);
 try{
  const source=new URL(proof?.source??'');
  return proof?.status==='confirmed'&&Number.isFinite(checked)&&checked>=started.getTime()&&checked<=finished.getTime()&&source.protocol==='https:'&&!source.username&&!source.password&&source.origin===merchant.origin&&(!productBound||sameProductEvidenceSource(source.href,merchant.href));
 }catch{return false;}
}
const at='2026-10-28T07:00:00.000Z',now=new Date(at),url='https://merchant.example/airpods-4?variant=no-anc';
const evidence=(source=url)=>({status:'confirmed',source,checkedAt:at});
const check=source=>proofFromMerchant(evidence(source),new URL(url),now,now,true);
test('SHIP-01 same product URL passes without city or shipping amount in evidence',()=>{
 assert.equal(check(url),true);
 assert.equal(Object.hasOwn(evidence(url),'city'),false);
 assert.equal(Object.hasOwn(evidence(url),'shippingCost'),false);
});
test('ETA-01 same product URL passes without city or delivery days in evidence',()=>{
 assert.equal(check(url),true);
 for(const key of ['city','minDays','maxDays'])assert.equal(Object.hasOwn(evidence(url),key),false);
});
test('SHIP-02 storewide shipping-policy source is rejected',()=>assert.equal(check('https://merchant.example/shipping-policy'),false));
test('ETA-02 informational delivery hash on same product is rejected',()=>assert.equal(check(url+'#delivery'),false));
test('CONTROL-01 wrong variant rejected',()=>assert.equal(check('https://merchant.example/airpods-4?variant=anc'),false));
test('CONTROL-02 tracking parameter accepted',()=>assert.equal(check(url+'&utm_source=test'),true));
