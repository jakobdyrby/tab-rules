import { DEFAULT_SETTINGS, findRule, isWebUrl } from './rules.js';

// The background queue also serializes membership events with our session writes.
export function createOrganizer(api) {
  const windows = new Map();
  const retry = Symbol('tab changed');
  async function organize(tabId, settingsOverride) {
    const settings = settingsOverride ?? (await api.storage.local.get('settings')).settings ?? DEFAULT_SETTINGS;
    if (!settings.enabled) return 'paused';
    // Own the find/create/assign transaction here, including naming the new group.
    // Look up groups only after earlier work in this window has finished.
    for (;;) {
      let tab;
      try { tab = await api.tabs.get(tabId); }
      catch { return 'closed'; }
      const windowId = tab.windowId;
      const previous = windows.get(windowId) ?? Promise.resolve();
      const result = previous.catch(() => {}).then(() => organizeInWindow(tabId, settings, windowId));
      windows.set(windowId, result);
      try {
        const outcome = await result;
        if (outcome !== retry) return outcome;
      } finally {
        if (windows.get(windowId) === result) windows.delete(windowId);
      }
      // A browser move/navigation during an API await invalidates the snapshot.
      // Release this window before retrying, possibly in a different window.
    }
  }

  async function organizeInWindow(tabId, settings, windowId) {
    let tab;
    try { tab = await api.tabs.get(tabId); }
    catch { return 'closed'; }
    if (tab.windowId !== windowId) return retry;
    if (tab.pinned || tab.incognito) return 'skipped';
    const key = `tab:${tabId}`;
    const state = (await api.storage.session.get(key))[key];
    // Existing membership wins, including groups created by this extension.
    if (settings.respectManual && (state?.manual || tab.groupId !== -1)) return 'protected';
    const url = tab.pendingUrl || tab.url;
    const rule = findRule(settings.rules, url);
    if (!rule) {
      if (!settings.respectManual && tab.groupId !== -1 && isWebUrl(url)) {
        await api.tabs.ungroup([tabId]);
        // Mark our own membership change before its queued event is handled.
        await api.storage.session.set({ [key]: { groupId: -1, manual: false } });
        return 'ungrouped';
      }
      return 'unmatched';
    }
    const groups = await api.tabGroups.query({ windowId: tab.windowId });
    const name = rule.groupName.trim();
    let group = groups.find(group => group.id === tab.groupId && group.title === name)
      || groups.find(group => group.title === name);
    // Another browser actor may have created/restored a group since the first
    // lookup. Query once more before creating; never cache absence.
    if (!group) {
      const current = await api.tabGroups.query({ windowId });
      group = current.find(group => group.title === name);
    }
    // Browser/user changes are outside our queue. Re-evaluate if the tab
    // changed during either group lookup before assigning membership.
    let latest;
    try { latest = await api.tabs.get(tabId); }
    catch { return 'closed'; }
    if (['windowId', 'groupId', 'url', 'pendingUrl', 'pinned', 'incognito'].some(field => latest[field] !== tab[field])) return retry;
    if (group?.id === tab.groupId) return 'unchanged';
    const groupId = await api.tabs.group(group
      ? { tabIds: [tabId], groupId: group.id }
      : { tabIds: [tabId], createProperties: { windowId: tab.windowId } });
    // Persist ownership before queued browser membership events are processed.
    await api.storage.session.set({ [key]: { groupId, manual: false } });
    if (!group) await api.tabGroups.update(groupId, { title: name, color: rule.color });
    return 'grouped';
  }

  async function membershipChanged(tabId, groupId) {
    const key = `tab:${tabId}`;
    const state = (await api.storage.session.get(key))[key];
    if (state?.groupId === groupId) return;
    await api.storage.session.set({ [key]: { groupId, manual: true } });
  }

  async function applyAll(settingsOverride) {
    const counts = {};
    for (const tab of await api.tabs.query({})) {
      try {
        const result = await organize(tab.id, settingsOverride);
        counts[result] = (counts[result] || 0) + 1;
      } catch (error) {
        counts.failed = (counts.failed || 0) + 1;
        console.warn('Could not organize tab', tab.id, error.message);
      }
    }
    return counts;
  }
  return { organize, membershipChanged, applyAll };
}
