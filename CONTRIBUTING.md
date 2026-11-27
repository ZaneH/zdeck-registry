# Contributing

For a prepared archive, use the [generated submission bundle / GitHub intake workflow](docs/submissions.md)
instead of hand-copying manifest metadata. Each plugin has its own record; no shared list edit. a plugin

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

## 3. Check locally

```sh
npm install
npm test
npm run typecheck
npm run build
npm run storybook:build
```

Open the detail page and run the smoke check if a browser is available. Confirm that an unpublished
entry says so, the install button is disabled, and no `.zdx` download is implied.

## 4. Open the pull request

Use the repository pull-request template. State the purpose, the runtime/access the plugin needs,
and the evidence you ran. Keep one coherent change per pull request. Never include credentials,
private logs, or third-party plugin code in CI.

The maintainer merges to `dev`. Promotion to `production` is a separate pull request. Nothing is
published to a running desktop app from this repository.
