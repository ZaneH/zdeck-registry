# First Home Assistant release candidate — 2026-11-27

**Prepared locally, unsigned, not published, not installable from the website.** No private key
was accessed, no production keys generated, and no push, PR, workflow dispatch, upload or deployment
was performed. Both repositories started on clean `dev` except the preserved registry
`debug-storybook.log`. Deployed source is not assumed to match either checkout.

## Exact candidate

- Source repository: `https://github.com/ZaneH/zdeck`
- Committed source: `c688567f8359f6d20ff4a7ee30ba6c18e25cc963` (local commit; remote availability is
  **not** asserted until the operator authorizes pushing/reviewing it).
- Manifest identity: `home-assistant` **0.2.0**, protocol 1; packaged Node entrypoint/SDK, MIT.
- Archive: **51,614 bytes**, SHA-256
  `2bc4fde8f462feabbf91b929a9b5213eee63183972f34435b53485de225e979d`.
- Durable local bundle:
  `/Users/me/.local/state/zdeck-release-candidates/home-assistant-0.2.0-c688567/`
  containing `home-assistant.zdx`, archived `manifest.json`, `LICENSE`, `candidate.json`, generated
  preview record/README and `PR.md`. A reproducible copy is at app `dist/plugins/home-assistant.zdx`,
  but app/frontend builds clear `dist`; use the durable bundle for review/signing.
- `candidate.json` deliberately has `platforms:[]`, `nativeQA:"not-established"`, `signable:false`.
  It is **not** a signed payload and cannot be passed to `release sign`.

The original HA integration was tested live by the operator on one OS only. That does not establish
which platforms/minimum runtimes are reviewable for this signed archive or installed URL-handler
parity. The candidate has no support assertions. No signable payload/envelope was produced. The
catalogue's curated HA entry remains `in-development`, `release:null`; the generator's preview
record is evidence for review, not blindly substituted into the catalogue.

## Public bootstrap, still gated

Website `registry/app-contract.json`: `https://zreg.zaaane.com/`, key `registry-2026-01`, **ready:false**.
The app independently embeds the public key in `src-tauri/registry-public-keys.json` and defaults
the website/lookup base to that URL. No runtime server key discovery. The public-only file was
explicitly supplied for this task; no private file was opened.

Public raw Ed25519 key base64: `H/shqLoptu026ur/SMHgpyE2K0Hw+kgtLB2cU6wkL7w=`.
SHA-256 of its decoded 32 bytes:
`520d9f831d334a20ccf0daec25cd9eaedb5dde291a3af0e2313af2710b4a1457`.
Review that fingerprint independently before distributing trust. Environment overrides remain
supported; setting either release override requires both URL and keys, with no fallback mixing.
An empty pair disables resolution. The website override remains separate; empty disables its menu.

## Live evidence (public read-only GET, no credentials)

At **2026-11-27 03:53 UTC**, DNS returned public IPv4 `104.21.95.122`, `172.67.144.194`; the
script pinned the first and normal TLS certificate/hostname verification succeeded on port 443.
All ten probes passed with compression advertised and no redirect or `Content-Encoding`:

| Paths | Result |
| --- | --- |
| `/` | 200 `text/html`, 1,035 bytes; `no-cache, no-transform`, `nosniff` |
| `/healthz` | 200 `text/plain`, exact `ok\n`; same cache/nosniff policy |
| `/releases`, `/artifacts`, malformed paths and exact missing versioned probe paths | Direct 404, `no-store, no-transform`, `nosniff`; no SPA 200/immutable negative caching |
| `/releases/home-assistant/0.2.0.json`, `/artifacts/home-assistant/0.2.0.zdx` | Same direct 404 policy; **nothing published** |

A repeat at **04:05 UTC** passed the same ten probes. Cloudflare reported `DYNAMIC`.
HSTS, CSP, X-Frame-Options and Referrer-Policy were absent in these
responses; policy hardening at the operator's tunnel/origin remains a separate review. The script
reports those gaps. No positive JSON/ZIP MIME, exact bytes, successful immutable caching, every DNS
answer/edge, public app-site behavior or installed native handler was verified. No remote
configuration was changed. Repeat with `npm run hosting:live`; after publication use exact local
reviewed envelope/archive arguments from [self-hosting.md](self-hosting.md).

## Checks performed

- Registry: `npm test` — **73 Vitest + 9 Python standard-library tests**; `npm run typecheck`,
  `npm run build`, `npm run storybook:build`, Brave `npm run smoke` and `npm run smoke:directory`
  passed. Directory smoke exercised 1280/390/320px, keyboard filters, long names, ordering,
  back/reload and zero external requests. Existing Storybook large-chunk/Node deprecation
  advisories remain non-failing. Submission tests include traversal, source-root escape,
  symlinks/special ZIP entries, duplicates/case/path aliases, hidden bytes/local-header mismatch,
  forged central-entry counts, CRC/size limits, invalid identity/source URLs and no-clobber output.
  Both registry workflows and the app desktop workflow parsed as YAML locally; no GitHub workflow
  execution or cross-platform runner result is claimed.
- App: **358 unit tests**, typecheck and production frontend build passed. Plugin host:
  **86 passed, 2 opt-in tests ignored** in the regular run; native app library: **50 passed**.
  A full first native-library run exposed two old tests assuming no default resolver; those now
  inject unavailable/configured state explicitly, and the full rerun passed. Native debug
  no-bundle build passed; binary built but never launched against user storage.
- Repackaged HA **after** the final native build cleared `dist`. Its opt-in local ZIP/install test
  passed (11 files, 50,272 unpacked bytes). The new opt-in **fixture-key** test also passed using
  these exact bytes through signature verification → injected HTTP → actual ZIP/manifest review
  → disabled/untrusted temporary install → restart with no enabled plugin. Its key exists only
  in test process memory; its fictional source/platform assertions are not release evidence.
- Local compiler: Rust **1.100.0**. Dependency metadata identified locked Tauri core/muda/tray-icon
  requiring 1.90; app commit `ae80da1` corrects desktop `rust-version` to **1.90** and pins CI to
  **1.90.0**. No local 1.90 compiler is installed; that exact minimum and future GitHub CI were
  **not run**. Windows/Linux native/installer checks remain open.
- `docker compose config --quiet` passed. `npm run hosting:smoke` was attempted and stopped at
  `docker info`: the daemon at `/Users/me/.docker/run/docker.sock` is unavailable. No image
  runtime/retention-recreation smoke or Docker deployment was performed. No operator storage/volumes were deleted.

## Deliberate next step — NOT executed

First obtain source/licence review and evidence for the actual runtime minimum and claimed
platforms. Distribute configured app builds and complete installed macOS/Windows/Linux native
handler, cancellation/local-priority, dialogs/drop and no-replace QA **before ready:true**.
Single-platform evidence is not three-platform QA. Do not sign `candidate.json` or make up a
platform list just to generate a release.

Once the compatibility assertions are justified, from this registry checkout:

```sh
CANDIDATE=/Users/me/.local/state/zdeck-release-candidates/home-assistant-0.2.0-c688567
# Set REVIEWED_PLATFORMS to only evidenced lowercase comma-separated platforms; no default.
# Source commit must also be made publicly reviewable under separate push authorization.
npm run release -- prepare \
  --manifest "$CANDIDATE/manifest.json" --archive "$CANDIDATE/home-assistant.zdx" \
  --runtime node --platforms "${REVIEWED_PLATFORMS:?Set only platforms supported by reviewed evidence}" \
  --url https://zreg.zaaane.com/artifacts/home-assistant/0.2.0.zdx \
  --repo https://github.com/ZaneH/zdeck \
  --commit c688567f8359f6d20ff4a7ee30ba6c18e25cc963 --license MIT \
  --output "$CANDIDATE/payload.json"
# Review payload.json, SHA/size/source/platforms and public-key fingerprint before this command.
# Deliberate operator-only local signing; never run in CI, Docker, shell tracing or this agent task.
npm run release -- sign --payload "$CANDIDATE/payload.json" \
  --key /Users/me/.config/zdeck-signing/registry-O8fc8H/private-key.pem \
  --key-id registry-2026-01 --output "$CANDIDATE/release.json"
npm run release -- verify --record "$CANDIDATE/release.json" \
  --trust registry/app-contract.json --archive "$CANDIDATE/home-assistant.zdx"
```

These commands refuse existing outputs. Do not change already-published bytes or reuse the exact
version for changed source/archive facts. If review changes any archive byte, rebuild from the new
committed source and review a new candidate/version as appropriate.

After separate publication authorization: add the public envelope as
`registry/releases/home-assistant/0.2.0.json`; update only `registry/plugins/home-assistant.json`
with matching published version/source/licence/runtime/tested-platform labels/release reference.
Keep `ready:false`. Stage the archive under an actual new absolute directory at
`artifacts/home-assistant/0.2.0.zdx` (not a URL). Then on the controlled publication host:

```sh
npm test && npm run typecheck && npm run build
npm run release -- retain --root "$PWD" \
  --archives "${REVIEWED_ARCHIVES:?Absolute staging root containing home-assistant/0.2.0.zdx}" \
  --output "$PWD/data"
docker compose up --build -d
npm run hosting:live -- --record registry/releases/home-assistant/0.2.0.json \
  --archive "$REVIEWED_ARCHIVES/home-assistant/0.2.0.zdx"
```

`retain` publishes only verified absent bytes and preserves all historical records/archives; supply
all history, not just this candidate. Signing does not authorize publication. A green hosting check
does not enable the website: deliberately review/distribute the configured native builds and all
three-OS gates, then change `ready:true` in a separate reviewed change. No automatic publishing,
self-authorizing install links or GitHub PR/token writes were added.
