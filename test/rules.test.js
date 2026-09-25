import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileRule, findRule, normalizeSettings, validateSettings } from '../extension/rules.js';

const rule = (type, pattern, extra = {}) => ({ id: '1', enabled: true, groupName: 'Work', color: 'blue', type, pattern, ...extra });
test('domain matches subdomains without matching lookalikes or path text', () => {
  const match = compileRule(rule('domain', 'GitHub.com'));
  assert.equal(match('https://github.com/org'), true);
  assert.equal(match('https://api.github.com/repos'), true);
  assert.equal(match('https://notgithub.com/'), false);
  assert.equal(match('https://example.com/github.com'), false);
});
test('wildcards are anchored and escape regex punctuation', () => {
  const match = compileRule(rule('wildcard', 'https://github.com/org/*?q=(test)'));
  assert.equal(match('https://github.com/org/repo?q=(test)'), true);
  assert.equal(match('https://githubXcom/org/repo?q=(test)'), false);
  assert.equal(match('https://example.com/https://github.com/org/repo?q=(test)'), false);
});
test('regex supports routes and rejects malformed expressions', () => {
  const match = compileRule(rule('regex', '^https://dev\\.azure\\.com/(team-a|team-b)/'));
  assert.equal(match('https://dev.azure.com/team-a/project'), true);
  assert.equal(match('https://dev.azure.com/team-c/project'), false);
  assert.throws(() => compileRule(rule('regex', '[')));
});
test('first enabled match wins and internal URLs never match', () => {
  const rules = [rule('wildcard', '*', { enabled: false }), rule('domain', 'github.com', { id: '2' }), rule('wildcard', '*', { id: '3' })];
  assert.equal(findRule(rules, 'https://github.com/').id, '2');
  assert.equal(findRule(rules, 'chrome://settings'), undefined);
  assert.equal(findRule(rules, 'not a URL'), undefined);
});
test('settings reject bad imports and disabled invalid patterns', () => {
  const settings = { enabled: true, respectManual: true, rules: [rule('domain', 'github.com')] };
  assert.equal(validateSettings(settings), settings);
  assert.throws(() => validateSettings({ ...settings, rules: [rule('regex', '[', { enabled: false })] }), /Rule 1/);
  assert.throws(() => validateSettings({ ...settings, rules: [...settings.rules, ...settings.rules] }), /unique/);
  assert.throws(() => validateSettings({ ...settings, rules: [rule('domain', 'https://github.com')] }), /hostname/);
});

test('multiple filters use OR, preserve rule priority, and support mixed types', () => {
  const elk = rule('domain', 'unused.example', { filters: [
    { type: 'wildcard', pattern: 'https://logs.internal.example.com*' },
    { type: 'wildcard', pattern: 'https://logs.cluster.example.*' },
    { type: 'domain', pattern: 'logs.example.com' },
    { type: 'regex', pattern: '^https://other\\.example/test' }
  ] });
  for (const url of ['https://logs.internal.example.com/', 'https://logs.cluster.example.eu/app', 'https://logs.example.com/', 'https://other.example/test']) {
    assert.equal(findRule([elk, rule('wildcard', '*', { id: '2' })], url), elk);
  }
  assert.equal(findRule([elk], 'https://dashboard.cluster.example.com'), undefined);
  assert.equal(findRule([{ ...elk, enabled: false }], 'https://logs.internal.example.com'), undefined);
});

test('all filters must be valid and at least one is required', () => {
  const settings = filters => ({ enabled: true, respectManual: true, rules: [rule('domain', 'unused', { filters })] });
  for (const filters of [[], null, {}, [null]]) assert.throws(() => validateSettings(settings(filters)));
  assert.throws(() => validateSettings(settings([{ type: 'wildcard', pattern: '*' }, { type: 'regex', pattern: '[' }])), /Rule 1: Filter 2/);
});

test('legacy settings migrate without mutation and new exports round trip', () => {
  const old = { enabled: false, respectManual: true, rules: [rule('regex', '^https://example\\.com')] };
  const before = structuredClone(old);
  const migrated = normalizeSettings(old);
  assert.deepEqual(old, before);
  assert.deepEqual(migrated.rules[0].filters, [{ type: 'regex', pattern: old.rules[0].pattern }]);
  assert.equal(migrated.rules[0].id, old.rules[0].id);
  assert.equal(migrated.enabled, false);
  assert.equal('pattern' in migrated.rules[0], false);
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(migrated))), migrated);
});
