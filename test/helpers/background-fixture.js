import assert from 'node:assert/strict';

function event() {
  const listeners = [];
  return {
    addListener: listener => listeners.push(listener),
    emit: (...args) => listeners.map(listener => listener(...args))
  };
}

export function fixture(replacementEvents = false) {
  const local = {};
  const session = {};
  const tabs = new Map();
  const groups = new Map();
  let nextGroupId = 100;
  let optionsOpened = 0;
  const storageArea = data => ({
    get: async key => ({ [key]: structuredClone(data[key]) }),
    set: async values => Object.assign(data, structuredClone(values)),
    remove: async key => { delete data[key]; }
  });
  const api = {
    storage: { local: storageArea(local), session: storageArea(session), onChanged: event() },
    runtime: {
      id: 'tab-rules@test', onInstalled: event(), onMessage: event(), onStartup: event(),
      openOptionsPage: async () => { optionsOpened++; }
    },
    tabs: {
      // Chrome exposes replacement events; Firefox does not.
      ...(replacementEvents ? { onReplaced: event() } : {}),
      onCreated: event(), onUpdated: event(), onAttached: event(), onRemoved: event(), onMoved: event(),
      get: async id => {
        if (!tabs.has(id)) throw new Error('Tab closed');
        return { ...tabs.get(id) };
      },
      query: async ({ windowId }) => [...tabs.values()].filter(tab => windowId === undefined || tab.windowId === windowId),
      group: async ({ tabIds, groupId, createProperties }) => {
        if (groupId === undefined) {
          groupId = nextGroupId++;
          groups.set(groupId, { id: groupId, windowId: createProperties.windowId });
          api.tabGroups.onCreated.emit(groups.get(groupId));
        }
        for (const id of tabIds) {
          tabs.get(id).groupId = groupId;
          api.tabs.onUpdated.emit(id, { groupId });
        }
        return groupId;
      },
      ungroup: async ids => {
        for (const id of ids) {
          tabs.get(id).groupId = -1;
          api.tabs.onUpdated.emit(id, { groupId: -1 });
        }
      }
    },
    tabGroups: {
      onCreated: event(), onUpdated: event(), onMoved: event(),
      query: async ({ windowId }) => [...groups.values()].filter(group => windowId === undefined || group.windowId === windowId),
      update: async (id, values) => Object.assign(groups.get(id), values),
      move: async () => { throw new Error('These fixtures are already in rule order'); }
    }
  };
  const addTab = (id, values = {}) => {
    const tab = { id, windowId: 1, index: id - 1, groupId: -1, url: 'https://github.com/', cookieStoreId: 'firefox-container-1', ...values };
    tabs.set(id, tab);
    return tab;
  };
  const request = type => new Promise(resolve => {
    const results = api.runtime.onMessage.emit({ type }, { id: api.runtime.id }, resolve);
    assert.deepEqual(results, [true], 'background keeps the response channel open');
  });
  return { api, local, session, tabs, groups, addTab, request, optionsOpened: () => optionsOpened };
}

