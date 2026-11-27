# Spotify 0.1.0 — signed macOS pilot, deployment pending

Updated **2026-11-27**. Spotify 0.1.0 is now a **published catalogue record with a genuinely signed,
locally verified envelope**, under the new `registry-2026-11` key. It is **not yet deployed**:
public serving of the record and archive and native installed-handler QA are **pending**. Do not
describe this release as publicly available or installed, and do not claim Spotify or playback
operation has been exercised natively.

`registry/app-contract.json` stays `ready:true` with no change. That gate is per verified exact
identity, so **the catalogue deployment itself activates the Spotify install request**, at the same
time as it publishes the pending bytes. For that reason this task intentionally stopped before any
deployment or push. Activation is only honest once the deployment in the rollout section below has
completed and the public/native checks that follow it pass.

## Exact immutable release

| Fact | Value |
| --- | --- |
| ID / version / protocol | `spotify` / `0.1.0` / `1` |
| Source | `https://github.com/ZaneH/zdeck`, commit `c688567f8359f6d20ff4a7ee30ba6c18e25cc963` |
| Licence / runtime | MIT / installed Node **22.18.0+**, not bundled |
| Signed platforms | **`["macos"]` only**; Windows/Linux explicitly rejected before archive download |
| Archive | **42,176 bytes**, 11 files, 40,848 unpacked bytes |
| Archive SHA-256 | `4483286cdfe8fed0620879b7cca4821cd63932b8579181e79fff067b66980d8a` |
| Signed public envelope SHA-256 | `bd103e2fd40a555e699fc8b0e5abb0b96ecefdbb4375101b709a3ed916d3889d` |
| Registry key ID | `registry-2026-11` |
| Record URL (after deploy) | `https://zreg.zaaane.com/releases/spotify/0.1.0.json` |
| Artifact URL (after deploy) | `https://zreg.zaaane.com/artifacts/spotify/0.1.0.zdx` |

Candidate inputs and outputs live outside Git at:

```text
/Users/me/.local/state/zdeck-release-candidates/spotify-0.1.0-c688567/
  spotify.zdx                    reviewed prebuilt archive
  manifest.json, LICENSE         extracted facts
  candidate.json                 historical UNSIGNED preparation, not QA evidence
  payload.json, release.json     actual signed facts and public envelope
  staging/artifacts/             public archives for retention (Spotify + HA history)
  public-deploy/                 retained public tree + SHA256SUMS
  spotify-0.1.0-public.tar.gz    public-only deployment bundle
```

The tarball is **36,301 bytes**, SHA-256
`95de38854a6c88854d934774dc88415a539525f9be053774b5082bb87b9f2a32`. It contains exactly the two
public release records, the two public archives and `SHA256SUMS`; no key, credential or user data.
No `data/` bytes were changed in this task.

## How the record was verified

- Recomputed the archive SHA-256 and byte length and compared them with the signed payload.
- Ran the existing CLI with the checked-in trust file and no private key:
  `release verify --record <candidate>/release.json --trust registry/app-contract.json --archive <candidate>/spotify.zdx`.
  This verified the Ed25519 signature, the exact payload bytes and the archive, matching the
  independently shipped desktop public key. **No private key was read, referenced or printed.**
- Inspected the ZIP listing: 11 regular entries, `.zdeck-generated` marker, bundled
  `@zdeck/plugin-sdk@0.1.0`, no install scripts, no symlinks. The script was not executed and the
  plugin was not installed anywhere.
- Copied the envelope byte for byte into `registry/releases/spotify/0.1.0.json` (identical SHA-256)
  and made the catalogue record's version/source/licence/runtime/platforms match it. `buildReleases`
  now accepts both checked-in pilots.
- Retained the public tree with the existing no-clobber tooling against both archives, so full
  verified history is present (HA 0.2.0 and Spotify 0.1.0). A second retain is a no-op.

## Honest current status

- **Done locally:** signed archive and envelope; signature/digest/source/version/platform catalogue
  consistency; whole-catalogue build verification; retained public bundle and hashes above.
- **Pending:** the deployment below; positive public serving of these exact bytes; native lookup,
  download and install QA on the reviewed macOS build; actual Spotify control, Automation permission
  and playback; any other macOS version/architecture; Windows/Linux (unclaimed, explicitly rejected).
- The previous Spotify catalogue/source links pointed at a nonexistent `main` branch. `repo` is now
  the actual public repository, and `provenance.evidence` pins the exact reviewed commit.

## Executed checks, gaps and limits

On the macOS development host, after the catalogue change:

- `npm test`: **74 Vitest + 9 Python tests passed**, including whole-catalogue build verification,
  both signed envelopes, and the exact two-identity install gate.
- `npm run typecheck`, `npm run build` and `npm run storybook:build` passed. The production build
  emitted both records unchanged; the Spotify envelope in `dist/` is byte-identical.
- `CHROME_BIN='…/Brave Browser' npm run smoke`: passed, asserting **2 installable**, exact
  `zdeck://plugins/install?id=<id>&version=<version>` links for exactly HA 0.2.0 and Spotify 0.1.0,
  and that each record claims `macOS` only. It also checks the README still renders no images.
  `npm run smoke:directory` passed with no external requests or browser errors. Screenshots:
  `/tmp/zdeck-registry-ha-pilot.png`, `/tmp/zdeck-registry-smoke-narrow.png`,
  `/tmp/zdeck-directory-*.png`.
- Not run: digital signatures were not created, no key was read, no dependency was installed, no
  commit/push/merge or deployment was performed, and no Docker runtime check ran. No native
  lookup/download/install, Spotify control, playback or Automation permission was exercised.

## Rollout (operator-executed; not run here)

The deployment is the existing validated retention path and must keep both historical archives. On
the CT, in its existing **dev** registry checkout (preserve local changes; do not switch branches):

```sh
cd "${REGISTRY_CHECKOUT:?Set the actual existing CT registry checkout path}"
test "$(git branch --show-current)" = dev
git status --short                 # stop and review any existing changes
git pull --ff-only origin dev      # after the reviewed catalogue commit is pushed
BUNDLE="${PUBLIC_BUNDLE:?Set the transferred public tarball's absolute path}"
BUNDLE_SHA256=95de38854a6c88854d934774dc88415a539525f9be053774b5082bb87b9f2a32
printf '%s  %s\n' "$BUNDLE_SHA256" "$BUNDLE" | sha256sum -c -
STAGING=$(mktemp -d)
tar -xzf "$BUNDLE" -C "$STAGING" --no-same-owner --no-same-permissions
(cd "$STAGING" && sha256sum -c SHA256SUMS)
docker compose build               # whole catalogue/signature validation before retention
umask 022
mkdir -p data/releases data/artifacts
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges -u "$(id -u):$(id -g)" \
  --mount "type=bind,src=$PWD,dst=/registry,readonly" \
  --mount "type=bind,src=$STAGING,dst=/staging,readonly" \
  --mount "type=bind,src=$PWD/data,dst=/public" -w /registry \
  node:22.18.0-alpine3.22 node --experimental-strip-types scripts/releases.ts retain \
  --root /registry --archives /staging/artifacts --output /public
docker compose up -d --no-build
```

Then verify from the maintainer checkout, per identity:

```sh
CANDIDATE=/Users/me/.local/state/zdeck-release-candidates/spotify-0.1.0-c688567
npm run hosting:live -- --record registry/releases/spotify/0.1.0.json \
  --archive "$CANDIDATE/spotify.zdx"
npm run hosting:live -- --record registry/releases/home-assistant/0.2.0.json \
  --archive data/artifacts/home-assistant/0.2.0.zdx
```

Only after both report positive exact bytes, and a reviewed macOS build has completed real
lookup → download → review → disabled install of Spotify 0.1.0, should the Spotify entry be
described as publicly available or install-verified. Windows/Linux stay explicitly unsupported.
