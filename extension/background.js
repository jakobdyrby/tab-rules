import { runManualAction } from './manual-actions.js';
import { orderGroups } from './group-order.js';
import { createOrganizer } from './organizer.js';
import { DEFAULT_SETTINGS } from './rules.js';

const organizer = createOrganizer(chrome);
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

chrome.tabs.onCreated.addListener(tab => schedule(tab.id));
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.groupId !== undefined) enqueue(() => organizer.membershipChanged(tabId, change.groupId));
  if (change.url || change.status === 'complete' || change.pinned === false) schedule(tabId);
});
chrome.tabs.onAttached.addListener(tabId => schedule(tabId));
chrome.tabs.onRemoved.addListener(tabId => {
  clearTimeout(pending.get(tabId));
  pending.delete(tabId);
  enqueue(() => chrome.storage.session.remove(`tab:${tabId}`));
});
chrome.tabs.onReplaced.addListener((addedId, removedId) => {
  enqueue(async () => {
    const oldKey = `tab:${removedId}`;
    const state = (await chrome.storage.session.get(oldKey))[oldKey];
    if (state) await chrome.storage.session.set({ [`tab:${addedId}`]: state });
    await chrome.storage.session.remove(oldKey);
    return organizer.organize(addedId);
  });
});
chrome.runtime.onInstalled.addListener(() => enqueue(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    await chrome.runtime.openOptionsPage();
  }
}));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !['apply', 'order', 'regroup'].includes(message?.type)) return;
  enqueue(() => runManualAction(chrome, organizer, message.type)).then(
    counts => respond({ ok: true, counts }),
    error => respond({ ok: false, error: error.message })
  );
  return true;
});

// Debounce Chrome's own move events; ordering is idempotent, so no feedback loop.
let orderTimer;
function scheduleGroupOrder() {
  clearTimeout(orderTimer);
  orderTimer = setTimeout(() => enqueue(() => orderGroups(chrome)), 350);
}
chrome.tabGroups.onCreated.addListener(scheduleGroupOrder);
chrome.tabGroups.onUpdated.addListener(scheduleGroupOrder);
chrome.tabGroups.onMoved.addListener(scheduleGroupOrder);
chrome.tabs.onMoved.addListener(scheduleGroupOrder);
chrome.tabs.onAttached.addListener(scheduleGroupOrder);
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.groupId !== undefined || change.pinned !== undefined) scheduleGroupOrder();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) scheduleGroupOrder();
});
chrome.runtime.onStartup.addListener(scheduleGroupOrder);
