# zDeck plugin registry

A static, Git-backed directory for zDeck plugins. It shows what a plugin is, where its source
lives, what runtime it needs, and whether it can actually be installed. It is not a marketplace:
there are no accounts, ratings, reviews, download counts, or publishing API.

**Prototype status.** Browse, search, filtering, detail pages, and README rendering work.
Downloads, desktop installation, signed release verification, update checks, and plugin settings
are **not implemented**. The two seed entries are honestly unpublished:

- **Spotify** — the existing zDeck reference plugin, shown as a preview. No `.zdx` archive exists.
- **Home Assistant** — an in-development placeholder. No plugin release or runtime claim exists.

Nothing on this site installs code. The install control is disabled until a genuine prebuilt `.zdx`
archive and a signed registry release record exist.

## Run it

```sh
npm install
npm run dev          # http://localhost:1430
npm test
npm run build
npm run storybook    # http://localhost:6006
```

The smoke check uses a local Chromium-based browser, Brave by default on macOS:

```sh
npm run build
CHROME_BIN="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npm run smoke
```

It checks the directory, search and empty state, both detail states, the disabled install control,
safe README behavior, no external requests, and a narrow viewport. It saves a screenshot under
`/tmp`.

## Add a plugin

1. Add the plugin's own `README.md` under `registry/readmes/` (reuse the repository README; do not
   write a second one).
2. Add one record to `registry/plugins.json` with the manifest identity and version, source repo,
   licence, licence file, and the runtime/platform details needed to install honestly.
3. Build a prebuilt, self-contained `.zdx` archive and record its HTTPS URL and SHA-256. `.zdx` is
   an ordinary ZIP; it must contain no install scripts and must run without installing dependencies.
4. For a real release, set `"status": "published"` and add the `release` object. Until then use
   `"preview"` or `"in-development"` with `"release": null`.

Required fields are `id`, `name`, `summary`, `author`, `license`, `repo`, `readme`, `status`, and
`release`. `version`, `platforms`, `runtime`, and `tags` are optional unless a record is published;
then version, runtime, and release are required. There is no access questionnaire: declare only
runtime/security facts the user needs before installing, not optional presentation extras.

The complete schema, validation rules, archive contract, and signing plan are in
[docs/registry.md](docs/registry.md). Contribution steps are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Safety

- READMEs come from this checkout at build time. The site never requests a plugin's README URL.
- README rendering has no raw HTML, remote images, iframes, active embeds, or `javascript:` links.
- Registry records are validated as a whole. A malformed record fails the build/tests; no partial
  catalogue is served.
- CI never runs third-party plugin code and has read-only repository permissions.
- A `zdeck://plugins/install…` link is a request for a future desktop confirmation flow. It is not
  execution, and this prototype never renders it as an active install action.

## Documents

- [Registry schema and install contract](docs/registry.md)
- [Desktop handoff: installs, updates, settings](docs/desktop-handoff.md)
- [Design notes and reference observations](docs/design.md)
- [Agent guide](AGENTS.md)

Licensed MIT. The Geist typeface is licensed under the SIL Open Font License; see
`src/assets/Geist-OFL.txt`.
