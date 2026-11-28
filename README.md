# zDeck plugin registry

A static, Git-backed directory for zDeck plugins and themes. It shows what a plugin is, where its
source lives, what runtime it needs, and whether it can actually be installed. Themes are a separate
catalogue: built-in appearances are already in zDeck, and community entries are source previews, not
packages. It is not a marketplace: there are no accounts, ratings, reviews, download counts, or
publishing API.

**Prototype status.** Browse, search, filtering, detail pages, and README rendering work.
Build-time signed release verification and external-key release tooling work; a deliberately
configured zDeck desktop can verify/download into its reviewed disabled installer. The public
endpoint/key are configured and **`ready:true`** offers the untrusted install request for each
build-verified published identity. Updates/settings are not website features.

- **Home Assistant 0.2.0** — genuine signed **macOS-only pilot**, publicly hosted and verified,
  with installed-handler macOS QA on the reviewed pilot build. Windows/Linux are explicitly
  rejected by the desktop resolver and remain unverified.
  See [the current check record and remaining gaps](docs/home-assistant-candidate.md).
- **Spotify 0.1.0** — genuine signed **macOS-only pilot**. Its exact record and archive are publicly
  served and verified, and isolated native install (disabled, untrusted, restart, collision refusal)
  passed. The updated normal app rendered the identity prompt but it was not inspected, and **no
  real Spotify playback or Automation action was tested**. The live site still serves the previous
  HA-only build; activation next makes the new build's two install links reachable. Windows/Linux
  are explicitly rejected.
  See [the Spotify pilot record and activation](docs/spotify-candidate.md).

Nothing on this site installs code. The plugin install control is an untrusted request, offered
only for a genuine prebuilt `.zdx` archive and a build-verified signed release record on its claimed
platforms.

## Themes

`#/themes` is a separate category from the plugin directory at `#/`. Both keep the same compact
search, filters, sort/order, URL/back behavior and detail layout.

- **Glass** and **Wasteland Terminal** are real built-in appearances. Their entries say **Included
  in zDeck** and name the exact **Settings → Appearance** selection; there is nothing to download.
- Community theme entries are **source previews**: reviewed source, README and local sample-deck
  screenshots, with no package format, install button or theme deep link. They are submitted as a
  normal Git pull request.
- Every theme shows authentic local desktop (1200 × 800) and phone (390 × 844) previews of the same
  `zdeck-sample-deck-1` fixture. Previews are bounded regular PNG files and are never remote images,
  submitted CSS or executable code. There are no theme download or popularity metrics.

The complete theme record schema, preview limits and validation rules are in
[docs/themes.md](docs/themes.md).

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
`https://zreg.zaaane.com` is the owned live registry page; checks confirmed HTTPS, page/health and
positive exact release/archive serving. Installed native macOS handler QA was performed separately,
not by the website. `zdeck.zaaane.com` is the separate app website, not another required service.
New desktop builds independently ship the public registry endpoint/key; custom trust still requires
deliberate build overrides. The reviewed build offers install actions for exactly two macOS pilot
identities once activated; the live site is the earlier HA-only build. See the
[HA pilot checks and remaining gaps](docs/home-assistant-candidate.md) and the
[Spotify pilot record and activation](docs/spotify-candidate.md).

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

It checks both categories, search and empty states, plugin and theme detail, the plugin install
gates, no theme install/deep link, local preview dimensions and alt text, detail/back criteria, safe
README behavior, no external requests, and narrow layouts. It saves screenshots under `/tmp`.

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

The complete plugin schema, validation rules, archive contract, and signing plan are in
[docs/registry.md](docs/registry.md). Theme records and previews are in [docs/themes.md](docs/themes.md).
Contribution steps are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Add a theme

A theme entry is a source review, not a package release. Add
`registry/themes/<id>.json`, `registry/theme-readmes/<id>.md`, and exactly two local PNG previews
at `registry/previews/<id>/desktop.png` (1200 × 800) and `phone.png` (390 × 844). Use
`"kind": "source-preview"` with no `builtin`, a full 40-character lowercase source commit, and the
standard `zdeck-sample-deck-1` fixture. Do not add release, runtime, archive or install fields. See
[the theme schema](docs/themes.md) and the generated `npm run submission:theme` flow in
[submission steps](docs/submissions.md#submit-a-theme-source-preview). The generator prepares a
local review bundle only; a normal reviewed PR is the publishing path.

## Safety

- READMEs come from this checkout at build time. The site never requests a plugin or theme README URL.
- README rendering has no raw HTML, remote images, iframes, active embeds, or `javascript:` links.
- Theme previews are local bounded PNGs only; no remote images, SVG, submitted CSS/code or install
  action. A community source preview is not a package.
- Both catalogues are validated as a whole. A malformed record, README or preview fails the
  build/tests; no partial catalogue is served.
- CI never runs third-party plugin or theme code and has read-only repository permissions.
- A `zdeck://plugins/install…` link is an untrusted request for desktop confirmation, not execution.
  Only an app-ready build-verified published record can offer it; seed previews remain disabled.

## Documents

- [Plugin and theme submissions and GitHub workflow](docs/submissions.md)
- [Theme catalogue schema, previews and routes](docs/themes.md)
- [First Home Assistant candidate and exact maintainer commands](docs/home-assistant-candidate.md)
- [Registry schema and install contract](docs/registry.md)
- [Signed releases: tooling, trust bootstrap, immutable hosting and smoke](docs/releases.md)
- [Self-hosting: Docker Compose, persistent releases and existing Cloudflare Tunnel](docs/self-hosting.md)
- [Desktop handoff: installs, updates, settings](docs/desktop-handoff.md)
- [Design notes and reference observations](docs/design.md)
- [Agent guide](AGENTS.md)

Licensed MIT. The Geist typeface is licensed under the SIL Open Font License; see
`src/assets/Geist-OFL.txt`.
