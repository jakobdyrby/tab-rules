import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileFilter, findRule, normalizeSettings, validateSettings } from '../extension/rules.js';

const url = 'https://dev.azure.com/copt/COPT/_workitems/recentlyupdated/';
const patterns = {
  regex: '^https://(?:copt\\.visualstudio\\.com/COPT|dev\\.azure\\.com/COPT/COPT)/_workitems/',
  wildcard: 'https://dev.azure.com/COPT/COPT/_workitems/*'
};
const configuration = filters => ({ enabled: true, respectManual: false, rules: [
  { id: 'wi', enabled: true, groupName: 'WI', color: 'green', filters }
] });

for (const type of ['regex', 'wildcard']) {
  test(`${type} ignores case only when explicitly enabled`, () => {
    const filter = { type, pattern: patterns[type] };
    assert.equal(compileFilter(filter)(url), false);
    assert.equal(compileFilter({ ...filter, ignoreCase: false })(url), false);
    assert.equal(compileFilter({ ...filter, ignoreCase: true })(url), true);
    assert.equal(compileFilter({ ...filter, ignoreCase: true })('https://dev.azure.com/OTHER/COPT/_workitems/'), false);
  });
}

test('ignore-case matching retains wildcard anchoring and literal punctuation', () => {
  const match = compileFilter({ type: 'wildcard', pattern: 'https://example.com/TEAM/*?q=(Test)', ignoreCase: true });
  assert.equal(match('https://example.com/team/item?q=(test)'), true);
  assert.equal(match('https://exampleXcom/team/item?q=(test)'), false);
  assert.equal(match('https://other.example/https://example.com/team/item?q=(test)'), false);
  assert.equal(match('https://example.com/team/item?q=test'), false);
});

test('ignore-case filters survive normalization and JSON export/import without changing rule priority', () => {
  const settings = configuration([{ type: 'regex', pattern: patterns.regex, ignoreCase: true }]);
  settings.rules.push({ ...settings.rules[0], id: 'fallback', groupName: 'Other', filters: [{ type: 'wildcard', pattern: '*' }] });
  const before = structuredClone(settings);
  const restored = normalizeSettings(JSON.parse(JSON.stringify(normalizeSettings(settings))));
  assert.deepEqual(settings, before);
  assert.deepEqual(restored.rules, before.rules);
  assert.equal(findRule(restored.rules, url).groupName, 'WI');
  assert.equal(findRule([{ ...restored.rules[0], enabled: false }, restored.rules[1]], url).groupName, 'Other');
  assert.equal(findRule(restored.rules, 'chrome://settings'), undefined);
});

test('ignoreCase must be a boolean, including on disabled rules', () => {
  for (const ignoreCase of ['false', 1, null, {}]) {
    const settings = configuration([{ type: 'regex', pattern: '.*', ignoreCase }]);
    settings.rules[0].enabled = false;
    assert.throws(() => validateSettings(settings), /Rule 1: Filter 1:.*case/i);
  }
  assert.throws(() => compileFilter({ type: 'regex', pattern: '[', ignoreCase: true }));
});

test('domain matching remains case-insensitive and old exports retain their behavior', () => {
  for (const ignoreCase of [undefined, false, true]) {
    assert.equal(compileFilter({ type: 'domain', pattern: 'EXAMPLE.COM', ignoreCase })('https://sub.example.com/Path'), true);
  }
  const legacy = { enabled: true, respectManual: true, rules: [
    { id: 'legacy', enabled: true, groupName: 'WI', color: 'green', type: 'regex', pattern: patterns.regex }
  ] };
  const restored = normalizeSettings(legacy);
  assert.equal(findRule(restored.rules, url), undefined);
  assert.equal(findRule(restored.rules, url.replace('/copt/', '/COPT/')).groupName, 'WI');
  assert.equal(restored.rules[0].filters[0].ignoreCase, undefined);
});
