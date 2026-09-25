# Contributing

Bug reports, documentation fixes, and focused pull requests are welcome.

## Setup

Use Node.js 22+, clone the repository, and load `extension/` as an unpacked Chrome extension. No dependency installation is needed.

Before opening a pull request:

```sh
npm test
npm run check
npm run package
```

Run relevant checks in [the Chrome checklist](docs/testing.md), especially for changes involving tab events. Automated tests use simulated APIs and cannot fully reproduce Chrome timing.

## Changes

- Keep the extension dependency-free unless a dependency has a clear benefit.
- Do not add analytics, network calls, or broader permissions without discussing the change first.
- Preserve existing settings and imported files when changing the data format.
- Use small modules, accessible controls, and tests for behavioural changes.
- Describe the problem, resulting behaviour, and validation in your PR.
- Use generic example domains in tests, documentation, and screenshots.

## Reporting bugs

Include Chrome and OS versions, steps to reproduce, expected behaviour, and a minimal sanitized rule. Describe whether automatic grouping, group protection, and group ordering are enabled. Never include real private URLs, tokens, or full personal exports.

For security issues, use GitHub’s private vulnerability reporting if available. Avoid posting exploit details or sensitive data in a public issue.
