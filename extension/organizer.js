import { DEFAULT_SETTINGS, findRule, isWebUrl } from './rules.js';

// All callers are serialized by the service worker, including membership events.
export function createOrganizer(api) {
  async function organize(tabId, settingsOverride) {
    const settings = settingsOverride ?? (await api.storage.local.get('settings')).settings ?? DEFAULT_SETTINGS;
    if (!settings.enabled) return 'paused';
    let tab;
    try { tab = await api.tabs.get(tabId); }
    catch { return 'closed'; }
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
    const group = groups.find(group => group.id === tab.groupId && group.title === name)
      || groups.find(group => group.title === name);
    if (group?.id === tab.groupId) return 'unchanged';
    const groupId = await api.tabs.group(group
      ? { tabIds: [tabId], groupId: group.id }
      : { tabIds: [tabId], createProperties: { windowId: tab.windowId } });
    // Persist ownership before queued Chrome membership events are processed.
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
