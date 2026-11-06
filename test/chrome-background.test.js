import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/background-fixture.js';

test('Chrome event bursts, replacement, startup, and bulk actions reuse groups', async t => {
  const f = fixture(true);
  globalThis.chrome = f.api;
  t.after(() => { delete globalThis.chrome; });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await import('../extension/background.js');
  f.local.settings = { enabled: true, respectManual: true, orderGroups: false, rules: [
    { id: 'code', enabled: true, groupName: 'Code', color: 'blue', filters: [{ type: 'domain', pattern: 'example.com' }] }
  ] };

  // Startup orders only; it must not regroup restored/manual membership.
  const restored = f.addTab(50, { groupId: 42, url: 'https://example.com/' });
  f.groups.set(42, { id: 42, windowId: 1, title: 'Manual', color: 'pink' });
  f.api.runtime.onStartup.emit();
  t.mock.timers.tick(350);
  await f.request('order');
  assert.equal(restored.groupId, 42);

  for (let id = 1; id <= 12; id++) {
    const tab = f.addTab(id, { windowId: id <= 8 ? 1 : 2, url: 'https://unmatched.test/', pendingUrl: 'https://example.com/start' });
    f.api.tabs.onCreated.emit(tab);
    f.api.tabs.onUpdated.emit(id, { url: 'https://example.com/start' });
    tab.pendingUrl = 'https://example.com/redirect';
    f.api.tabs.onUpdated.emit(id, { url: tab.pendingUrl });
    f.api.tabs.onUpdated.emit(id, { status: 'complete' });
    f.api.tabs.onAttached.emit(id, { newWindowId: tab.windowId });
  }
  t.mock.timers.tick(350);
  const responses = await Promise.all([f.request('apply'), f.request('regroup')]);
  assert.ok(responses.every(response => response.ok));
  assert.equal(f.groups.size, 3, 'one matching group per window plus the manual group');
  for (const windowId of [1, 2]) {
    const tabs = [...f.tabs.values()].filter(tab => tab.id !== 50 && tab.windowId === windowId);
    assert.equal(new Set(tabs.map(tab => tab.groupId)).size, 1);
    assert.equal(f.groups.get(tabs[0].groupId).title, 'Code');
    for (const tab of tabs) assert.equal(f.session[`tab:${tab.id}`].manual, false);
  }

  // Chrome prerender/replacement transfers the session state, then groups the
  // replacement through the same organizer and queue as navigation and Apply.
  const oldId = 1;
  const groupId = f.tabs.get(oldId).groupId;
  f.tabs.delete(oldId);
  const replacement = f.addTab(100, { groupId, url: 'https://example.com/replaced' });
  f.api.tabs.onReplaced.emit(replacement.id, oldId);
  await f.request('apply');
  assert.equal(replacement.groupId, groupId);
  assert.equal(f.session[`tab:${oldId}`], undefined);
  assert.deepEqual(f.session[`tab:${replacement.id}`], { groupId, manual: false });
  assert.equal(f.groups.size, 3);
});
