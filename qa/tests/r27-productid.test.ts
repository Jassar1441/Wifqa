import test from 'node:test';
import assert from 'node:assert/strict';
import {sameProductEvidenceSource, validateLiveProductEvidence} from '../../src/live-proof.ts';

const at='2026-10-26T07:00:00.000Z', now=new Date(at);
const url='https://merchant.example/products/item?variant=MXP63&product_id=100';
const evidence=(source:string)=>({status:'confirmed' as const,source,checkedAt:at});
const request:any={mustHave:{anc:{equals:0}}};
const makeOffer=(source:string):any=>({url,evidence:{identity:evidence(source),'spec:anc':evidence(url)}});

test('R27 control: same product and tracking parameters accepted',()=>{
 assert.equal(sameProductEvidenceSource(url,url),true);
 assert.equal(sameProductEvidenceSource(url+'&utm_source=qa',url),true);
 assert.doesNotThrow(()=>validateLiveProductEvidence(makeOffer(url),request,now,now));
});
test('R27 control: changed variant rejected',()=>{
 assert.equal(sameProductEvidenceSource('https://merchant.example/products/item?variant=ANC&product_id=100',url),false);
});
test('R27 P1: changed product_id on same path/variant rejected',()=>{
 const other='https://merchant.example/products/item?variant=MXP63&product_id=999';
 assert.equal(sameProductEvidenceSource(other,url),false);
});
test('R27 P1: changed itemId when variant absent rejected',()=>{
 const a='https://merchant.example/products/item?itemId=100';
 const b='https://merchant.example/products/item?itemId=999';
 assert.equal(sameProductEvidenceSource(b,a),false);
});
test('R27 P1: reject foreign product_id as identity evidence',()=>{
 const other='https://merchant.example/products/item?variant=MXP63&product_id=999';
 assert.throws(()=>validateLiveProductEvidence(makeOffer(other),request,now,now));
});
