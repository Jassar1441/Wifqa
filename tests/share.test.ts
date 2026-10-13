import test from 'node:test';
import assert from 'node:assert/strict';
import { shareComparison } from '../src/share.ts';
test('labels synthetic sharing',()=>assert.match(shareComparison('عرض'),/بيانات اصطناعية/));
