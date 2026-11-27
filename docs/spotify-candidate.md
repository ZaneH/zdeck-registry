# Spotify 0.1.0 — signed macOS pilot, activation pending

Updated **2026-11-27**. Spotify 0.1.0 is a **published catalogue record with a genuinely signed,
locally verified envelope** under the new `registry-2026-11` key. Its public bytes are **hosted and
verified**, and isolated native installation has passed. The public website still serves the
previous **HA-only** build; the catalogue change is committed and pushed, and activation is the
next reviewed deployment. Do not describe the live site's Spotify install link as already active.

`registry/app-contract.json` stays `ready:true` with no change. That gate is per verified exact
identity, so the activation deployment of the new build makes the Spotify install request reachable
alongside HA 0.2.0.

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
| Record URL | `https://zreg.zaaane.com/releases/spotify/0.1.0.json` |
| Artifact URL | `https://zreg.zaaane.com/artifacts/spotify/0.1.0.zdx` |

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
The public tree was retained with the existing no-clobber tooling against both archives, so full
verified history (HA 0.2.0 and Spotify 0.1.0) is present; a repeat retain is a no-op.

## Verification evidence

- Recomputed the archive SHA-256 and byte length and compared them with the signed payload. The
  existing CLI verified the Ed25519 signature, exact payload bytes and archive against the
  checked-in trust file. **No private key was read, referenced or printed.**
- Inspected the ZIP listing: 11 regular entries, `.zdeck-generated` marker, bundled
  `@zdeck/plugin-sdk@0.1.0`, no install scripts, no symlinks. The plugin script was not executed.
- Copied the envelope byte for byte into `registry/releases/spotify/0.1.0.json` (identical SHA-256)
  and made the catalogue record's version/source/licence/runtime/platforms match it. `buildReleases`
  accepts both checked-in pilots.
- **Public serving verified:** the exact 716-byte signed envelope and 42,176-byte archive both returned
  `200` with correct MIME types, immutable caching and the hashes above. HA 0.2.0 bytes are unchanged.
- **Independent public verifier (app repo, `ZDECK_PUBLIC_RELEASE=1`):** the Spotify Rust release
  verifier plus real HTTPS download passed → real ZIP review → isolated disabled/untrusted install →
  restart → collision refusal. No plugin execution.
- **Isolated native delivery:** the staged `smoke.app` in **remote** mode used actual production
  DNS/TLS, looked up, downloaded and reviewed Spotify 0.1.0, and installed it disabled/untrusted in
  its own roots; zero running plugin snapshots, no execution, exit `0`.
- **Normal GUI identity only:** `~/Applications/zDeck.app` was updated (both public keys and the
  clipping fix) with the prior bundle preserved as a backup, and
  `zdeck://plugins/install?id=spotify&version=0.1.0` launched the updated bundle as the single
  instance frontmost. The identity prompt was **not visually confirmed** (no accessibility or
  screen-capture permission). The existing enabled Spotify
  plugin was unchanged. **No real playback, JXA or Automation request was exercised.**

## Honest current status

- **Verified:** signed archive/envelope bytes; catalogue consistency; public exact-byte serving;
  isolated native lookup/download/review/install (both app smoke and independent verifier).
- **Website:** still the previous HA-only deployment. The new build renders **two** install links
  (HA 0.2.0 and Spotify 0.1.0); it is not live until the activation deployment. Do not claim the
  live Spotify link works yet.
- **Remaining manual normal-GUI gap:** the updated normal app launched, but its identity prompt
  was not visually confirmed; no deliberate confirm/cancel walkthrough, no real Spotify control, no
  playback/Automation permission, no other macOS version/architecture. Windows/Linux are unclaimed
  and explicitly rejected. Only the local QA build was updated; broader distribution and untested
  OSes remain out of scope.
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
- Not run by this registry change: digital signatures, key access, dependency installs, commits or
  deployments. Docker runtime checks and installed-handler manual dialogs/cancel/reopen remain
  unrun here. Registry browser smoke is not native-install evidence.

## Activation (operator-executed; not run here)

The release/artifact bytes are already retained on the host. Activation deploys the reviewed
catalogue build only; do not re-sign, overwrite or delete history.

```sh
cd "${REGISTRY_CHECKOUT:?Set the actual existing CT registry checkout path}"
test "$(git branch --show-current)" = dev
git status --short                 # stop and review any existing changes
git pull --ff-only origin dev      # includes the reviewed catalogue commit
docker compose build               # whole catalogue/signature validation before serving
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

After deployment, confirm in a browser that the site renders exactly two install links, then complete
the remaining normal-GUI check (inspect the identity prompt and confirm/cancel) before describing
Spotify as install-verified there. Windows/Linux stay explicitly unsupported.
