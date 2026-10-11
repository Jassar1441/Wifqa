import assert from 'node:assert/strict';
import {deliveryText,sellerText,returnsText} from '../../src/compare.ts';
import {demoOffers} from '../../src/fixtures.ts';
const now=new Date('2026-10-11T08:00:00+03:00');
for(const status of ['unknown','conflicting']){
 const o=structuredClone(demoOffers(now)[0]);o.delivery.status=status;
 assert.doesNotMatch(deliveryText(o,now),/مؤكد/);
}
const stale=structuredClone(demoOffers(now)[0]);
for(const key of ['delivery','seller','returns'])stale.evidence[key].checkedAt='2026-10-01T08:00:00+03:00';
assert.match(deliveryText(stale,now),/تحقق/);
assert.match(sellerText(stale,now),/تحديث/);
assert.match(returnsText(stale,now),/غير موثقة/);
const conflict=structuredClone(demoOffers(now)[0]);conflict.sellerEvidence.status='conflicting';
assert.match(sellerText(conflict,now),/غير مكتمل/);
console.log('PASS: helpers do not confirm unknown/conflicting or stale evidence; no browser run');
