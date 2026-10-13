import test from 'node:test';
import assert from 'node:assert/strict';
import { demoShareText } from '../src/share.ts';
test('sharing explicitly labels synthetic results',()=>{const text=demoShareText('السعر 145 ريال');assert.match(text,/بيانات اصطناعية/);assert.match(text,/السعر 145/);});
test('empty report is safe',()=>assert.match(demoShareText(''),/لا توجد مقارنة/));
