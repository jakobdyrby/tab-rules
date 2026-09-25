# Tab Rules

A dependency-free Manifest V3 extension that organizes native Chrome tab groups using URL rules. All settings stay on your computer. No account, analytics, content scripts, or external requests.

## Try it in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Select **Load unpacked** and choose this folder: `C:\work\tool-chrome-tab-group-organizer`.
3. The rule editor opens on first install. You can reopen it from the extension toolbar icon or the extension's Options menu.
4. Add a rule, e.g. **Domain** → `github.com` → group **Code** → **Blue**.
5. Click **Save changes**, then open a matching URL. Use **Apply to open tabs** to save and organize existing tabs across all windows.

No npm install or build is needed. After changing source files, click Reload on the extension's card and refresh the options page.

## Rules

Rules are evaluated in list order; the first enabled match wins. Each rule has one group name and one or more filters, combined with **OR**: any matching filter sends the tab to that group. Use **Add filter** within a rule to add another domain, wildcard, or regex; filter types can be mixed. Move more specific rules above broad domain rules. Several rules can also use the same group name.

For example, the **Elk** group can have two URL wildcard filters: `https://elk.int.copopt.dev*` and `https://elk.kube.betterairport.*`. Either matches the same group. Existing single-filter settings and exports load automatically in the new editor; saving/exporting uses a `filters` array per rule.

| Type | Example | Behaviour |
| --- | --- | --- |
| Domain | `github.com` | Exact hostname and all subdomains; no protocol or path |
| URL wildcard | `https://github.com/your-org/*` | Whole-URL match; `*` means any text |
| Regular expression | `^https://dev\.azure\.com/(team-a\|team-b)/` | JavaScript regex without surrounding slashes or flags |

Domain matching ignores case. Wildcard and regex matching are case-sensitive. Use simple, trusted regex patterns; JavaScript regexes can become expensive with nested repetition. The URL tester uses unsaved edits. Import replaces the editor's contents, but requires saving before it affects automatic grouping. Export includes current edits.

## Predictable grouping

- Evaluates newly opened tabs, URL changes, completed loads, unpinning, and window moves, with a short debounce.
- Reuses an open group with the exact same name in the tab's window. Never moves tabs between windows. If duplicate names exist, prefers the tab's current group, then the first group returned by Chrome.
- Sets name and colour on newly created groups; preserves existing group colours and collapsed state.
- Skips pinned tabs, incognito tabs, and URLs outside HTTP/HTTPS.
- With **Respect existing groups** off, a web tab leaves its group when no rule matches, including when applying to open tabs. Removing or disabling a rule takes effect on subsequent tab activity or when applying rules. Pinned, incognito, and non-web tabs remain untouched.
- With **Respect existing groups** (on by default), ungrouped tabs go to their matching group. Opening or navigating URLs inside any group keeps that group, including groups created by the extension. Applying to open tabs also preserves existing groups.
- Ownership and manual overrides survive service-worker suspension using session storage. They reset when Chrome restarts or the extension reloads/updates. Existing groups remain protected; turn off group protection to let rules take over them.
- Saved changes affect subsequent tab activity. Applying to open tabs also respects pause and manual protection.
- Closed/saved groups are not reopened or synchronized by this extension.

## Permissions

`tabs` reads URLs and moves tabs into groups. `tabGroups` looks up and names groups. `storage` saves rules locally and tracks ownership for the browser session. No host permissions are requested. The extension uses Chrome's [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [tabGroups](https://developer.chrome.com/docs/extensions/reference/api/tabGroups), and [storage](https://developer.chrome.com/docs/extensions/reference/api/storage) APIs.

## Development and verification

Use Node 22+:

```powershell
npm test
npm run check
```

Tests cover matching, validation, priority, per-window group reuse, manual protection, pause, worker recreation, and tab-operation failures using a Chrome API fake. They do not replace testing the unpacked extension in Chrome.

For a visual editor preview, serve this folder with `python -m http.server 8765 --bind 127.0.0.1`, then visit `http://127.0.0.1:8765/options.html`. Preview settings use separate local browser storage; the preview cannot organize real tabs.

### Chrome smoke test

1. Save two rules (GitHub → Code, ChatGPT → AI); open two GitHub tabs and confirm one Code group.
2. Open GitHub in another window and confirm that window gets its own group.
3. Navigate a Code tab to ChatGPT, or open ChatGPT inside Code, and confirm it stays in Code. Open ChatGPT in an ungrouped tab and confirm it goes to AI.
4. Manually ungroup that tab; navigate again and confirm it stays ungrouped with manual protection on.
5. Pin a matching tab and confirm applying rules does not move it.
6. Pause grouping, save, and confirm new tabs stay put.
7. Reload the extension and confirm existing groups remain protected.

This is a personal-use first version, not yet packaged for Chrome Web Store publication.

Icons are generated locally with `./scripts/generate-icons.ps1` on Windows using System.Drawing. Reload the extension in Chrome after changing the manifest or icons.

### Automatic group ordering

Enable **Keep groups in rule order** and save to place groups named in enabled rules first in each window, after pinned tabs. It also runs after groups are created, renamed, or moved, and when applying rules. Unrelated tabs and groups retain their relative order, although their absolute positions shift. Exact group names are used; duplicate rule names use the first enabled occurrence. Duplicate group titles retain their relative order. Incognito windows are skipped. Automatic grouping pauses ordering too. Respect existing groups protects membership, not positions when ordering is enabled. Older settings and imports default this option to off.

### Test URL autocomplete

The tester suggests open HTTP/HTTPS tabs (excluding incognito) and the last 20 distinct tested URLs. Type part of a URL or tab title; use arrow keys and Enter to choose, then Enter again to test. Escape dismisses suggestions. Recent test URLs are stored locally, separately from exported rules. The browser preview only suggests recent tests; open tabs are available in the installed extension. No history permission is requested.
