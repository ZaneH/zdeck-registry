# Home Assistant 0.2.0 — active signed macOS pilot

Updated **2026-11-27**. The gate is now active: `registry/app-contract.json` has `ready:true`, so the
website offers the untrusted install request for exactly `home-assistant@0.2.0`. This was enabled
only after operator-verified public serving and installed-build QA:

- The public record and archive at the final URLs below serve the signed bytes.
- Installed macOS build `b9628ca` handled the `zdeck` deep link with the app closed, running and
  hidden: explicit lookup, download and review, a fresh disabled/untrusted HA 0.2.0 install, and
  persistence across a normal restart. No plugin was executed.
- The existing HA 0.1.0 backup remains preserved and reversible.
- An earlier automated lookup anomaly was not reproduced across 12 s of passive screenshots and
  read-only accessibility inspection; its cause is still unexplained and it is not called disproven.
- Signed platforms stay `["macos"]`. Windows/Linux were not natively verified and this release does
  not support them. Spotify 0.1.0 is separately catalogued as a signed macOS pilot with hosted
  exact bytes and a passed isolated native install; its normal-GUI check and site activation were
  still open at this record's last update. See [spotify-candidate.md](spotify-candidate.md).

The historical sections below record the earlier deployment-blocked state: the then-current 404
snapshots and the retention/deploy procedure. Their dated observations are superseded by the
verified public deployment above; they are procedure and history, not current status.

## Exact immutable release

| Fact | Value |
| --- | --- |
| ID / version / protocol | `home-assistant` / `0.2.0` / `1` |
| Source | `https://github.com/ZaneH/zdeck`, commit `c688567f8359f6d20ff4a7ee30ba6c18e25cc963` |
| Licence / runtime | MIT / installed Node **22.18.0+**, not bundled |
| Signed platforms | **`["macos"]` only**; Windows/Linux explicitly rejected before archive download |
| Archive | **51,614 bytes**, 11 files, 50,272 unpacked bytes |
| Archive SHA-256 | `2bc4fde8f462feabbf91b929a9b5213eee63183972f34435b53485de225e979d` |
| Signed public envelope SHA-256 | `87d6c685b88b77ed8ffeb2bd17b4fb580417ce8af7ed6bcb809df2e059741b66` |
| Registry key ID | `registry-2026-01` |
| Final record URL | `https://zreg.zaaane.com/releases/home-assistant/0.2.0.json` |
| Final artifact URL | `https://zreg.zaaane.com/artifacts/home-assistant/0.2.0.zdx` |

The app pilot fix/checks were committed and pushed on `dev` as
[`ddbaca5`](https://github.com/ZaneH/zdeck/commit/ddbaca594e2cca0e9000b5c5cde70efe855cc90b),
including previously unpushed `ae80da1` and `c688567`. The exact candidate manifest was then
retrieved unauthenticated from GitHub at `c688567…` and compared byte for byte successfully.
Use this pilot app build (or a later reviewed one), not an older installed app.

The external private-key file was used **only by the existing reviewed `release sign --key` CLI**,
under explicit operator authorization. No key bytes were read into agent context, printed, copied,
committed, uploaded, put in environment variables, Docker or CI. No new key was generated.
The public key matches the independently shipped desktop key and registry app contract:
`H/shqLoptu026ur/SMHgpyE2K0Hw+kgtLB2cU6wkL7w=`, decoded-key SHA-256
`520d9f831d334a20ccf0daec25cd9eaedb5dde291a3af0e2313af2710b4a1457`.

Before preparing/signing, live exact-version paths were verified missing. No existing release bytes
or version were overwritten. All retained outputs used the CLI's no-clobber path; a repeat retain
accepted the unchanged bytes. Do not re-sign this version to add platforms or change any fact;
publish a new exact version. The Git envelope is public, not the private key.

Durable bundle root:

```text
/Users/me/.local/state/zdeck-release-candidates/home-assistant-0.2.0-c688567/
  home-assistant.zdx              original reviewed archive
  manifest.json, LICENSE          original extracted facts
  candidate.json                 historical UNSIGNED preparation, not current QA evidence
  payload.json, release.json      actual signed facts and public envelope
  staging/artifacts/home-assistant/0.2.0.zdx
  public-deploy/artifacts/home-assistant/0.2.0.zdx
  public-deploy/releases/home-assistant/0.2.0.json
  public-deploy/SHA256SUMS
  home-assistant-0.2.0-public.tar.gz
```

The **public-only tarball** is 17,588 bytes, SHA-256
`7f16fced46da336b4d60c830dad55830a8b70c22a4cc2e133bc5efdbb359ad60`.
It contains only the archive, signed envelope and checksums, **no key, credentials or user data**.
The same public bytes were retained under local ignored `data/`. Git push alone does **not**
transfer those bytes to the CT's bind directories.

## Evidence supporting this limited pilot

- **Source/contents:** every archived source/SDK/licence/README/manifest file was compared byte for
  byte with commit `c688567…`. The two generated files were checked against the reviewed packager:
  the marker and package metadata with the bundled SDK dependency; no install lifecycle script,
  npm installation, symlink or fetched dependency is needed. Static source review covered HA URL/
  token handling, redirect refusal, streaming/deadline limits, entity binding, readback and no-retry
  behavior, plus the bundled SDK's bounded JSONL protocol. Signatures are not a sandbox/safety guarantee.
- **Runtime baseline:** downloaded the official Node 22.18.0 darwin-arm64 runtime into a temporary
  tool directory and checked its archive against the official HTTPS SHASUMS256 list (not a signed
  distribution attestation). **40 HA/SDK tests passed** on that exact version. HTTP is injected;
  no real HA endpoint, token, device or installed plugin entrypoint was used.
- **Actual macOS bundle/WebKit/IPC:** built `zDeck Smoke.app` with current bundled frontend assets,
  separate `com.zdeck.native-smoke` identifier and `zdeck-smoke` scheme. The opt-in native feature
  creates fresh native data/plugin/device/preference roots, uses mock in-memory credentials and
  attaches no runtime candidates or settings loader. It never restores real user plugins. Native
  archive delivery → actual bundled WebKit IPC review → **Install disabled** passed, with exact
  SHA, untrusted catalogue, empty enabled preferences and no running plugin snapshots. Owned test
  roots were removed after inspection. Smoke executable SHA-256:
  `f3d5d0f9c45f11bf37b67e680f6e79e7ec3adaa075c87fc0b19afe249046be58`.
- This real launch found a blocker missed by fixtures: WebKit reports `tauri://localhost` without
  a trailing slash, while the guard accepted only `/`. The fix normalizes **only that exact local
  root**; remote origins, credentials, ports, paths and queries remain rejected and tested.
- The same isolated bundle received the fixed native delivery hook's HA identity, used the real
  compiled production endpoint/key, and failed closed on the then-current **public 404** before
  deployment, then canceled with nothing installed. No URL handler/default application was
  registered or replaced.
- **Actual production signature + native installer:** the opt-in Rust test used this exact envelope
  and archive, independently shipped public key and source/hash assertions. It passed signature →
  injected local HTTP bytes → real ZIP review → isolated disabled/untrusted install → restart with
  empty enabled state → no-replace collision refusal, and rejected signature tamper/Windows/Linux.
  **This positive test is local transport evidence, not public download evidence.**
- A normal configured `zDeck.app` was also freshly built (`--debug --bundles app`), **not launched**.
  Info.plist declares `zdeck`, identifier `com.deck.local`; binary contains the real endpoint/public
  key. Executable SHA-256: `8c99c7b86758c697029f0e472a57ab025b39f5dee02eedd29d8a9957fda1948d`.
  No app was installed/distributed, copied to Applications or substituted for the user's handler.

These checks were on **macOS 27.0.1, Apple Silicon**. They support a narrowly described macOS
installation pilot, not other macOS versions/architectures, real device operation or three-OS
parity. Windows/Linux implementations remain required and their native verification remains open.
The website gate is per offered release's **claimed platforms**, not a blanket three-OS prerequisite.
It still requires positive public hosting, distributed configured build and installed-handler QA
on every claimed platform; those macOS checks are now complete for this pilot.

## Live state, distinct from local state

**Superseded:** this section is the pre-deployment snapshot. Positive exact-byte serving was verified
later, before `ready:true`.

At 04:22 and again **04:37 UTC**, DNS returned public IPv4 `104.21.95.122`, `172.67.144.194`;
the check pinned the first with normal TLS/SNI verification, advertised compression and followed
no redirects. Page/health and safe negative-path policies passed. HA exact-version JSON/ZIP returned
**404 `no-store, no-transform`**, no redirect or Content-Encoding. Positive-hosting check correctly
failed `Expected 200, got 404` for both. No partial success is called a release deployment.

Live static bytes (04:36 UTC):

- `/`: 1,035 bytes, SHA-256 `123d22ce20aa1899060bd3f281de19205a3c54d0b29f95f295c4a3ab0db47753`.
- `/assets/index-2bDSEbNu.js`: 431,408 bytes,
  SHA-256 `f2480a42909749b8049fe72f60db1cdfbea6a40893b8b94b2c0ff778ed3eddbc`.
- `/assets/index-CUpVTRwq.css`: 18,213 bytes,
  SHA-256 `c8ba737bc65f80fdff0f56d4a1c378f3de4f28b1d445a4f92df9e676214568d3`.

Brave confirmed the **old** HA placeholder with disabled install; screenshot
`/tmp/zdeck-pilot-live-page.png`. An initial screenshot used the wrong plural route, then the
correct `/#/plugin/home-assistant` was checked. Current local build is a different JS asset,
`index-CqN-Lk8L.js`; deployed source is not inferred from Git. HSTS/CSP/X-Frame-Options/
Referrer-Policy were absent on live responses. `zdeck.zaaane.com` failed DNS resolution from this
host during its separate read-only probe; it was not silently treated as reachable.

## Executed checks and gaps

- Public hosting (2026-11-27, read-only `hosting:live`): both exact paths returned 200 with
  `no-transform` immutable caching — the record is 732 bytes / envelope SHA-256
  `87d6c685b88b77ed8ffeb2bd17b4fb580417ce8af7ed6bcb809df2e059741b66` and the archive 51,614 bytes /
  SHA-256 `2bc4fde8f462feabbf91b929a9b5213eee63183972f34435b53485de225e979d`, matching the signed
  bytes. HSTS/CSP/X-Frame-Options/Referrer-Policy remain absent on live responses.
- Registry: **73 Vitest + 9 Python tests**, typecheck, production build, Storybook build, Brave
  production and directory smokes passed (1280/390/320px, keyboard/search/sort, no external requests).
  The production smoke now asserts exactly one active `zdeck://` link, for
  `home-assistant@0.2.0`, and that every other entry stays disabled. That smoke was later updated
  for the Spotify 0.1.0 pilot; see [spotify-candidate.md](spotify-candidate.md).
  Screenshot: `/tmp/zdeck-registry-smoke-narrow.png`.
- App: **358 unit tests**, typecheck, production frontend build, native library **50 tests**, plugin
  host **87 tests** (3 opt-in checks ignored normally), plus the explicit production-key candidate
  check above passed. Fixture cancellation/stale tokens/tamper/404/digest/collision tests remain.
  Normal and smoke macOS `.app` builds passed. Debug bundles are not notarized production installers.
- `docker compose config --quiet` passed. `hosting:smoke` was attempted but stopped at `docker info`:
  the local Docker daemon was unavailable, so no Docker runtime check ran from this host. The CT
  deployment was performed separately by the operator.
- Compiler is Rust 1.100.0, not the pinned minimum 1.90.0. No new GitHub CI run or Linux/Windows
  packaging result is claimed. Linux layout launcher was adapted to safer isolation, not rerun here.
  Storybook's large-chunk and Node deprecation advisories remain non-failing; smoke-only Rust
  settings-loader dead-code warnings reflect the deliberately detached loader.
- Outstanding after the pilot checks: browser association beyond the tested build, manual
  dialogs/drop/local priority, cancel/reopen QA in the packaged UI, app distribution/notarization,
  other macOS versions/architectures, Windows/Linux, and real HA devices. With operator approval,
  HA 0.1.0 was reversibly backed up and replaced by disabled/untrusted 0.2.0, and the local debug
  app was registered as the macOS URL handler. Credentials, devices and Cloudflare configuration
  were not changed.

## Deployment step (operator-executed; retained for reproducibility)

The operator completed an equivalent public retention/deploy on the CT; the exact CT address and
checkout path are not recorded here. No additional key or signing was needed. The reviewed
procedure transfers only the public tarball above to a chosen CT staging location.
On that CT, in its existing **dev** registry checkout (preserve local changes; do not switch branches):

```sh
cd "${REGISTRY_CHECKOUT:?Set the actual existing CT registry checkout path}"
test "$(git branch --show-current)" = dev
git status --short                 # stop and review any existing changes
# After reviewing status and the pushed dev commit:
git pull --ff-only origin dev
BUNDLE="${PUBLIC_BUNDLE:?Set the transferred public tarball's absolute path}"
printf '%s  %s\n' \
  7f16fced46da336b4d60c830dad55830a8b70c22a4cc2e133bc5efdbb359ad60 "$BUNDLE" | sha256sum -c -
STAGING=$(mktemp -d)
tar -xzf "$BUNDLE" -C "$STAGING" --no-same-owner --no-same-permissions
(cd "$STAGING" && sha256sum -c SHA256SUMS)
docker compose build               # tests + whole catalogue/signature validation before retention
umask 022
mkdir -p data/releases data/artifacts
# No Node install needed on the CT; only public paths are mounted, no key or credentials.
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges -u "$(id -u):$(id -g)" \
  --mount "type=bind,src=$PWD,dst=/registry,readonly" \
  --mount "type=bind,src=$STAGING,dst=/staging,readonly" \
  --mount "type=bind,src=$PWD/data,dst=/public" -w /registry \
  node:22.18.0-alpine3.22 node --experimental-strip-types scripts/releases.ts retain \
  --root /registry --archives /staging/artifacts --output /public
docker compose up -d --no-build
```

This is the existing validated no-overwrite retention path, not ad-hoc copying into served storage.
The Docker command is provided for the operator, **not runtime-tested here** because Docker is down.
If future history exists, supply all historical archives too (the helper refuses incomplete/mutated
history). Do not delete history, alter keys, overwrite paths, use `down -v` or change the tunnel.

Then from the maintainer checkout verify public serving and actual native download:

```sh
CANDIDATE=/Users/me/.local/state/zdeck-release-candidates/home-assistant-0.2.0-c688567
npm run hosting:live -- --record registry/releases/home-assistant/0.2.0.json \
  --archive "$CANDIDATE/home-assistant.zdx"
cd /Users/me/repos/personal/zdeck
ZDECK_REVIEWED_RELEASE="$CANDIDATE/release.json" \
ZDECK_ZDX_ARTIFACT="$CANDIDATE/home-assistant.zdx" ZDECK_PUBLIC_RELEASE=1 \
  cargo test --locked --manifest-path src-tauri/Cargo.toml -p zdeck-plugin-host \
  --test registry_release reviewed_production_release -- --ignored --nocapture
```

For real bundled WebKit/IPC delivery without changing the user's handler, build with
`npm run tauri:build -- --debug --bundles app --features native-smoke --config src-tauri/tauri.smoke.conf.json`,
then launch the smoke bundle executable with `ZDECK_REGISTRY_SMOKE=remote`. It creates its own new
roots; its fixed native delivery hook requests only HA 0.2.0 and reports `ZDECK_REGISTRY_SMOKE`
JSON (`ok` must be true). `local` additionally requires explicit `ZDECK_SMOKE_ARCHIVE`; `missing`
expects the pre-deployment 404. This is not installed OS/browser association QA. Never launch the
normal binary for isolation tests. Only after positive hosting, configured app distribution and
applicable installed-handler/manual QA should a separate reviewed change activate `ready:true`.
