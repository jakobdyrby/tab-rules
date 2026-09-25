# Manual Chrome test checklist

Use a separate test profile and generic websites. This checklist documents required checks; unchecked items are not claimed to have passed.

- [ ] Load `extension/` and the extracted release ZIP; confirm icons and editor open.
- [ ] Save GitHub → Code and `example.com` → Example rules. New ungrouped tabs join the matching group.
- [ ] Open two matching tabs in one window; confirm one group is reused. Repeat in a second window.
- [ ] With protection on, open or navigate a different matching URL inside Code; membership stays Code.
- [ ] Manually ungroup a tab; it stays ungrouped for the session while protection is on.
- [ ] With protection off, matching navigation changes groups and unmatched web URLs leave their group.
- [ ] Pinned tabs and non-web URLs are not regrouped or ungrouped.
- [ ] Pause grouping and verify grouping, ungrouping, and ordering stop.
- [ ] Enable group ordering; check multiple groups, duplicate names, pinned tabs, unrelated groups, and multiple windows.
- [ ] Reload the extension, suspend its worker, and restart Chrome with restored tabs; verify saved preferences and protection.
- [ ] Test domain, wildcard, regex, multiple filters, invalid regex, disabled rules, and first-match precedence.
- [ ] Use every ordering menu action; check Escape, keyboard focus, narrow screens, and reduced motion.
- [ ] Test match/no-match highlights and editing the URL; the layout stays stable.
- [ ] Test open-tab/recent URL suggestions with arrows, Enter, Escape, mouse, duplicates, and incognito exclusions.
- [ ] Export/import current and legacy rule files; confirm recent tests are not exported.
- [ ] Check redirects, rapid navigation, tab dragging, closed tabs, and restored sessions for unexpected movement.

## Automated validation

`npm test` exercises matching, validation, migrations, grouping, protection, ungrouping, ordering, and suggestion filtering against simulated APIs. `npm run check` checks syntax, referenced files, icon sizes, and version consistency. `npm run package` builds a deterministic ZIP using only `extension/` files.
