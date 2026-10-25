import test from 'node:test';
import assert from 'node:assert/strict';
import { liveCardWarnings } from '../../src/live-card-warnings.ts';

// Independent QA regression, intentionally fails against PR #21 until normalized.
test('same warning with surrounding spaces appears once', () => {
  const actual = liveCardWarnings({ reasons: ['تحذير'], warnings: [' تحذير '] });
  assert.deepEqual(actual, ['تحذير']);
});

test('non-empty warnings are trimmed before display', () => {
  const actual = liveCardWarnings({ reasons: [], warnings: ['  موعد الوصول تقديري  '] });
  assert.deepEqual(actual, ['موعد الوصول تقديري']);
});

test('different warnings remain distinct', () => {
  const actual = liveCardWarnings({ reasons: ['المنتج يحتاج تحققًا'], warnings: ['موعد الوصول تقديري'] });
  assert.deepEqual(actual, ['المنتج يحتاج تحققًا', 'موعد الوصول تقديري']);
});
