import { DEFAULT_SETTINGS, isWebUrl } from './rules.js';
import { orderGroups } from './group-order.js';

export async function runManualAction(api, organizer, action) {
  if (!['apply', 'order', 'regroup'].includes(action)) throw new Error('Unknown action.');
  const { settings = DEFAULT_SETTINGS } = await api.storage.local.get('settings');
  // One snapshot for the whole operation; never persist these overrides.
  const effective = { ...settings, enabled: true };
  if (action === 'order') {
    await orderGroups(api, { ...effective, orderGroups: true });
    return {};
  }
  if (action === 'regroup') effective.respectManual = false;
  const counts = await organizer.applyAll(effective);
  await refreshGroupColours(api, effective, counts);
  await orderGroups(api, effective);
  return counts;
}

async function refreshGroupColours(api, settings, counts) {
  // Group names are the stable rule-to-group link; first enabled rule wins.
  const colours = new Map();
  for (const rule of settings.rules) {
    const name = rule.groupName.trim();
    if (rule.enabled && !colours.has(name)) colours.set(name, rule.color);
  }
  const tabs = await api.tabs.query({});
  const eligible = tabs.filter(tab => !tab.incognito && !tab.pinned && isWebUrl(tab.pendingUrl || tab.url));
  for (const windowId of new Set(eligible.map(tab => tab.windowId))) {
    const groups = await api.tabGroups.query({ windowId });
    for (const group of groups) {
      if (!colours.has(group.title) || group.color === colours.get(group.title)) continue;
      if (!eligible.some(tab => tab.windowId === windowId && tab.groupId === group.id)) continue;
      try {
        await api.tabGroups.update(group.id, { color: colours.get(group.title) });
        counts.recoloured = (counts.recoloured || 0) + 1;
      } catch (error) {
        counts.failed = (counts.failed || 0) + 1;
        console.warn('Could not update group colour', group.id, error.message);
      }
    }
  }
}
