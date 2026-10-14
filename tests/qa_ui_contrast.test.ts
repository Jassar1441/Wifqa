import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const variable = (name: string) => {
  const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})'));
  assert.ok(m, 'CSS variable not found: ' + name);
  return m[1];
};
const luminance = (hex: string) => {
  const components = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = components.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('QA-UI-01: basic Arabic direction and correct Arabic brand', () => {
  assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
  assert.ok(html.includes('وفقًا'));
  assert.ok(!html.includes('وفاقان'));
});

test('QA-UI-02: actual primary and muted text colors meet WCAG AA 4.5:1', () => {
  assert.ok(ratio(variable('ink'), variable('paper')) >= 4.5);
  assert.ok(ratio(variable('muted'), variable('paper')) >= 4.5);
  assert.ok(ratio(variable('muted'), '#ffffff') >= 4.5);
  assert.ok(ratio(variable('teal'), '#ffffff') >= 4.5);
  assert.ok(ratio('#ffffff', variable('teal')) >= 4.5);
});

// This is a CSS source check, not a screenshot, font-rendering, or 24/48px logo review.

