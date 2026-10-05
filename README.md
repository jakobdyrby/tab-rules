<p align="center"><img src="extension/icons/icon-128.png" width="80" height="80" alt="Tab Rules icon"></p>
<h1 align="center">Tab Rules</h1>
<p align="center">A place for every tab. Organize native Chrome and Firefox tab groups with URL rules.</p>

[![CI](https://github.com/jakobdyrby/tab-rules/actions/workflows/ci.yml/badge.svg)](https://github.com/jakobdyrby/tab-rules/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Early beta · Chrome 112+ · Firefox Desktop 139+ · No account, analytics, or backend.** Not yet published in the Chrome Web Store or Firefox Add-ons.

![Tab Rules editor with example rules and a highlighted matching filter](docs/screenshots/editor-overview.png)
*Editor preview with example rules and a matching URL test.*

## Features

- Match domains, URL wildcards, or regular expressions.
- Combine multiple filters in one group: any filter can match.
- Set group names, colours, and priority; first matching rule wins.
- Preserve existing groups, or let rules regroup tabs and ungroup unmatched tabs.
- Optionally arrange groups in rule order within each window.
- Test URLs with matching rule/filter highlights and autocomplete from open tabs and recent tests.
- Import and export rules as JSON. All extension data stays on your device.

## Install

### Chrome: from a release

1. Download `tab-rules-0.1.0.zip` from [Releases](https://github.com/jakobdyrby/tab-rules/releases).
2. Extract it to a permanent folder; keep it there while the extension is installed.
3. Open `chrome://extensions` in Chrome and enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.

### Chrome: from source

```sh
git clone https://github.com/jakobdyrby/tab-rules.git
cd tab-rules
```

Follow steps 3–4 above, selecting the **extension/** folder. No build or dependency installation is required.

**Upgrading from the old repository layout:** export your rules before removing the old unpacked installation. Load `extension/` and import them into the new installation. Changing the unpacked folder can change its extension ID and storage. Once using `extension/`, update the files and click **Reload** on its Chrome extension card.

### Firefox: from source

Firefox Desktop **139 or later** is required for the native tab-group APIs. This version uses Firefox tab groups, which organize tabs visually without reloading them. Firefox containers (separate cookies and login sessions) are a different feature and are not managed by Tab Rules.

1. Clone the repository as above and install Node.js 22+.
2. Run `npm run package` (no dependency installation required).
3. Open `about:debugging#/runtime/this-firefox` in Firefox.
4. Click **Load Temporary Add-on…** and select **`dist/firefox/manifest.json`**.
5. Click the toolbar icon, open settings, and add rules or import a Chrome rule export.

For a packaged build, extract `tab-rules-0.1.0-firefox.zip` and select its `manifest.json` in step 4. Temporary add-ons are removed when Firefox closes; export your rules before removing a temporary installation if you need a backup. Permanent installation in standard Firefox requires a Mozilla-signed add-on; the generated ZIP is unsigned. See the [release guide](docs/releasing.md).

When developing, edit files under `extension/`, rerun `npm run package`, then click **Reload** in `about:debugging`. `dist/firefox/` is generated output. Chrome and Firefox keep separate local settings; use JSON export/import to transfer rules.

## Quick start

1. Click the extension toolbar icon, then **Open settings**.
2. Add a **Domain** filter for `github.com`, group name **Code**, and a colour.
3. Save and open a matching URL in an ungrouped tab.
4. Use **Apply to open tabs** to organize existing tabs.

| Match type | Example | Use |
| --- | --- | --- |
| Domain | `github.com` | The hostname and its subdomains |
| URL wildcard | `https://github.com/example-org/*` | A specific organization or route |
| Regex | `^https://(?:dev\.\|staging\.)?example\.com/` | Several related hostnames |

Put specific rules above broader ones using the rule’s **⋯** menu. Add multiple filters to send different sites to the same group.

Read the [behaviour guide](docs/behaviour.md) for group protection, automatic ordering, matching details, and limitations.

## Toolbar actions

Pin Tab Rules to your browser toolbar and click its icon to open the popup:

- **Apply rules** groups open tabs using saved rules and your group-protection preference.
- **Order groups** arranges existing groups in rule order without changing membership.
- **Regroup all tabs** ignores protection for that run; unmatched web tabs leave their groups.
- **Open settings** opens the rule editor.

All manual actions work with automatic grouping off, across open windows. They do not change saved preferences. Pinned, incognito, and non-web tabs remain excluded from regrouping. Apply and Regroup also order groups when the saved ordering option is on. Unsaved editor changes are not used by the popup.

## Privacy and permissions

Tab Rules reads tab URLs and titles locally, stores rules and up to 20 recent test URLs, and makes no external requests. It does not read page contents or request browser-history permission. See the [privacy policy](docs/privacy.md) for storage, removal, and permission details.

## Development

Use Node.js 22 or later. No npm dependencies are required.

```sh
npm test
npm run check
npm run package
```

The package command writes two archives containing only runtime files with `manifest.json` at the root:

- `dist/tab-rules-0.1.0.zip` — Chrome
- `dist/tab-rules-0.1.0-firefox.zip` — Firefox

It also writes unpacked builds to `dist/chrome/` and `dist/firefox/`.

For an editor-only preview:

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory extension
```

Visit `http://127.0.0.1:8765/options.html`. The preview has separate local storage and cannot organize browser tabs. Open-tab autocomplete requires the installed extension.

```text
extension/          Shared source; load directly into Chrome
  icons/            Extension and toolbar icons
dist/firefox/       Generated Firefox build for temporary loading
docs/               Behaviour, privacy, testing, and release guides
scripts/            Validation, packaging, and icon generation
test/               Node tests with simulated browser APIs
.github/workflows/  Automated checks and release artifacts
```

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md). Report problems through [GitHub Issues](https://github.com/jakobdyrby/tab-rules/issues), using sanitized URLs and patterns. Please do not upload browsing history, credentials, or private rule exports.

## Release status

This is an early beta. Automated tests cover core logic; broad live Chrome and Firefox testing is still in progress. See the [manual test checklist](docs/testing.md), [changelog](CHANGELOG.md), and [release guide](docs/releasing.md).

## License

[MIT](LICENSE) © 2026 Jakob Dyrby.
