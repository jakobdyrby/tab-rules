import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../extension/rules.js';

import { fixture } from './helpers/background-fixture.js';

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
