import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrganizer } from '../extension/organizer.js';

function fixture() {
  const settings = { enabled: true, respectManual: true, rules: [
    { id: '1', type: 'domain', pattern: 'github.com', groupName: 'Code', color: 'blue', enabled: true },
    { id: '2', type: 'domain', pattern: 'chatgpt.com', groupName: 'AI', color: 'green', enabled: true }
  ] };
  const tabs = new Map();
  const groups = new Map();
  const session = {};
  let nextId = 100;
  const api = {
    storage: {
      local: { get: async () => ({ settings }) },
      session: {
        get: async key => ({ [key]: session[key] }),
        set: async values => Object.assign(session, values)
      }
    },
    tabs: {
      get: async id => { if (!tabs.has(id)) throw new Error('Tab closed'); return { ...tabs.get(id) }; },
      query: async () => [...tabs.values()],
      ungroup: async ids => { for (const id of ids) tabs.get(id).groupId = -1; },
      group: async ({ tabIds, groupId, createProperties }) => {
        if (!groupId) { groupId = nextId++; groups.set(groupId, { id: groupId, windowId: createProperties.windowId }); }
        for (const id of tabIds) tabs.get(id).groupId = groupId;
        return groupId;
      }
    },
    tabGroups: {
      query: async ({ windowId }) => [...groups.values()].filter(group => group.windowId === windowId),
      update: async (id, values) => Object.assign(groups.get(id), values)
    }
  };
  const add = (id, values = {}) => tabs.set(id, { id, windowId: 1, url: 'https://github.com/org', groupId: -1, ...values });
  return { settings, tabs, groups, api, add, organizer: createOrganizer(api) };
}

test('reuses a named group but keeps separate groups per window', async () => {
  const f = fixture(); f.add(1); f.add(2); f.add(3, { windowId: 2 });
  await f.organizer.applyAll();
  assert.equal(f.groups.size, 2);
  assert.equal(f.tabs.get(1).groupId, f.tabs.get(2).groupId);
  assert.notEqual(f.tabs.get(1).groupId, f.tabs.get(3).groupId);
});

test('different filters in one rule place tabs in the same group', async () => {
  const f = fixture();
  f.settings.rules = [{ id: 'elk', enabled: true, groupName: 'Elk', color: 'blue', filters: [
    { type: 'wildcard', pattern: 'https://logs.internal.example.com*' },
    { type: 'wildcard', pattern: 'https://logs.cluster.example.*' }
  ] }];
  f.add(1, { url: 'https://logs.internal.example.com/app' });
  f.add(2, { url: 'https://logs.cluster.example.eu/app' });
  assert.deepEqual(await f.organizer.applyAll(), { grouped: 2 });
  assert.equal(f.groups.size, 1);
  assert.equal(f.groups.get(f.tabs.get(1).groupId).title, 'Elk');
  assert.equal(f.tabs.get(1).groupId, f.tabs.get(2).groupId);
});
test('automatically grouped tabs keep their group on navigation and worker restart', async () => {
  const f = fixture(); f.add(1);
  await f.organizer.organize(1);
  await f.organizer.membershipChanged(1, f.tabs.get(1).groupId);
  f.tabs.get(1).url = 'https://chatgpt.com/';
  const restarted = createOrganizer(f.api);
  assert.equal(await restarted.organize(1), 'protected');
  assert.equal(f.groups.get(f.tabs.get(1).groupId).title, 'Code');
});

test('new tabs inside a group keep it unless protection is disabled', async () => {
  const f = fixture(); f.add(1);
  await f.organizer.organize(1);
  const groupId = f.tabs.get(1).groupId;
  f.add(2, { groupId, url: 'https://chatgpt.com/' });
  assert.equal(await f.organizer.organize(2), 'protected');
  assert.equal(f.tabs.get(2).groupId, groupId);
  assert.deepEqual(await f.organizer.applyAll(), { protected: 2 });
  f.settings.respectManual = false;
  assert.equal(await f.organizer.organize(2), 'grouped');
  assert.equal(f.groups.get(f.tabs.get(2).groupId).title, 'AI');
});
test('manual group moves and ungrouping stay protected', async () => {
  const f = fixture(); f.add(1);
  await f.organizer.organize(1);
  f.tabs.get(1).groupId = -1;
  await f.organizer.membershipChanged(1, -1);
  assert.equal(await f.organizer.organize(1), 'protected');
  f.settings.respectManual = false;
  assert.equal(await f.organizer.organize(1), 'grouped');
});
test('existing manual groups are protected and preserve their colour when reused', async () => {
  const f = fixture(); f.add(1, { groupId: 42 }); f.add(2);
  f.groups.set(42, { id: 42, windowId: 1, title: 'Code', color: 'pink' });
  assert.equal(await f.organizer.organize(1), 'protected');
  assert.equal(await f.organizer.organize(2), 'grouped');
  assert.equal(f.tabs.get(2).groupId, 42);
  assert.equal(f.groups.get(42).color, 'pink');
});
test('pinned, incognito, internal, closed and unmatched tabs are not moved', async () => {
  const f = fixture();
  f.add(1, { pinned: true }); f.add(2, { incognito: true }); f.add(3, { url: 'chrome://settings' }); f.add(4, { url: 'https://example.com' });
  const counts = await f.organizer.applyAll();
  assert.deepEqual(counts, { skipped: 2, unmatched: 2 });
  assert.equal(await f.organizer.organize(99), 'closed');
  assert.equal(f.groups.size, 0);
});
test('unmatched tabs leave their group only when grouping is enabled and protection is off', async () => {
  const f = fixture(); f.add(1); f.settings.enabled = false;
  assert.equal(await f.organizer.organize(1), 'paused');
  f.settings.enabled = true;
  await f.organizer.organize(1);
  const groupId = f.tabs.get(1).groupId;
  f.tabs.get(1).url = 'https://example.com';
  assert.equal(await f.organizer.organize(1), 'protected');
  assert.equal(f.tabs.get(1).groupId, groupId);
  f.settings.respectManual = false;
  f.settings.enabled = false;
  assert.equal(await f.organizer.organize(1), 'paused');
  assert.equal(f.tabs.get(1).groupId, groupId);
  f.settings.enabled = true;
  assert.equal(await f.organizer.organize(1), 'ungrouped');
  assert.equal(f.tabs.get(1).groupId, -1);
  assert.equal(await f.organizer.organize(1), 'unmatched');
  await f.organizer.membershipChanged(1, -1);
  f.settings.respectManual = true;
  f.tabs.get(1).url = 'https://github.com/org';
  assert.equal(await f.organizer.organize(1), 'grouped');
});

test('apply ungrouping preserves pinned, incognito and non-web tabs', async () => {
  const f = fixture(); f.settings.respectManual = false;
  f.add(1, { groupId: 42, url: 'https://example.com' });
  f.add(2, { groupId: 42, pinned: true, url: 'https://example.com' });
  f.add(3, { groupId: 42, incognito: true, url: 'https://example.com' });
  f.add(4, { groupId: 42, url: 'chrome://settings' });
  assert.deepEqual(await f.organizer.applyAll(), { ungrouped: 1, skipped: 2, unmatched: 1 });
  for (const id of [2, 3, 4]) assert.equal(f.tabs.get(id).groupId, 42);
});
test('a failed tab operation does not prevent other tabs from being organized', async () => {
  const f = fixture(); f.add(1); f.add(2);
  const group = f.api.tabs.group;
  f.api.tabs.group = async args => { if (args.tabIds[0] === 1) throw new Error('Tab is being dragged'); return group(args); };
  const counts = await f.organizer.applyAll();
  assert.equal(counts.failed, 1);
  assert.equal(counts.grouped, 1);
});

 test('manual actions work while paused, preserve settings, and override protection only for regroup', async () => {
  const { runManualAction } = await import('../extension/manual-actions.js');
  const f = fixture(); f.settings.enabled = false;
  f.add(1); f.add(2, { groupId: 42 });
  f.add(3, { groupId: 42, url: 'https://example.com' });
  f.add(4, { pinned: true, groupId: 42 });
  f.add(5, { incognito: true, groupId: 42 });
  f.add(6, { groupId: 42, url: 'chrome://settings' });
  f.add(7); await f.organizer.membershipChanged(7, -1);
  const before = structuredClone(f.settings);
  const applied = await runManualAction(f.api, f.organizer, 'apply');
  assert.equal(applied.grouped, 1);
  assert.equal(f.tabs.get(2).groupId, 42);
  assert.equal(f.tabs.get(7).groupId, -1);
  const regrouped = await runManualAction(f.api, f.organizer, 'regroup');
  assert.equal(regrouped.grouped, 2);
  assert.equal(regrouped.ungrouped, 1);
  assert.equal(f.tabs.get(2).groupId, f.tabs.get(1).groupId);
  assert.equal(f.tabs.get(7).groupId, f.tabs.get(1).groupId);
  for (const id of [4, 5, 6]) assert.equal(f.tabs.get(id).groupId, 42);
  assert.deepEqual(f.settings, before);
  assert.equal(await f.organizer.organize(1), 'paused');
});
