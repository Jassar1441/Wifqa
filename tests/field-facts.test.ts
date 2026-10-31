import test from 'node:test';
import assert from 'node:assert/strict';
import { demoOffers } from '../src/fixtures.ts';
import { offerFieldFacts, fieldFactsText } from '../src/field-facts.ts';
const now = new Date('2026-10-31T10:00:00Z');
test('each field exposes its own state, source and observation time', () => {
  const offer = demoOffers(now)[0];
  offer.evidence.cost.source = 'demo:price';
  offer.evidence.shipping.source = 'demo:shipping';
  offer.delivery.status = 'estimated';
  offer.evidence.delivery.status = 'estimated';
  const facts = offerFieldFacts(offer, now);
  assert.deepEqual(facts.price, {status:'confirmed',source:'demo:price',checkedAt:now.toISOString()});
  assert.equal(facts.shipping.source, 'demo:shipping');
  assert.equal(facts.arrival.status, 'estimated');
  assert.match(fieldFactsText(offer,now), /موعد الوصول: تقديري/);
});
test('missing, stale, future and conflicting evidence cannot be confirmed', () => {
  for (const mutate of [
    o => {o.price=null;},
    o => {delete o.evidence.cost;},
    o => {o.evidence.cost.checkedAt='2026-10-29T10:00:00Z';},
    o => {o.evidence.cost.checkedAt='2026-11-01T10:00:00Z';},
    o => {o.evidence.cost.status='conflicting';},
  ]) {
    const offer=demoOffers(now)[0];mutate(offer);
    assert.equal(offerFieldFacts(offer,now).price.status,'unknown');
  }
});
test('unknown shipping and invalid arrival stay unknown despite confirmed labels', () => {
  const offer=demoOffers(now)[0];
  offer.shipping.available=null;offer.delivery.minDays=10;offer.delivery.maxDays=2;
  const facts=offerFieldFacts(offer,now);
  assert.equal(facts.shipping.status,'unknown');assert.equal(facts.arrival.status,'unknown');
});
test('estimated price is explicit; missing source is never manufactured', () => {
  const offer=demoOffers(now)[0];offer.evidence.cost.status='estimated';delete offer.evidence.shipping;
  assert.equal(offerFieldFacts(offer,now).price.status,'estimated');
  assert.match(fieldFactsText(offer,now),/الشحن: غير معروف · المصدر: غير معروف · وقت التحقق: غير معروف/);
});
