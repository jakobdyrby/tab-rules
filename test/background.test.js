import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../extension/rules.js';

function event() {
  const listeners = [];
  return {
    addListener: listener => listeners.push(listener),
    emit: (...args) => listeners.map(listener => listener(...args))
  };
}

function fixture() {
  const local = {};
  const session = {};
  const tabs = new Map();
  const groups = new Map();
  let nextGroupId = 100;
  let optionsOpened = 0;
  const storageArea = data => ({
    get: async key => ({ [key]: structuredClone(data[key]) }),
    set: async values => Object.assign(data, structuredClone(values)),
    remove: async key => { delete data[key]; }
  });
  const api = {
    storage: { local: storageArea(local), session: storageArea(session), onChanged: event() },
    runtime: {
      id: 'tab-rules@test', onInstalled: event(), onMessage: event(), onStartup: event(),
      openOptionsPage: async () => { optionsOpened++; }
    },
    tabs: {
      // Firefox has no onReplaced event or pendingUrl field.
      onCreated: event(), onUpdated: event(), onAttached: event(), onRemoved: event(), onMoved: event(),
      get: async id => {
        if (!tabs.has(id)) throw new Error('Tab closed');
        return { ...tabs.get(id) };
      },
      query: async ({ windowId }) => [...tabs.values()].filter(tab => windowId === undefined || tab.windowId === windowId),
      group: async ({ tabIds, groupId, createProperties }) => {
        if (groupId === undefined) {
          groupId = nextGroupId++;
          groups.set(groupId, { id: groupId, windowId: createProperties.windowId });
          api.tabGroups.onCreated.emit(groups.get(groupId));
        }
        for (const id of tabIds) {
          tabs.get(id).groupId = groupId;
          api.tabs.onUpdated.emit(id, { groupId });
        }
        return groupId;
      },
      ungroup: async ids => {
        for (const id of ids) {
          tabs.get(id).groupId = -1;
          api.tabs.onUpdated.emit(id, { groupId: -1 });
        }
      }
    },
    tabGroups: {
      onCreated: event(), onUpdated: event(), onMoved: event(),
      query: async ({ windowId }) => [...groups.values()].filter(group => windowId === undefined || group.windowId === windowId),
      update: async (id, values) => Object.assign(groups.get(id), values),
      move: async () => { throw new Error('These fixtures are already in rule order'); }
    }
  };
  const addTab = (id, values = {}) => {
    const tab = { id, windowId: 1, index: id - 1, groupId: -1, url: 'https://github.com/', cookieStoreId: 'firefox-container-1', ...values };
    tabs.set(id, tab);
    return tab;
  };
  const request = type => new Promise(resolve => {
    const results = api.runtime.onMessage.emit({ type }, { id: api.runtime.id }, resolve);
    assert.deepEqual(results, [true], 'background keeps the response channel open');
  });
  return { api, local, session, tabs, groups, addTab, request, optionsOpened: () => optionsOpened };
}

test('Firefox background starts without onReplaced and handles installation, tabs, and popup actions', async t => {
  const f = fixture();
  globalThis.browser = f.api;
  // Firefox also exposes a chrome namespace, but the extension must use browser.
  globalThis.chrome = {};
  t.after(() => { delete globalThis.browser; delete globalThis.chrome; });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await import('../extension/background.js');

  f.api.runtime.onInstalled.emit();
  await f.request('order'); // Also drains preceding background work.
  assert.deepEqual(f.local.settings, DEFAULT_SETTINGS);
  assert.equal(f.optionsOpened(), 1);
  f.api.runtime.onInstalled.emit();
  await f.request('order');
  assert.equal(f.optionsOpened(), 1, 'an update preserves existing settings');

  f.local.settings.rules = [{ id: 'code', enabled: true, groupName: 'Code', color: 'blue', filters: [{ type: 'domain', pattern: 'github.com' }] }];
  const tab = f.addTab(1);
  f.api.tabs.onCreated.emit(tab);
  f.api.tabs.onUpdated.emit(tab.id, { status: 'complete' });
  t.mock.timers.tick(350);
  await f.request('order');
  assert.equal(f.groups.size, 1);
  assert.equal(f.groups.get(tab.groupId).title, 'Code');
  assert.equal(tab.url, 'https://github.com/');
  assert.equal(tab.cookieStoreId, 'firefox-container-1');
  assert.equal(f.tabs.size, 1, 'native grouping does not reopen the tab');

  // Simulate manual ungrouping: subsequent navigation and Apply respect it.
  await f.api.tabs.ungroup([tab.id]);
  f.api.tabs.onUpdated.emit(tab.id, { url: tab.url });
  t.mock.timers.tick(350);
  assert.equal((await f.request('apply')).counts.protected, 1);
  assert.equal(tab.groupId, -1);

  f.local.settings.enabled = false;
  const second = f.addTab(2);
  f.api.tabs.onCreated.emit(second);
  t.mock.timers.tick(350);
  await f.request('order');
  assert.equal(second.groupId, -1, 'automatic grouping is paused');
  const saved = structuredClone(f.local.settings);
  const applied = await f.request('apply');
  assert.equal(applied.ok, true);
  assert.equal(applied.counts.grouped, 1, 'manual Apply still works while paused');
  assert.equal(applied.counts.protected, 1);
  assert.equal((await f.request('regroup')).counts.grouped, 1);
  assert.equal(tab.groupId, second.groupId);
  assert.deepEqual(f.local.settings, saved);

  f.tabs.delete(tab.id);
  second.index = 0;
  f.api.tabs.onRemoved.emit(tab.id);
  assert.equal((await f.request('order')).ok, true);
  assert.equal(f.session[`tab:${tab.id}`], undefined);
  assert.deepEqual(f.api.runtime.onMessage.emit({ type: 'apply' }, { id: 'another-extension' }, () => assert.fail('unexpected response')), [undefined]);
  assert.deepEqual(f.api.runtime.onMessage.emit({ type: 'unknown' }, { id: f.api.runtime.id }, () => assert.fail('unexpected response')), [undefined]);

  // A rejected API call returns a useful error and does not poison the queue.
  const get = f.api.storage.local.get;
  f.api.storage.local.get = async () => { throw new Error('Storage unavailable'); };
  t.mock.method(console, 'warn', () => {});
  assert.deepEqual(await f.request('apply'), { ok: false, error: 'Storage unavailable' });
  f.api.storage.local.get = get;
  assert.equal((await f.request('apply')).ok, true);
});
