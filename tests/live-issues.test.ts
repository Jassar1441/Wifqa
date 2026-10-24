import test from 'node:test';
import assert from 'node:assert/strict';
import { liveIssueSummary } from '../src/live-issues.ts';
test('no issue means no quarantine notice', () => assert.equal(liveIssueSummary([]), null));
test('multiple validation failures on same offer count once', () => {
  const notice = liveIssueSummary([
    {path:'offers[0].price', message:'invalid'},
    {path:'offers[0].id', message:'invalid'},
    {path:'offers[2].currency', message:'invalid'},
  ]);
  assert.match(notice!, /2 عرض/);
  assert.match(notice!, /لم يدخل المقارنة/);
});
test('unexpected issue path still warns instead of silently claiming success', () => {
  assert.match(liveIssueSummary([{path:'response',message:'invalid'}])!, /مشكلات تحقق/);
});
