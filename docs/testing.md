# Manual browser test checklist

Run this checklist separately in Chrome 112+ and Firefox Desktop 139+, using a separate test profile and generic websites. Record browser versions with results. This checklist documents required checks; unchecked items are not claimed to have passed.

- [ ] Chrome: load `extension/` and the extracted Chrome release ZIP; confirm icons and editor open.
- [ ] Firefox: run `npm run package`, temporarily load `dist/firefox/manifest.json` through `about:debugging`, and repeat with the extracted Firefox ZIP. Check the background console for startup errors.
- [ ] Save GitHub → Code and `example.com` → Example rules. New ungrouped tabs join the matching group.
- [ ] Open two matching tabs in one window; confirm one group is reused. Repeat in a second window.
- [ ] With protection on, open or navigate a different matching URL inside Code; membership stays Code.
- [ ] Manually ungroup a tab; it stays ungrouped for the session while protection is on.
- [ ] With protection off, matching navigation changes groups and unmatched web URLs leave their group.
- [ ] Pinned tabs and non-web URLs are not regrouped or ungrouped.
- [ ] Pause grouping and verify grouping, ungrouping, and ordering stop.
- [ ] Enable group ordering; check multiple groups, duplicate names, pinned tabs, unrelated groups, and multiple windows.
- [ ] Reload the extension and suspend its background context (Chrome worker / Firefox event page); verify saved preferences and protection.
- [ ] Restart the browser with restored tabs and verify protection. For Firefox restart testing, use a signed, permanently installed build; temporary add-ons do not survive restart.
- [ ] Test domain, wildcard, regex, multiple filters, invalid regex, disabled rules, and first-match precedence.
- [ ] Use every ordering menu action; check Escape, keyboard focus, narrow screens, and reduced motion.
- [ ] Test match/no-match highlights and editing the URL; the layout stays stable.
- [ ] Test open-tab/recent URL suggestions with arrows, Enter, Escape, mouse, duplicates, and incognito exclusions.
- [ ] Export/import current and legacy rule files; confirm recent tests are not exported.
- [ ] Check redirects, rapid navigation, tab dragging, closed tabs, and restored sessions for unexpected movement.
- [ ] Run Apply rules, Order groups, and Regroup all tabs from the popup, including while paused. Check result counts, colour refresh, and Open settings.
- [ ] Firefox: group tabs from different containers; verify grouping preserves their URLs, tab IDs, and container identities without reloading pages.
- [ ] Transfer a rule export between Chrome and Firefox; verify identical first-match results and colours.

## Automated validation

`npm test` exercises matching, validation, migrations, grouping, protection, ungrouping, ordering, suggestion filtering, browser API selection, and Firefox-style background events against simulated APIs. `npm run check` checks syntax, referenced files, both manifests, icon sizes, and version consistency. `npm run package` builds deterministic Chrome and Firefox ZIPs and unpacked builds using only allowlisted runtime files from `extension/`.

## Duplicate-group regression in Chrome

1. In chrome://extensions, reload the unpacked extension from this checkout's extension/ folder. Confirm only one copy is enabled. Use a separate test profile and a fresh window so existing duplicates do not obscure the result.
2. Save an enabled domain rule for example.com named Example. Open several matching URLs rapidly, refresh them, navigate between matching URLs, and run Apply rules while pages load. Expect exactly one Example group in that window.
3. Repeat in a second window. Expect its own Example group, with no tabs moved between windows. Move an ungrouped matching tab between windows while loading and confirm it joins the destination's group.
4. With protection off, navigate a tab between two different rules and through a redirect on a controlled test site; confirm the final matching group is reused. With protection on, already grouped tabs must keep their group.
5. Manually create two groups named Example and put a tab in each. Apply rules and Regroup all tabs must leave those same-name memberships separate; new ungrouped matches should reuse an existing group. Manually ungroup a tab with protection on and confirm it stays ungrouped.
6. Stop the extension's service worker, close its inspector, and trigger another matching tab event. Repeat after restarting Chrome with restored tabs. Existing protected groups should remain intact, and new matches should reuse them.

Automated regressions cover overlapping organizer calls and bulk operations, delayed group naming, independent windows, failed operations, redirects/window changes during lookup, manual protection, rule priority, a group appearing between lookups, and Chrome event bursts/replacement. Browser actors are outside the extension's queue; these checks do not claim global atomicity across extensions or automatic repair of pre-existing duplicates.

## Live verification — 2026-11-06

Chrome 157.0.8103.39 (64-bit), Windows 11 23H2, unpacked extension source:

- Passed: six rapidly opened matching tabs reused one group; matching navigation and refresh retained it; a second window created its own group.
- Passed: unmatched navigation left the group with protection off; matching navigation rejoined it. With protection on, membership and manual ungrouping were preserved.
- Passed: a manually created same-name duplicate stayed separate, while a new matching tab reused an existing group.
- Passed: after stopping the extension service worker through Chrome's worker UI, a new matching tab reused the existing group (six members became seven).
- Cleanup: removed the temporary rule and three generated groups, closed both test windows, restored the original settings, and compared all displayed rule fields against their original values. Existing same-name groups remained separate.

Not exercised live: global Apply/Regroup (would affect the working session), full browser restart/restoration, redirects, tab dragging, packaged-build installation, Firefox, and a long-running soak. Bulk operations, redirects, window changes, and Chrome replacement events have simulated API regression coverage. These live checks do not establish the cause of the original intermittent long-running symptom.
