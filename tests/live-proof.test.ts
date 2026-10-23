import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLiveProductEvidence} from '../src/live-proof.ts';

const at='2026-10-23T14:00:00Z';
const clock=new Date(at);
const proof=()=>({status:'confirmed' as const,source:'https://merchant.example/p/airpods',checkedAt:at});
const offer=()=>({url:'https://merchant.example/p/airpods',evidence:{identity:proof(),'spec:anc':proof(),'spec:charging':proof()}});
const request={mustHave:{anc:{equals:0},charging:{equals:'USB-C'}}};
const check=(o=offer())=>validateLiveProductEvidence(o,request,clock,clock);

test('accepts merchant-bound, in-request identity and mandatory-spec evidence',()=>assert.doesNotThrow(()=>check()));
test('rejects identity proof from unrelated host',()=>{const o=offer();o.evidence.identity.source='https://other.example/p';assert.throws(()=>check(o),/هوية المنتج/);});
test('rejects identity proof older than current request',()=>{const o=offer();o.evidence.identity.checkedAt='2026-10-22T14:00:00Z';assert.throws(()=>check(o),/هوية المنتج/);});
test('rejects missing required ANC evidence',()=>{const o=offer() as any;delete o.evidence['spec:anc'];assert.throws(()=>check(o),/anc/);});
test('rejects conflicting spec evidence from other merchant',()=>{const o=offer();o.evidence['spec:charging'].source='https://other.example/spec';assert.throws(()=>check(o),/charging/);});
test('rejects unsupported source scheme',()=>{const o=offer();o.evidence.identity.source='http://merchant.example/p';assert.throws(()=>check(o),/هوية المنتج/);});
