import { api } from './browser-api.js';
import { runManualAction } from './manual-actions.js';
import { orderGroups } from './group-order.js';
import { createOrganizer } from './organizer.js';
import { DEFAULT_SETTINGS } from './rules.js';

const organizer = createOrganizer(api);
let queue = Promise.resolve();
function enqueue(work) {
  const result = queue.then(work);
  queue = result.catch(error => console.warn('Tab Rules:', error.message));
  return result;
}

const pending = new Map();
function schedule(tabId) {
  clearTimeout(pending.get(tabId));
  pending.set(tabId, setTimeout(() => {
    pending.delete(tabId);
    enqueue(() => organizer.organize(tabId));
  }, 300));
}

api.tabs.onCreated.addListener(tab => schedule(tab.id));
api.tabs.onUpdated.addListener((tabId, change) => {
  if (change.groupId !== undefined) enqueue(() => organizer.membershipChanged(tabId, change.groupId));
  if (change.url || change.status === 'complete' || change.pinned === false) schedule(tabId);
});
api.tabs.onAttached.addListener(tabId => schedule(tabId));
api.tabs.onRemoved.addListener(tabId => {
  clearTimeout(pending.get(tabId));
  pending.delete(tabId);
  enqueue(() => api.storage.session.remove(`tab:${tabId}`));
});
// Firefox does not expose Chrome's prerendered-tab replacement event.
api.tabs.onReplaced?.addListener((addedId, removedId) => {
  enqueue(async () => {
    const oldKey = `tab:${removedId}`;
    const state = (await api.storage.session.get(oldKey))[oldKey];
    if (state) await api.storage.session.set({ [`tab:${addedId}`]: state });
    await api.storage.session.remove(oldKey);
    return organizer.organize(addedId);
  });
});
api.runtime.onInstalled.addListener(() => enqueue(async () => {
  const { settings } = await api.storage.local.get('settings');
  if (!settings) {
    await api.storage.local.set({ settings: DEFAULT_SETTINGS });
    await api.runtime.openOptionsPage();
  }
}));
api.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== api.runtime.id || !['apply', 'order', 'regroup'].includes(message?.type)) return;
  enqueue(() => runManualAction(api, organizer, message.type)).then(
    counts => respond({ ok: true, counts }),
    error => respond({ ok: false, error: error.message })
  );
  return true;
});

// Debounce the browser's own move events; ordering is idempotent, so no feedback loop.
let orderTimer;
function scheduleGroupOrder() {
  clearTimeout(orderTimer);
  orderTimer = setTimeout(() => enqueue(() => orderGroups(api)), 350);
}
api.tabGroups.onCreated.addListener(scheduleGroupOrder);
api.tabGroups.onUpdated.addListener(scheduleGroupOrder);
api.tabGroups.onMoved.addListener(scheduleGroupOrder);
api.tabs.onMoved.addListener(scheduleGroupOrder);
api.tabs.onAttached.addListener(scheduleGroupOrder);
api.tabs.onUpdated.addListener((tabId, change) => {
  if (change.groupId !== undefined || change.pinned !== undefined) scheduleGroupOrder();
});
api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) scheduleGroupOrder();
});
api.runtime.onStartup.addListener(scheduleGroupOrder);
