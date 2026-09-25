import { DEFAULT_SETTINGS } from './rules.js';

export async function orderGroups(api) {
  const { settings = DEFAULT_SETTINGS } = await api.storage.local.get('settings');
  if (!settings.enabled || !settings.orderGroups) return;
  const rank = new Map();
  for (const rule of settings.rules) {
    const name = rule.groupName.trim();
    if (rule.enabled && !rank.has(name)) rank.set(name, rank.size);
  }
  const groups = await api.tabGroups.query({});
  for (const windowId of new Set(groups.map(group => group.windowId))) {
    let tabs = await api.tabs.query({ windowId });
    if (tabs.some(tab => tab.incognito)) continue;
    tabs.sort((a, b) => a.index - b.index);
    const firstIndex = id => tabs.find(tab => tab.groupId === id)?.index ?? Infinity;
    const managed = groups.filter(group => group.windowId === windowId && rank.has(group.title) && Number.isFinite(firstIndex(group.id)));
    managed.sort((a, b) => rank.get(a.title) - rank.get(b.title) || firstIndex(a.id) - firstIndex(b.id));
    let index = tabs.filter(tab => tab.pinned).length;
    for (const group of managed) {
      // Refresh after every move: indices shift by the size of the whole group.
      tabs = await api.tabs.query({ windowId });
      const members = tabs.filter(tab => tab.groupId === group.id).sort((a, b) => a.index - b.index);
      if (!members.length) continue;
      if (members[0].index !== index) await api.tabGroups.move(group.id, { index });
      index += members.length;
    }
  }
}
