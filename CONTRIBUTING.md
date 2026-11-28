# Contributing

Plugins and themes are separate catalogues. For a prepared plugin archive, use the
[generated submission bundle / GitHub intake workflow](docs/submissions.md) instead of hand-copying
manifest metadata. Each plugin has its own record; no shared list edit. A community theme is a
source preview, not a package; see [the theme schema](docs/themes.md).

The registry is a small JSON file plus README files, reviewed as a pull request. Reuse the
plugin's existing README; do not fill in a second description or an access questionnaire.

## 1. Prepare the plugin

- Give it a stable lowercase `id` and a manifest whose `version` matches the release.
- Keep the plugin's source and MIT-compatible licence in its own repository.
- Build a prebuilt, self-contained `.zdx` archive. `.zdx` is an ordinary ZIP; it must contain the
  complete runtime files and must not run install scripts or download dependencies on install.
- Publish the archive at a stable HTTPS URL and record its SHA-256.
- Declare only the runtime and platform facts a person needs to judge the install. Do not invent a
  compatibility range that has not been tested.

## 2. Add the entry

1. Copy the plugin's README to `registry/readmes/<id>.md` (or add a new file; keep the same words).
2. Add `registry/plugins/<id>.json` containing one record (no shared list). See [the schema](docs/registry.md) for every field.
3. Keep `"release": null` and use `"status": "preview"` or `"in-development"` until a real archive
   exists.
4. For a release, follow [maintainer signing/publication](docs/releases.md). Set `"status": "published"`
   and `"release": {"record":"releases/<id>/<version>.json"}` only for a genuine verified envelope
   matching the catalogue facts. The separate app-ready gate stays off until configured app/native
   QA/publication are real. Do not invent signatures, review badges, compatibility or checksums.

```json
{
  "id": "example",
  "version": "0.1.0",
  "license": "MIT",
  "repo": "https://github.com/example/zdeck-example",
  "runtime": { "language": "node", "minimum": "22.18.0" },
  "tags": ["example"],
  "readme": "example.md",
  "status": "preview",
  "release": null
}
```

`name`, `summary`, and `author` are optional presentation metadata. The name defaults to the ID;
an omitted summary or author is not displayed. Do not add a publisher identity that is not known.

Categories reuse optional `tags`; there is no second classification form. Leave `provenance`
omitted unless reviewed: unclassified entries appear under Community (not verified community
authorship). Only registry maintainers classify Official, after checking zDeck maintenance against
an explicit HTTPS `evidence` source; author strings, repository names and registry signatures do
not establish it. This is neither endorsement nor security review. Optional counts require a
real source and observation date; dates require source/release/Git evidence in the PR. Omit them
when unknown—never fill in zero or today's date. See [snapshot meanings and date rules](docs/registry.md#snapshot-and-date-semantics).

## Add a theme source preview

A theme PR documents reviewed source and two screenshots of the standard sample deck. It does not
add a package, release, runtime, signature or install action.

1. Add `registry/themes/<id>.json`, `registry/theme-readmes/<id>.md`, and
   `registry/previews/<id>/desktop.png` plus `phone.png`. Both previews must show the same
   `zdeck-sample-deck-1` fixture.
2. Use `"kind": "source-preview"`, omit `builtin`, and give the full immutable lowercase
   40-character `sourceCommit` for `repo`. Declare an honest licence and author. Do not add
   release/runtime/install/package fields.
3. Previews must be regular local PNG files, not symlinks, at most 2 MiB: desktop exactly
   1200 × 800 and phone exactly 390 × 844. Plain-text `alt` is required for both. Do not add remote
   images, SVG, submitted CSS or executable content.
4. Keep `addedAt`/`updatedAt` absent unless the PR has traceable source/Git evidence. Built-in
   entries are maintainer-curated; community entries are source previews and remain
   non-installable.
5. Use the submission generator when available:
   `npm run submission:theme -- --metadata … --readme … --desktop-preview … --phone-preview … --repo … --commit … --output …`.
   The tool generates a source-preview bundle; it does not install, sign or publish anything.
   Review its generated record against [the schema](docs/themes.md) before opening the PR.

```json
{
  "id": "example-theme",
  "name": "Example Theme",
  "summary": "A reviewed appearance shown on the standard sample deck.",
  "author": "Example Author",
  "license": "MIT",
  "repo": "https://github.com/example/zdeck-theme",
  "readme": "example-theme.md",
  "kind": "source-preview",
  "sourceCommit": "0123456789abcdef0123456789abcdef01234567",
  "preview": {
    "fixture": "zdeck-sample-deck-1",
    "desktop": { "src": "previews/example-theme/desktop.png", "alt": "Example Theme on the standard sample deck, desktop view." },
    "phone": { "src": "previews/example-theme/phone.png", "alt": "Example Theme on the standard sample deck, phone view." }
  },
  "tags": ["appearance", "example"]
}
```

## 3. Check locally

```sh
npm install
npm test
npm run typecheck
npm run build
npm run storybook:build
```

Open the detail page and run the smoke check if a browser is available. Confirm that an unpublished
plugin entry says so, the install button is disabled, and no `.zdx` download is implied. For a
theme, confirm both categories and routes work, the local previews are the right size, built-ins say
Included in zDeck, and there is no install button or theme deep link.

## 4. Open the pull request

Use the repository pull-request template. State the purpose, the runtime/access the plugin needs,
and the evidence you ran. Keep one coherent change per pull request. Never include credentials,
private logs, or third-party plugin code in CI.

The maintainer merges to `dev`. Promotion to `production` is a separate pull request. Nothing is
published to a running desktop app from this repository.
