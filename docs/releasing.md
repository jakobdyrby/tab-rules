# Releasing

1. Complete relevant checks in [testing.md](testing.md). Record remaining limitations.
2. Update `extension/manifest.json`, `extension/manifest.firefox.json`, and `package.json`, and add changelog notes. Keep the Firefox extension ID stable across releases.
3. Run `npm test`, `npm run check`, and `npm run package`.
4. Load the extracted Chrome ZIP into Chrome and the Firefox ZIP temporarily through `about:debugging` in Firefox Desktop 139+. Smoke-test both.
5. Commit, push, and tag the release (e.g. `v0.1.0-beta.1`).
6. Create a GitHub release with both ZIPs attached; mark beta releases as prereleases.

Each ZIP contains runtime files directly at its root, using the manifest for that browser. Chrome is packaged as `tab-rules-VERSION.zip`; Firefox as `tab-rules-VERSION-firefox.zip`. Unpacked copies are generated in `dist/chrome/` and `dist/firefox/`. Rules and recent tests are browser storage and are never included in the archives. Packaging uses Node’s standard library; no npm installation or external archiver is required.

CI checks pull requests and pushes, and uploads both ZIPs after successful checks. Store publication is separate: it requires developer accounts, listing assets, disclosures, and review. A GitHub release is not a store release.

## Firefox signing

The Firefox ZIP is unsigned and can be loaded temporarily for development. To install permanently in standard Firefox, submit it to [Mozilla Add-ons](https://addons.mozilla.org/developers/) for signing, either as a listed add-on or an unlisted/self-distributed add-on. Distribute the signed `.xpi` returned by Mozilla. Signing and publishing are separate from `npm run package`.

The Firefox manifest declares no data collection and requests only `tabs`, `tabGroups`, and `storage`. It targets desktop Firefox; native tab groups are not supported by Firefox for Android. Validate with Mozilla's `web-ext lint --source-dir dist/firefox` when preparing a Firefox release.

With the minimum version set to 139, `web-ext lint` reports compatibility warnings for `data_collection_permissions` (recognized from Firefox Desktop 140 / Android 142). The declaration is required for new Mozilla submissions; older Firefox ignores this metadata. These warnings do not affect the tab-group APIs, which are available from Desktop 139. Android is not a supported target.
