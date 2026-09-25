# How Tab Rules behaves

## Matching

Only HTTP/HTTPS URLs are matched. Pinned and incognito tabs are skipped. Enabled rules are evaluated in list order; the first rule with a matching filter wins. Filters within a rule are alternatives (OR).

Domain filters match the exact hostname and subdomains, ignoring case. Wildcards match the whole URL: `*` is any text, with all other characters literal. Regex filters use JavaScript regular expressions without surrounding slashes or flags. Wildcard and regex matching are case-sensitive. Keep regexes simple: nested repetition can cause expensive matching. Regex execution is not currently time-limited.

The extension checks newly opened tabs, URL changes, completed loads, unpinning, and window moves, with a short debounce. It uses a pending navigation URL when available.

## Groups and manual choices

Groups are reused by exact name within the same window; tabs are never moved between windows. Newly created groups receive the rule’s colour. Existing group colours and collapsed state are preserved. If several groups share a name, the current group is preferred, then the first returned by Chrome.

**Respect existing groups**, on by default, keeps a tab in any existing group even when another rule matches. This includes groups created by the extension. Manually ungrouped tabs stay ungrouped for the browser session.

With protection off, matching tabs move to their rule’s group and unmatched web tabs leave their group. Pausing automatic grouping also pauses ungrouping and ordering.

Membership tracking survives service-worker suspension but resets on browser restart, extension reload, or update. Existing groups remain protected. Closed/saved groups are not reopened or synchronized.

## Group ordering

**Keep groups in rule order** is off by default. When enabled, groups named in enabled rules move to the front of each window, after pinned tabs. Unrelated tabs and groups keep their relative order, although their absolute positions shift. Duplicate rule names use the first enabled rule; duplicate group titles keep their relative order. Incognito windows are skipped.

Ordering runs after settings are saved, relevant group/tab events, browser startup, and Apply to open tabs. It may restore rule order after a manual move. Group protection controls membership, not group positions.

## Editing and testing

Saving changes affects subsequent tab activity; group ordering applies after saving when enabled. Apply to open tabs saves edits and checks all open windows while respecting the settings.

The tester evaluates unsaved edits and highlights the winning rule and first matching filter. It predicts URL matching; it does not inspect a particular tab’s pinned status or manual override. Autocomplete suggests open non-incognito web tabs and the last 20 distinct tested URLs. Use arrows and Enter to select, then Enter again to test.

Import replaces the editor contents and requires saving. Export includes current edits but excludes recent test URLs and session state. Older single-filter exports remain supported.

## Early-beta limitations

Tests simulate Chrome APIs; event races, restored sessions, active tab dragging, and platform-specific behaviour still need wider live testing. Some transient tab operations can fail while Chrome is rearranging tabs; reapply after the operation completes. Multiple editor tabs can overwrite each other’s settings. Do not use complex or untrusted regex patterns.

## Manual toolbar actions

The pinned icon opens a popup with Apply rules, Order groups, Regroup all tabs, and Open settings. Manual actions use saved rules across all open windows and run even while automatic grouping is paused. Apply rules respects saved group protection, including manually ungrouped tabs. Regroup all tabs ignores protection for that invocation and ungroups unmatched web tabs. Both honour the saved group-order option. Order groups forces ordering for that invocation and leaves membership intact. No action changes saved preferences. The editor's Apply to open tabs also runs while automatic grouping is paused.
