import { isWebUrl } from './rules.js';

export function suggestUrls(tabs, recent, query) {
  const candidates = new Map();
  for (const tab of tabs) {
    const url = tab.pendingUrl || tab.url;
    if (!tab.incognito && isWebUrl(url) && !candidates.has(url)) {
      candidates.set(url, { url, title: tab.title || url, source: 'Open tab' });
    }
  }
  for (const url of recent) {
    if (isWebUrl(url) && !candidates.has(url)) candidates.set(url, { url, title: url, source: 'Recent test' });
  }
  const text = query.trim().toLowerCase();
  return [...candidates.values()]
    .filter(item => !text || `${item.url} ${item.title}`.toLowerCase().includes(text))
    .slice(0, 8);
}

export function rememberUrl(recent, url) {
  if (!isWebUrl(url)) return recent;
  return [url, ...recent.filter(item => item !== url && isWebUrl(item))].slice(0, 20);
}

export function setupUrlSuggestions(input, list, extension) {
  let tabs = [];
  let recent = [];
  let suggestions = [];
  let active = -1;
  let generation = 0;
  let saves = Promise.resolve();
  const readRecent = async () => {
    const value = extension
      ? (await chrome.storage.local.get('recentTestUrls')).recentTestUrls
      : JSON.parse(localStorage.getItem('tab-rules-recent-tests') || '[]');
    return Array.isArray(value) ? value.filter(isWebUrl).slice(0, 20) : [];
  };
  const ready = readRecent().then(value => { recent = value; }).catch(() => {});
  function close() {
    generation++;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function choose(index) {
    if (!suggestions[index]) return;
    input.value = suggestions[index].url;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    close();
    input.focus({ preventScroll: true });
  }
  function render() {
    suggestions = suggestUrls(tabs, recent, input.value);
    active = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    suggestions.forEach((item, index) => {
      const option = document.createElement('li');
      option.id = `url-option-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const heading = document.createElement('span');
      heading.className = 'suggestion-heading';
      const title = document.createElement('span');
      title.textContent = item.title;
      const source = document.createElement('small');
      source.textContent = item.source;
      heading.append(title, source);
      const url = document.createElement('span');
      url.className = 'suggestion-url';
      url.textContent = item.url;
      option.append(heading, url);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => choose(index));
      list.append(option);
    });
    list.hidden = suggestions.length === 0;
    input.setAttribute('aria-expanded', String(!list.hidden));
  }
  input.addEventListener('focus', async () => {
    const current = ++generation;
    await ready;
    if (extension) {
      try { tabs = await chrome.tabs.query({}); } catch { tabs = []; }
    }
    if (current === generation && document.activeElement === input) render();
  });
  input.addEventListener('input', render);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.preventDefault(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (list.hidden) render();
      if (!suggestions.length) return;
      event.preventDefault();
      active = active < 0 ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1)
        : (active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
      input.setAttribute('aria-activedescendant', list.children[active].id);
      list.children[active].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && !list.hidden && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  });
  return {
    close,
    remember(url) {
      saves = saves.then(async () => {
        await ready;
        recent = rememberUrl(await readRecent(), url);
        if (extension) await chrome.storage.local.set({ recentTestUrls: recent });
        else localStorage.setItem('tab-rules-recent-tests', JSON.stringify(recent));
      }).catch(error => console.warn('Could not save recent test URL:', error.message));
    }
  };
}
