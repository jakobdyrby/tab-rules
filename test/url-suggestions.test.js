import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestUrls, rememberUrl } from '../extension/url-suggestions.js';

test('searches titles and URLs, deduplicates and prefers open tabs', () => {
  const tabs = [{url:'https://example.com/a', title:'My project'}, {url:'https://example.com/a',title:'Duplicate'}];
  assert.deepEqual(suggestUrls(tabs, ['https://example.com/a','https://example.org/'], 'project'), [{url:'https://example.com/a',title:'My project',source:'Open tab'}]);
  assert.equal(suggestUrls(tabs, ['https://example.com/a','https://example.org/'], '').length, 2);
  assert.equal(suggestUrls(tabs, [], 'EXAMPLE.COM')[0].source, 'Open tab');
});
test('excludes private and internal tabs and caps suggestions', () => {
  assert.deepEqual(suggestUrls([{url:'https://private.example',incognito:true},{url:'chrome://settings'}], ['not-url'], ''), []);
  assert.equal(suggestUrls([], Array.from({length:20},(_,i)=>`https://example.com/${i}`), '').length, 8);
});
test('recent tests deduplicate, move newest first and cap at 20', () => {
  assert.deepEqual(rememberUrl(['https://a.com','https://b.com'], 'https://b.com'), ['https://b.com','https://a.com']);
  const recent = Array.from({length:20},(_,i)=>`https://example.com/${i}`);
  assert.equal(rememberUrl(recent,'https://new.com').length,20);
  assert.deepEqual(rememberUrl(recent,'bad'),recent);
});
