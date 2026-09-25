# Releasing

1. Complete relevant checks in [testing.md](testing.md). Record remaining limitations.
2. Update both `extension/manifest.json` and `package.json`, and add changelog notes.
3. Run `npm test`, `npm run check`, and `npm run package`.
4. Load the extracted ZIP into Chrome and smoke-test it.
5. Commit, push, and tag the release (e.g. `v0.1.0-beta.1`).
6. Create a GitHub release with the ZIP attached; mark beta releases as prereleases.

The ZIP contains runtime files directly at its root. Rules and recent tests are browser storage and are never included in the archive. Packaging uses Node’s standard library; no npm installation or external archiver is required.

CI checks pull requests and pushes, and uploads a ZIP artifact after successful checks. Store publication is separate: it requires a Chrome Web Store developer account, listing assets, disclosures, and review. A GitHub release is not a Chrome Web Store release.
