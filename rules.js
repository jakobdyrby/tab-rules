export const COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
export const DEFAULT_SETTINGS = { enabled: true, respectManual: true, rules: [] };

export function compileRule(rule) {
  const filters = rule.filters === undefined ? [{ type: rule.type, pattern: rule.pattern }] : rule.filters;
  if (!Array.isArray(filters) || !filters.length) throw new Error('Add at least one filter.');
  const matches = filters.map((filter, index) => {
    try { return compileFilter(filter); }
    catch (error) { throw new Error(`Filter ${index + 1}: ${error.message}`); }
  });
  return url => matches.some(match => match(url));
}

export function compileFilter(rule) {
  if (!rule || typeof rule.pattern !== 'string') throw new Error('Enter a pattern.');
  const pattern = rule.pattern.trim();
  if (!pattern) throw new Error('Enter a URL pattern.');
  if (rule.type === 'domain') {
    if (!/^[a-z0-9.-]+$/i.test(pattern) || pattern.includes('..')) {
      throw new Error('Use a hostname only, such as github.com (no path or protocol).');
    }
    const domain = pattern.toLowerCase();
    return url => {
      const host = new URL(url).hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    };
  }
  if (rule.type === 'wildcard') {
    const escaped = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    const regex = new RegExp(`^${escaped}$`);
    return url => regex.test(url);
  }
  if (rule.type === 'regex') {
    const regex = new RegExp(pattern);
    return url => regex.test(url);
  }
  throw new Error('Choose a supported match type.');
}

export function validateSettings(settings) {
  if (!settings || typeof settings.enabled !== 'boolean' || typeof settings.respectManual !== 'boolean' || !Array.isArray(settings.rules)) {
    throw new Error('Invalid settings file.');
  }
  const ids = new Set();
  for (const [index, rule] of settings.rules.entries()) {
    try {
      if (!rule || typeof rule.id !== 'string' || !rule.id || ids.has(rule.id)) throw new Error('Rule IDs must be unique.');
      ids.add(rule.id);
      if (typeof rule.enabled !== 'boolean') throw new Error('Invalid enabled state.');
      if (typeof rule.groupName !== 'string' || !rule.groupName.trim()) throw new Error('Enter a group name.');
      if (!COLORS.includes(rule.color)) throw new Error('Choose a group colour.');
      compileRule(rule);
    } catch (error) {
      throw new Error(`Rule ${index + 1}: ${error.message}`);
    }
  }
  return settings;
}

// Read old saved rules and exports without losing their IDs, order or settings.
export function normalizeSettings(settings) {
  validateSettings(settings);
  return {
    ...settings,
    rules: settings.rules.map(({ type, pattern, ...rule }) => ({
      ...rule,
      filters: (rule.filters ?? [{ type, pattern }]).map(filter => ({ ...filter }))
    }))
  };
}

export function isWebUrl(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); }
  catch { return false; }
}

export function findRule(rules, url) {
  if (!isWebUrl(url)) return undefined;
  return rules.find(rule => rule.enabled && compileRule(rule)(url));
}
