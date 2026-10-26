import test from 'node:test';
import assert from 'node:assert/strict';
// Independent reproduction, direct transcription of src/live-proof.ts at
// 9d1b73531dcc544486ca12c265d28d3f9b160d14. Not a full-repository test.
const trackingParam = key => /^utm_/i.test(key) || ['gclid','fbclid','msclkid'].includes(key.toLowerCase());
const identityParams = url => [...url.searchParams].filter(([key]) => !trackingParam(key))
  .sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
function sameProductEvidenceSource(sourceValue, offerValue) {
  try {
    const source = new URL(sourceValue), product = new URL(offerValue);
    if (source.protocol !== 'https:' || product.protocol !== 'https:' ||
        source.username || source.password || product.username || product.password ||
        source.origin !== product.origin || source.pathname !== product.pathname ||
        source.hash !== product.hash) return false;
    return JSON.stringify(identityParams(source)) === JSON.stringify(identityParams(product));
  } catch { return false; }
}
// Direct transcription of src/evidence-time.ts at 8ede328a03fac93ea239b853930381f6e2302ef2.
function verifiedTimestamp(value) {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(Z|[+-]\d\d:\d\d)$/.exec(value);
  if (!match) return NaN;
  const [year,month,day,hour,minute,second] = match.slice(1,7).map(Number);
  const leap = year%4===0 && (year%100!==0 || year%400===0);
  const days = [31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  const zone = match[7], offsetH=zone==='Z'?0:Number(zone.slice(1,3)), offsetM=zone==='Z'?0:Number(zone.slice(4,6));
  if (month<1 || month>12 || day<1 || day>days[month-1] ||
      hour>23 || minute>59 || second>59 || offsetH>14 || offsetM>59 || (offsetH===14 && offsetM!==0)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
// Direct transcription of src/live-offer-gate.ts at b32ed97b4e5e34d31d4949e4748baeecb1440e9d.
function proofFromMerchant(proof, merchant, started, finished, productBound=false) {
  const checked = verifiedTimestamp(proof?.checkedAt);
  try {
    const source = new URL(proof?.source ?? '');
    return proof?.status === 'confirmed' && Number.isFinite(checked) &&
      checked >= started.getTime() && checked <= finished.getTime() &&
      source.protocol === 'https:' && !source.username && !source.password &&
      source.origin === merchant.origin &&
      (!productBound || sameProductEvidenceSource(source.href,merchant.href));
  } catch { return false; }
}
const base='https://merchant.example/products/MXP63';
test('different productId rejected',()=>assert.equal(sameProductEvidenceSource(base+'?productId=MXP63',base+'?productId=ANC'),false));
test('different SPA product hash rejected',()=>assert.equal(sameProductEvidenceSource('https://merchant.example/#/product/MXP63','https://merchant.example/#/product/ANC'),false));
test('same product #reviews anchor should not invalidate proof',()=>assert.equal(sameProductEvidenceSource(base+'#reviews',base),true));
test('same product two informational anchors should match',()=>assert.equal(sameProductEvidenceSource(base+'#reviews',base+'#specifications'),true));
const proof={status:'confirmed',source:'https://merchant.example/shipping-policy',checkedAt:'2026-10-26T14:00:30Z'};
const started=new Date('2026-10-26T14:00:00Z'),finished=new Date('2026-10-26T14:01:00Z');
test('current origin-only shipping policy proof accepted',()=>assert.equal(proofFromMerchant(proof,new URL(base),started,finished,false),true));
test('product-bound proof would reject generic policy page',()=>assert.equal(proofFromMerchant(proof,new URL(base),started,finished,true),false));
