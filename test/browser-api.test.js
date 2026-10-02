import { test } from 'node:test';
import assert from 'node:assert/strict';

test('uses Firefox Promise APIs, falls back to Chrome, and allows the standalone preview', async t => {
  const originalBrowser = globalThis.browser;
  const originalChrome = globalThis.chrome;
  t.after(() => {
    if (originalBrowser === undefined) delete globalThis.browser;
    else globalThis.browser = originalBrowser;
    if (originalChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = originalChrome;
  });
  const firefox = { storage: { local: {} } };
  const chrome = { storage: { local: {} } };
  globalThis.browser = firefox;
  globalThis.chrome = chrome;
  assert.equal((await import('../extension/browser-api.js?firefox')).api, firefox);
  delete globalThis.browser;
  assert.equal((await import('../extension/browser-api.js?chrome')).api, chrome);
  delete globalThis.chrome;
  assert.equal((await import('../extension/browser-api.js?preview')).api, undefined);
});
