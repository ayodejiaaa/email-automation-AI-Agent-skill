import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEmail } from './render.mjs';

const template =
  'Hi {{first_name}}. {{#discount_active}}Take {{discount_pct}}% off this week.{{/discount_active}}Reply if you need help.';

test('0% discount omits the discount sentence entirely', () => {
  const out = renderEmail(template, { first_name: 'Dave', discount_pct: 0 });
  assert.ok(!out.includes('%'));
  assert.ok(!out.toLowerCase().includes('off'));
  assert.ok(out.includes('Reply if you need help.'));
});

test('a positive discount renders the sentence with the percentage', () => {
  const out = renderEmail(template, { first_name: 'Dave', discount_pct: 10 });
  assert.ok(out.includes('Take 10% off this week.'));
});

test('missing variables never leak raw template tokens', () => {
  const out = renderEmail(template, { discount_pct: 0 });
  assert.ok(!out.includes('{{'));
  assert.ok(!out.includes('undefined'));
});

test('interpolated values are HTML-escaped by default', () => {
  const out = renderEmail('Hi {{first_name}}', { first_name: '<script>alert(1)</script>' });
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;'));
});
