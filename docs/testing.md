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
