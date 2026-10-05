# Tab Rules privacy policy

Effective date: 2026-10-02

Tab Rules is an open-source Chrome and Firefox extension maintained by Jakob Dyrby. It has no account system, analytics, advertising, or backend. Extension code makes no network requests and does not transmit your tabs, rules, or test URLs to the maintainer or third parties.

## Data processed locally

- **Tab URLs and titles:** URLs are used for rule matching. URLs and titles of open non-incognito web tabs are used for tester suggestions. Open-tab suggestions are held in editor memory.
- **Rules and preferences:** group names, colours, patterns, order, and switches are saved in the browser's extension `storage.local`.
- **Recent test URLs:** the last 20 distinct valid URLs tested are stored locally for autocomplete. URLs may contain private paths or query parameters. Avoid testing secret-bearing URLs.
- **Session state:** tab IDs, group IDs, and manual override flags are kept in the browser's extension `storage.session`. This is cleared when the browser restarts or the extension reloads, updates, or is disabled.

The extension does not read page contents or request access to browser history, bookmarks, or cookies. Incognito tabs are excluded from grouping and suggestions.

## Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Read URLs/titles, observe tab events, and group or ungroup tabs |
| `tabGroups` | Find, create metadata for, and reorder native groups |
| `storage` | Save local preferences, recent tests, and session tracking |

No host permissions are requested. The browser may display a browsing-related permission warning because URLs and titles are accessible through the tabs permission. The Firefox manifest declares no data collection. No container or cookie permissions are requested.

## Storage and removal

Data is not synced through `storage.sync`. Rules and recent tests persist locally until removed or the extension is uninstalled. Uninstalling the extension clears its browser storage. Chrome and Firefox have separate local storage. To clear only recent tests, open the extension’s background developer console and run `chrome.storage.local.remove('recentTestUrls')` in Chrome or `browser.storage.local.remove('recentTestUrls')` in Firefox.

The optional local web preview uses that website origin’s local storage instead. Clear its site data to remove preview rules and recent tests. Preview storage is separate from the installed extension.

## Exports and support

Export creates a JSON file containing your rules and preferences, not recent test URLs or session data. You decide where to save or share it. Bug reports posted on GitHub are public and handled by GitHub under its own policies. Share only sanitized examples.

Questions can be submitted at https://github.com/jakobdyrby/tab-rules/issues without including private browsing data. Changes to this policy will be documented in the repository.
