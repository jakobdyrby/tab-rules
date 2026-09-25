import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderGroups } from '../extension/group-order.js';
import { normalizeSettings, validateSettings } from '../extension/rules.js';

function fixture() {
  const settings = { enabled: true, respectManual: true, orderGroups: true, rules: [
    { enabled: true, groupName: 'Code' }, { enabled: true, groupName: 'AI' }
  ] };
  const groups = [
    { id: 1, title: 'AI', windowId: 1, collapsed: true },
    { id: 2, title: 'Other', windowId: 1 },
    { id: 3, title: 'Code', windowId: 1 }
  ];
  let tabs = [
    { id: 10, groupId: -1, pinned: true },
    { id: 11, groupId: 1 }, { id: 12, groupId: 1 },
    { id: 13, groupId: -1 }, { id: 14, groupId: 2 },
    { id: 15, groupId: 3 }, { id: 16, groupId: 3 }
  ].map((tab, index) => ({ ...tab, index, windowId: 1 }));
  const moves = [];
  const api = {
    storage: { local: { get: async () => ({ settings }) } },
    tabs: { query: async ({ windowId }) => tabs.filter(t => t.windowId === windowId).map(t => ({ ...t })) },
    tabGroups: {
      query: async () => groups,
      move: async (id, { index }) => {
        moves.push({ id, index });
        const members = tabs.filter(t => t.groupId === id);
        assert.ok(index >= tabs.filter(t => t.pinned).length);
        tabs = tabs.filter(t => t.groupId !== id);
        tabs.splice(index, 0, ...members);
        tabs.forEach((t, i) => { t.index = i; });
      }
    }
  };
  return { api, settings, groups, moves, tabs: () => tabs };
}

test('orders whole groups after pinned tabs, preserves other tabs, and is idempotent', async () => {
  const f = fixture();
  await orderGroups(f.api);
  assert.deepEqual(f.tabs().map(t => t.id), [10,15,16,11,12,13,14]);
  assert.deepEqual(f.moves, [{id:3,index:1}]);
  assert.equal(f.groups[0].collapsed, true);
  await orderGroups(f.api);
  assert.equal(f.moves.length, 1);
});

test('disabled or absent setting and automatic pause do not move groups', async () => {
  for (const override of [{orderGroups:false}, {orderGroups:undefined}, {enabled:false}]) {
    const f = fixture(); Object.assign(f.settings, override);
    await orderGroups(f.api); assert.equal(f.moves.length, 0);
  }
});

test('disabled rules are excluded and first enabled duplicate name wins', async () => {
  const f = fixture();
  f.settings.rules = [{enabled:false,groupName:'AI'}, {enabled:true,groupName:'Code'}, {enabled:true,groupName:'AI'}, {enabled:true,groupName:'Code'}];
  await orderGroups(f.api);
  assert.deepEqual(f.tabs().map(t => t.id), [10,15,16,11,12,13,14]);
});

test('incognito windows are untouched', async () => {
  const f = fixture(); f.tabs().forEach(t => { t.incognito = true; });
  await orderGroups(f.api); assert.equal(f.moves.length, 0);
});

test('settings migration defaults ordering off and validates the flag', () => {
  const settings = { enabled:true, respectManual:true, rules:[] };
  assert.equal(normalizeSettings(settings).orderGroups, false);
  assert.equal(normalizeSettings({...settings,orderGroups:true}).orderGroups, true);
  assert.throws(() => validateSettings({...settings,orderGroups:'yes'}));
});
