# zDeck plugin registry

A static, Git-backed directory for zDeck plugins. It shows what a plugin is, where its source
lives, what runtime it needs, and whether it can actually be installed. It is not a marketplace:
there are no accounts, ratings, reviews, download counts, or publishing API.

**Prototype status.** Browse, search, filtering, detail pages, and README rendering work.
Build-time signed release verification and external-key release tooling work; a deliberately
configured zDeck desktop can verify/download into its reviewed disabled installer. The public
endpoint/key are configured, but `ready:false` and no signed release is published by this change. Updates/settings are not website features. The two seed entries are honestly unpublished:

- **Spotify** — the existing zDeck reference plugin, shown as a preview. No registry release is published.
- **Home Assistant** — an in-development placeholder. No plugin release or runtime claim exists.

Nothing on this site installs code. The install control is disabled until a genuine prebuilt `.zdx`
archive and a signed registry release record exist.

## Self-host with Docker Compose

```sh
git clone <your-reviewed-registry-repository-url> zdeck-registry
cd zdeck-registry
git switch dev
docker compose up --build -d
# http://localhost:1431 (loopback only); health: /healthz
```

Requires Docker Engine/Desktop and Compose v2.20+; no Node, key, token or domain is needed to
browse the preview. Override the host port with `REGISTRY_PORT=8081`. The image builds/tests the
whole static catalogue, then serves it with nonroot Nginx. Read-only bind directories
`data/releases/` and `data/artifacts/` retain deliberately verified public bytes across rebuilds;
Compose never signs, publishes, overwrites or deletes releases. Missing releases return 404.

See [self-hosting, CT prerequisites and existing Cloudflare Tunnel setup](docs/self-hosting.md)
for the separate offline retention workflow, backups/permissions and public HTTPS checks.
`https://zreg.zaaane.com` is the owned live registry page; read-only checks confirmed HTTPS,
page/health and safe release-path 404s, not positive release serving or installed native handlers.
`zdeck.zaaane.com` is the separate app website, not another required service. New desktop builds
independently ship the public registry endpoint/key; custom trust still requires deliberate build
overrides. Seeds remain non-installable and app-ready stays false. See the
[first real HA candidate, checks and remaining gates](docs/home-assistant-candidate.md).

## Local development

Use Node 22.18+ and Python 3.10+ (standard library only, for archive/hosting tests and submissions).

```sh
npm ci
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

With a prepared archive, prefer the [generated submission bundle / read-only GitHub intake workflow](docs/submissions.md):
manifest identity and archive facts are generated, not retyped. Open a normal per-plugin PR; no
auto-PR token, auto-signing or automatic publication. Manual records are also supported:

1. Add the plugin's own `README.md` under `registry/readmes/` (reuse the repository README; do not
   write a second one).
2. Add `registry/plugins/<id>.json` (one record, no shared list) with the manifest identity and version, source repo,
   licence, licence file, and the runtime/platform details needed to install honestly.
3. Build a prebuilt, self-contained `.zdx` archive and record its HTTPS URL and SHA-256. `.zdx` is
   an ordinary ZIP; it must contain no install scripts and must run without installing dependencies.
4. For a real release, follow [the external-key maintainer path](docs/releases.md), add its verified
   immutable envelope and `release.record`, and set `"status": "published"`. Activation additionally
   needs a reviewed app-ready contract. Until then use `"preview"` or `"in-development"` with
   `"release": null`.

Required fields are `id`, `license`, `repo`, `readme`, `status`, and `release`. `name`, `summary`,
and `author` are optional presentation metadata: `name` defaults to the ID, and an omitted summary
or author is not shown. `version`, `platforms`, `runtime`, and `tags` are optional unless a record is
published; then version, runtime, platforms, and a matching signed release record are required. There is no access questionnaire:
declare only runtime/security facts the user needs before installing, not optional presentation
extras.

The complete schema, validation rules, archive contract, and signing plan are in
[docs/registry.md](docs/registry.md). Contribution steps are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Safety

- READMEs come from this checkout at build time. The site never requests a plugin's README URL.
- README rendering has no raw HTML, remote images, iframes, active embeds, or `javascript:` links.
- Registry records are validated as a whole. A malformed record fails the build/tests; no partial
  catalogue is served.
- CI never runs third-party plugin code and has read-only repository permissions.
- A `zdeck://plugins/install…` link is an untrusted request for desktop confirmation, not execution.
  Only an app-ready build-verified published record can offer it; seed previews remain disabled.

## Documents

- [Per-plugin submissions and GitHub workflow](docs/submissions.md)
- [First Home Assistant candidate and exact maintainer commands](docs/home-assistant-candidate.md)
- [Registry schema and install contract](docs/registry.md)
- [Signed releases: tooling, trust bootstrap, immutable hosting and smoke](docs/releases.md)
- [Self-hosting: Docker Compose, persistent releases and existing Cloudflare Tunnel](docs/self-hosting.md)
- [Desktop handoff: installs, updates, settings](docs/desktop-handoff.md)
- [Design notes and reference observations](docs/design.md)
- [Agent guide](AGENTS.md)

Licensed MIT. The Geist typeface is licensed under the SIL Open Font License; see
`src/assets/Geist-OFL.txt`.
