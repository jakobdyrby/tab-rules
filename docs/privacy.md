# Tab Rules privacy policy

Effective date: 2026-09-25

Tab Rules is an open-source Chrome extension maintained by Jakob Dyrby. It has no account system, analytics, advertising, or backend. Extension code makes no network requests and does not transmit your tabs, rules, or test URLs to the maintainer or third parties.

## Data processed locally

- **Tab URLs and titles:** URLs are used for rule matching. URLs and titles of open non-incognito web tabs are used for tester suggestions. Open-tab suggestions are held in editor memory.
- **Rules and preferences:** group names, colours, patterns, order, and switches are saved in `chrome.storage.local`.
- **Recent test URLs:** the last 20 distinct valid URLs tested are stored locally for autocomplete. URLs may contain private paths or query parameters. Avoid testing secret-bearing URLs.
- **Session state:** tab IDs, group IDs, and manual override flags are kept in `chrome.storage.session`. This is cleared when the browser restarts or the extension reloads, updates, or is disabled.

The extension does not read page contents or request access to browser history, bookmarks, or cookies. Incognito tabs are excluded from grouping and suggestions.

## Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Read URLs/titles, observe tab events, and group or ungroup tabs |
| `tabGroups` | Find, create metadata for, and reorder native groups |
| `storage` | Save local preferences, recent tests, and session tracking |

No host permissions are requested. Chrome may display a browsing-related permission warning because URLs and titles are accessible through the tabs permission.

## Storage and removal

Data is not synced through `chrome.storage.sync`. Rules and recent tests persist locally until removed or the extension is uninstalled. Uninstalling the extension clears its Chrome storage. To clear only recent tests, open the extension’s service-worker developer console and run `chrome.storage.local.remove('recentTestUrls')`.

The optional local web preview uses that website origin’s local storage instead. Clear its site data to remove preview rules and recent tests. Preview storage is separate from the installed extension.

## Exports and support

Export creates a JSON file containing your rules and preferences, not recent test URLs or session data. You decide where to save or share it. Bug reports posted on GitHub are public and handled by GitHub under its own policies. Share only sanitized examples.

Questions can be submitted at https://github.com/jakobdyrby/tab-rules/issues without including private browsing data. Changes to this policy will be documented in the repository.
