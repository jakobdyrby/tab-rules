import { DEFAULT_SETTINGS } from './rules.js';
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
  await orderGroups(api, effective);
  return counts;
}
