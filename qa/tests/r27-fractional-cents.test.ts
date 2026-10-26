import test from 'node:test';
import assert from 'node:assert/strict';
import {assess} from '../../src/compare.ts';

const at='2026-10-26T07:00:00.000Z', now=new Date(at);
const proof={status:'confirmed' as const,source:'https://merchant.example/products/item',checkedAt:at};
const request:any={identity:{model:'Item',quantity:1},mustHave:{},country:'SA',city:'Abha',currency:'SAR',priority:'cheapest',allowAlternatives:false};
const offer=(price:number):any=>({
 id:'1',seller:'Merchant',title:'Item',identity:{model:'Item',quantity:1},
 specifications:{},currency:'SAR',price,shippingCost:0,taxIncluded:true,tax:null,fees:0,
 availability:'in_stock',shipping:{available:true,country:'SA',city:'Abha'},
 delivery:{minDays:1,maxDays:2,status:'confirmed'},returns:{days:7,cost:0,notes:'ok',status:'confirmed'},
 sellerEvidence:{verifiedIdentity:true,status:'confirmed'},
 evidence:{identity:proof,cost:proof,availability:proof,shipping:proof,delivery:proof,returns:proof,seller:proof},
 dataKind:'live',url:'https://merchant.example/products/item'
});
test('R27 control: exact two-decimal SAR price accepted',()=>{
 const r=assess(offer(100.01),request,now);assert.equal(r.state,'eligible');assert.equal(r.total,100.01);
});
test('R27 control: negative price rejected',()=>{
 const r=assess(offer(-1),request,now);assert.equal(r.state,'excluded');
});
test('R27 P2: fractional-cent SAR price must not silently round',()=>{
 const r=assess(offer(100.001),request,now);assert.notEqual(r.state,'eligible');
});
test('R27 P2: sub-cent SAR price must not become zero total',()=>{
 const r=assess(offer(0.001),request,now);assert.notEqual(r.state,'eligible');
});
