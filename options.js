import { COLORS, DEFAULT_SETTINGS, compileFilter, findRule, isWebUrl, normalizeSettings, validateSettings } from './rules.js';

const $ = selector => document.querySelector(selector);
const palette = { grey: '#88938c', blue: '#739fe8', red: '#e98080', yellow: '#eac562', green: '#73ac80', pink: '#e49bbe', purple: '#aa91d9', cyan: '#68bdc3', orange: '#e7a568' };
const isExtension = Boolean(globalThis.chrome?.storage?.local);
const storage = isExtension ? chrome.storage.local : {
  async get() { return { settings: JSON.parse(localStorage.getItem('tab-rules-preview') || 'null') || undefined }; },
  async set({ settings }) { localStorage.setItem('tab-rules-preview', JSON.stringify(settings)); }
};
let settings = structuredClone(DEFAULT_SETTINGS);
let dirty = false;
let highlightedRule;
let highlightTimer;
let noMatchTimer;
const placeholders = { domain: 'github.com', wildcard: 'https://github.com/your-org/*', regex: '^https://dev\\.azure\\.com/' };

function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function clearRuleHighlight() {
  clearTimeout(highlightTimer);
  highlightedRule?.classList.remove('test-match');
  highlightedRule?.querySelector('.filter-match')?.classList.remove('filter-match');
  highlightedRule = undefined;
}
function flashRule(rule, filterIndex) {
  const card = $('#rules').children[settings.rules.indexOf(rule)];
  if (!card) return;
  const filter = card.querySelector('.filters').children[filterIndex];
  (filter || card).scrollIntoView({ behavior: 'instant', block: 'center' });
  // Flush the cleared state before highlighting a repeated match.
  void card.offsetWidth;
  card.classList.add('test-match');
  filter?.classList.add('filter-match');
  highlightedRule = card;
  highlightTimer = setTimeout(clearRuleHighlight, 2400);
}
function clearNoMatchHighlight() {
  clearTimeout(noMatchTimer);
  $('.tester').classList.remove('test-no-match');
}
function flashNoMatch() {
  const tester = $('.tester');
  void tester.offsetWidth;
  tester.classList.add('test-no-match');
  noMatchTimer = setTimeout(clearNoMatchHighlight, 2400);
}
function changed() { clearRuleHighlight(); clearNoMatchHighlight(); dirty = true; status('Unsaved changes'); }
function render() {
  clearRuleHighlight();
  $('#enabled').checked = settings.enabled;
  $('#respectManual').checked = settings.respectManual;
  $('#count').textContent = settings.rules.length;
  $('#empty').hidden = settings.rules.length > 0;
  $('#rules').replaceChildren();
  settings.rules.forEach((rule, index) => {
    const card = $('#rule-template').content.firstElementChild.cloneNode(true);
    card.style.setProperty('--rule-color', palette[rule.color]);
    card.querySelector('.rule-number').textContent = String(index + 1).padStart(2, '0');
    const color = card.querySelector('[data-field=color]');
    for (const value of COLORS) color.add(new Option(value[0].toUpperCase() + value.slice(1), value));
    for (const input of card.querySelectorAll('[data-field]')) {
      const field = input.dataset.field;
      if (input.type === 'checkbox') input.checked = rule[field];
      else input.value = rule[field];
      input.addEventListener('input', () => {
        rule[field] = input.type === 'checkbox' ? input.checked : input.value;
        card.style.setProperty('--rule-color', palette[rule.color]);
        changed();
      });
    }
    card.querySelector('[data-action=up]').disabled = index === 0;
    card.querySelector('[data-action=down]').disabled = index === settings.rules.length - 1;
    for (const button of card.querySelectorAll('[data-action]')) button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'delete') settings.rules.splice(index, 1);
      else {
        const to = index + (action === 'up' ? -1 : 1);
        [settings.rules[index], settings.rules[to]] = [settings.rules[to], settings.rules[index]];
      }
      changed(); render();
    });
    function renderFilters() {
      const container = card.querySelector('.filters');
      container.replaceChildren();
      rule.filters.forEach((filter, filterIndex) => {
        const row = $('#filter-template').content.firstElementChild.cloneNode(true);
        row.querySelector('.filter-join').textContent = filterIndex === 0 ? 'IF' : 'OR';
        const pattern = row.querySelector('[data-filter=pattern]');
        pattern.placeholder = placeholders[filter.type];
        for (const input of row.querySelectorAll('[data-filter]')) {
          input.value = filter[input.dataset.filter];
          input.addEventListener('input', () => {
            filter[input.dataset.filter] = input.value;
            pattern.placeholder = placeholders[filter.type];
            changed();
          });
        }
        const remove = row.querySelector('button');
        remove.disabled = rule.filters.length === 1;
        remove.addEventListener('click', () => {
          rule.filters.splice(filterIndex, 1);
          changed(); renderFilters();
          card.querySelector('.add-filter').focus();
        });
        container.append(row);
      });
    }
    renderFilters();
    card.querySelector('.test-now').addEventListener('click', () => {
      clearRuleHighlight();
      clearNoMatchHighlight();
      $('.tester').scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'center'
      });
      $('#test-url').focus({ preventScroll: true });
    });
    card.querySelector('.add-filter').addEventListener('click', () => {
      rule.filters.push({ type: 'wildcard', pattern: '' });
      changed(); renderFilters();
      card.querySelector('.filters').lastElementChild.querySelector('[data-filter=pattern]').focus();
    });
    $('#rules').append(card);
  });
}
function addRule(example = false) {
  settings.rules.push({ id: crypto.randomUUID(), enabled: true, filters: [{ type: 'domain', pattern: example ? 'github.com' : '' }], groupName: example ? 'Code' : '', color: 'blue' });
  changed(); render();
  $('#rules').lastElementChild.querySelector('[data-filter=pattern]').focus();
}
async function save() {
  validateSettings(settings);
  await storage.set({ settings: structuredClone(settings) });
  dirty = false;
  status(isExtension ? 'Saved · Ready for your next tab' : 'Saved in browser preview · Load the extension to group real tabs');
}
async function run(action) {
  try { await action(); } catch (error) { status(error.message, true); }
}
$('#add').addEventListener('click', () => addRule());
$('#example').addEventListener('click', () => addRule(true));
for (const key of ['enabled', 'respectManual']) $(`#${key}`).addEventListener('change', event => {
  settings[key] = event.target.checked; changed();
});
$('#save').addEventListener('click', () => run(save));
$('#apply').addEventListener('click', () => run(async () => {
  await save();
  if (!isExtension) { status('Preview only · Load this folder as a Chrome extension to organize tabs.'); return; }
  if (!settings.enabled) { status('Automatic grouping is paused. Enable it before applying rules.'); return; }
  $('#apply').disabled = true;
  status('Organizing open tabs…');
  try {
    const result = await chrome.runtime.sendMessage({ type: 'apply' });
    if (!result?.ok) throw new Error(result?.error || 'The extension did not respond. Try reloading it.');
    const counts = result.counts;
    status(`Done · ${counts.grouped || 0} grouped · ${counts.ungrouped || 0} ungrouped · ${counts.unchanged || 0} already in place · ${counts.protected || 0} protected · ${counts.failed || 0} failed`, Boolean(counts.failed));
  } finally { $('#apply').disabled = false; }
}));
function testUrl() {
  clearRuleHighlight();
  clearNoMatchHighlight();
  const output = $('#test-result');
  output.classList.remove('result-placeholder');
  try {
    validateSettings(settings);
    const url = $('#test-url').value.trim();
    if (!isWebUrl(url)) throw new Error('Enter a complete http:// or https:// URL.');
    const rule = findRule(settings.rules, url);
    const filterIndex = rule ? rule.filters.findIndex(filter => compileFilter(filter)(url)) : -1;
    output.textContent = rule ? `Rule ${settings.rules.indexOf(rule) + 1} → ${rule.groupName} · Filter ${filterIndex + 1}${settings.enabled ? '' : ' (grouping is paused)'}` : !settings.enabled || settings.respectManual ? 'No matching rule. This tab would be left as it is.' : 'No matching rule. This tab would leave its group.';
    output.classList.remove('error');
    if (rule) flashRule(rule, filterIndex);
    else flashNoMatch();
  } catch (error) { output.textContent = error.message; output.classList.add('error'); }
}
$('#test').addEventListener('click', testUrl);
$('#test-url').addEventListener('input', () => {
  clearNoMatchHighlight();
  clearRuleHighlight();
  const output = $('#test-result');
  output.classList.add('result-placeholder');
  output.textContent = 'Testing a URL jumps to the first matching rule.';
  output.classList.remove('error');
});
$('#test-url').addEventListener('keydown', event => { if (event.key === 'Enter') testUrl(); });
$('#export').addEventListener('click', () => run(async () => {
  validateSettings(settings);
  const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'tab-rules.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Exported current rules');
}));
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', event => run(async () => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 1_000_000) throw new Error('Choose a rules file smaller than 1 MB.');
  settings = normalizeSettings(JSON.parse(await file.text()));
  changed(); render(); status('Imported · Review your rules, then save to replace the saved set.');
}));
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
run(async () => {
  const saved = await storage.get('settings');
  settings = saved.settings ? normalizeSettings(saved.settings) : structuredClone(DEFAULT_SETTINGS);
  render();
  status(isExtension ? 'All changes saved' : 'Browser preview · Rule editing works; real tab grouping requires the extension');
});
