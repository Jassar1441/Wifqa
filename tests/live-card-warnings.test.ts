import test from 'node:test';
import assert from 'node:assert/strict';
import { liveCardWarnings } from '../src/live-card-warnings.ts';

test('live eligible offer still shows unverified coupon warning',()=>{
 assert.deepEqual(liveCardWarnings({reasons:[],warnings:['لا يوجد دليل حديث مستقل للكوبون أو شروطه لا تنطبق؛ الإجمالي دون الخصم']}),
 ['لا يوجد دليل حديث مستقل للكوبون أو شروطه لا تنطبق؛ الإجمالي دون الخصم']);
});
test('estimated delivery warning is visible alongside verification reasons',()=>{
 assert.deepEqual(liveCardWarnings({reasons:['الشحن يحتاج تحققًا'],warnings:['موعد الوصول تقديري، وليس ضمانًا']}),
 ['الشحن يحتاج تحققًا','موعد الوصول تقديري، وليس ضمانًا']);
});
test('duplicate and empty warnings are not rendered twice',()=>{
 assert.deepEqual(liveCardWarnings({reasons:['معلومة ناقصة',''],warnings:['معلومة ناقصة','  ','دليل قديم']}),
 ['معلومة ناقصة','دليل قديم']);
});
test('no issues means no warning row',()=>{
 assert.deepEqual(liveCardWarnings({reasons:[],warnings:[]}),[]);
});
