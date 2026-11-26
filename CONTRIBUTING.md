# Contributing a plugin

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
2. Add one record to `registry/plugins.json`. See [the schema](docs/registry.md) for every field.
3. Keep `"release": null` and use `"status": "preview"` or `"in-development"` until a real archive
   exists.
4. For a release, set `"status": "published"` and include the `.zdx` URL and checksum. Signing is
   an architectural contract only for now; do not invent signatures or verification badges.

```json
{
  "id": "example",
  "name": "Example",
  "summary": "One sentence about what it adds to a deck.",
  "version": "0.1.0",
  "author": "Example contributors",
  "license": "MIT",
  "repo": "https://github.com/example/zdeck-example",
  "runtime": { "language": "node", "minimum": "22.18.0" },
  "tags": ["example"],
  "readme": "example.md",
  "status": "preview",
  "release": null
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
entry says so, the install button is disabled, and no `.zdx` download is implied.

## 4. Open the pull request

Use the repository pull-request template. State the purpose, the runtime/access the plugin needs,
and the evidence you ran. Keep one coherent change per pull request. Never include credentials,
private logs, or third-party plugin code in CI.

The maintainer merges to `dev`. Promotion to `production` is a separate pull request. Nothing is
published to a running desktop app from this repository.
