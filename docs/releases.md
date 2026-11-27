# Maintainer signed releases v1

Implemented tooling, **not a published service**. The checked-in `registry/app-contract.json` is
`ready: false`, `endpoint: null`, `keys: []`; no production URLs/keys/artifacts are supplied. The
Spotify/Home Assistant seeds stay preview/in-development with `release: null`. Do not enable them
or invent a review, checksum or signature to demonstrate installation.

## Immutable contract (matches zDeck `docs/registry-releases.md`)

Lookup is `<configured-base>releases/<id>/<exact-version>.json`, never a browser-supplied URL.
IDs are `[a-z][a-z0-9-]{0,63}`; exact versions have three 1–4-digit numeric parts.
Envelope is `{schema:1,keyId,payload,signature}`, UTF-8 JSON ≤32 KiB, no unknown fields. Payload
and signature are standard padded base64; signature is 64-byte Ed25519. Malformed UTF-8 and
unpaired JSON surrogates are rejected rather than replaced while decoding. Signed message bytes:
ASCII `zdeck-release-v1`, NUL, then the **decoded payload bytes unchanged**. Do not reserialize JSON
before verifying. This is not ambiguous JSON canonicalization and there is no selectable algorithm.

Payload (all fields required; no unknown/duplicate fields):

```text
{
  schema: 1, id, version,
  artifact: {url: public HTTPS .zdx URL, sha256: 64 lowercase hex, bytes: 1..16777216},
  compatibility: {
    protocol: 1, runtime: "node" | "python",
    minimum: "22.18.0" for node | "3.10.0" for python,
    platforms: unique nonempty subset of ["macos", "windows", "linux"]
  },
  source: {repo: public HTTPS URL, commit: 40 lowercase hex, license: 1..40 characters}
}
```

Current desktop supports only those runtime baselines/protocol and requires its OS in platforms.
Tooling accepts compact JSON plus at most one final newline; it rejects duplicate keys by checking
that exact compact representation. Signatures always use the original payload bytes including any
newline. Native uses strict serde schemas and the same domain/bytes. Both test the same public-only
Node-signed fixture. Fixture private keys are generated only inside isolated tests and discarded.

Do not include optional presentation author/name/summary/tags in signed identity claims. Catalogue
source/licence/runtime/platform/version fields must match the verified payload. Published records
reference only `{ "record": "releases/<id>/<version>.json" }`; the old shape-only signature field is
rejected. READMEs remain local build-time Markdown with existing safe rendering.

## External signing key and bootstrap

A maintainer supplies an **already externally managed Ed25519 private key FILE path** deliberately
at signing time. This project does not generate keys or search user/config folders. `--key` is a
path, never inline key bytes, an environment variable, browser input or a Git file. The signing
helper reads it only in the CLI command, never prints it or includes it in any returned envelope.
Do not use verbose shell tracing, log/commit/copy the key, or put it in a frontend/build environment.
Production key provisioning/backup/hardware custody is an out-of-band maintainer decision.

Review the public key out of band. `publicKey` is standard base64 of the raw 32 Ed25519 public-key
bytes, **not PEM/SPKI**. Configure the independently distributed desktop at build time:

- `ZDECK_REGISTRY_RELEASE_URL=https://<actual-owned-host>/<base>/`
- `ZDECK_REGISTRY_PUBLIC_KEYS='[{"id":"<reviewed-id>","publicKey":"<reviewed-public-base64>"}]'`
- optional `ZDECK_REGISTRY_WEBSITE_URL` for the fixed external catalogue menu action.

No default values/keys are invented. The desktop never trusts keys fetched with a release.
`registry/app-contract.json` is the website's **manual assertion that a distributed configured app
is ready**, not the desktop trust root. It contains `{schema:1,ready:boolean,endpoint:string|null,
keys:[{id,publicKey}]}` (at most eight unique IDs). Set the same reviewed endpoint/public keys here;
only set `ready: true` after real publication and three-OS native QA. The website build verifies
all release envelopes against those keys and cross-checks all published records before enabling an
install link for that exact identity. A decorative signature cannot enable an entry. `ready:false`
allows a genuinely signed published record to be listed while app activation is withheld.

Rotation: distribute a new app trusting old+new public IDs first, then sign new exact versions with
the new key. Remove an ID in a future desktop build to manually revoke it. Older/offline apps and
already installed packages are not remotely revoked. No expiry/online revocation/PKI/transparency
log is supplied. Never rewrite existing release bytes to re-sign them; publish a new version.
Removing a website verification key intentionally makes builds fail for **all historical records**
signed by it. Maintainers must explicitly withdraw those records from future catalogue/build input
and review affected published entries, while retaining the original bytes in immutable hosting for
history (do not overwrite them). Older trusted desktop builds may still accept those retained
bytes. This conservative v1 tradeoff avoids silently dropping invalid releases or inventing PKI.

## Deliberate release path (no publication command)

Use Node **22.18 or later**. Run in a clean maintainer environment, not a browser or user plugin
directory. Substitute actual reviewed paths/metadata; angle-bracket examples below are not URLs or
keys to deploy. Never execute third-party plugin code in registry CI.

1. Build a self-contained ordinary ZIP `.zdx` offline using the app's packager; review its source,
   licence, immutable source commit and real runtime/platform evidence. There are no install hooks.
2. Validate/install the artifact **only in an isolated temporary fixture** with the app's opt-in
   generated-artifact test (see app `docs/zdx.md`). `prepare` only checks ZIP magic/size/digest; it
   is not a substitute for native strict ZIP validation or manual source review.
3. Prepare signed facts from the actual static manifest and archive. Manifest derives ID/version/
   protocol; actual bytes derive size/SHA-256. Runtime/platform/source/licence assertions remain
   explicit and need maintainer evidence. No plugin code is evaluated:

```sh
npm run release -- prepare \
  --manifest /isolated/prebuilt/manifest.json --archive /isolated/artifact.zdx \
  --runtime node --platforms macos,windows,linux \
  --url 'https://<actual-immutable-artifact-host>/<id>/<version>.zdx' \
  --repo 'https://<actual-source-host>/<repo>' --commit '<reviewed-40-hex-commit>' \
  --license MIT --output /isolated/payload.json
npm run release -- sign --payload /isolated/payload.json \
  --key /external/maintainer-key.pem --key-id '<reviewed-id>' \
  --output /isolated/release.json
npm run release -- verify --record /isolated/release.json \
  --trust registry/app-contract.json --archive /isolated/artifact.zdx
```

All output uses exclusive creation (`wx`), never overwrite. Errors are fixed guidance, not key or
payload dumps. Set public keys in the trust config before verification, but keep `ready:false` until
the app/publication gates are satisfied. Copy only the signed **public** envelope into
`registry/releases/<id>/<version>.json`, the existing plugin README into `registry/readmes/`, and
add/update the catalogue record with matching facts and `status:"published"`. Author/name/summary/
tags stay optional. No form, account or backend is needed.

4. `npm test && npm run typecheck && npm run build` validates the **whole** catalogue and every
   historical release envelope before emitting unchanged bytes to `dist/releases/...`. A malformed,
   missing, untrusted or identity-mismatched record fails the entire build, not a partial directory.
   For a separate new static output directory, without Vite:

```sh
npm run release -- build --root "$PWD" --output /isolated/new-static-output
```

For the provided Compose layout, see [self-hosting.md](self-hosting.md): `release retain` is an
explicit operator-only step that validates the catalogue, signatures and staged archive bytes,
then atomically adds absent files under persistent `data/releases/` and `data/artifacts/` without
clobbering existing bytes. Compose does not run it. It requires the signed artifact URL path
`/artifacts/<id>/<version>.zdx`; keep all historical records in verified Git input and all archives
available when retaining. It refuses unknown/mutated retained files rather than serving unchecked
metadata through a publishing API. It does not sign, configure desktop trust or enable the app gate.

5. Publication/deployment is deliberately manual and **not authorized by running these commands**.
   Publish exact reviewed artifact/envelope bytes at final immutable public HTTPS URLs. Serve JSON
   as `application/json`, ZIP as `application/zip`, `200` only; disable content encoding. No redirects
   (even same origin), query/fragment/credentials/non-443 ports/private networks are supported.
   Common GitHub release links redirect and are not directly compatible. Preserve all historical
   JSON and archives across deployments; `wx` prevents local overwrite, not a hosting provider's
   overwrite or deletion. Review Git diffs/host retention to enforce immutability operationally.
6. Distribute the configured desktop build and test installed handlers on macOS/Windows/Linux.
   Only then deliberately set the website's app contract ready and promote by PR. No automatic
   enablement, deployment, update check or replacement is provided.

The desktop enforces normal TLS, no proxies/redirects, public DNS validation and pinned addresses,
10-second connect/50-second HTTP/60-second overall fetch deadlines, streaming caps (32 KiB metadata,
16 MiB signed exact archive) and SHA-256 before ZIP validation. Lookup and download each require
explicit user intent. A browser request never trusts/enables/executes a plugin or supplies a local
path. The app compares the archive ID/version/protocol/runtime with the signed payload and installs
only after separate review, disabled and untrusted. Collisions are refused.

## Concrete safe local smoke

```sh
npm test -- tests/releases.test.ts tests/registry.test.ts tests/ui.test.tsx
npm run typecheck
npm run build
npm run storybook:build
CHROME_BIN='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npm run smoke
```

Release tests generate a test-only private key in a private temporary directory, exercise
prepare/sign/verify/static output/no-overwrite, then remove it. No real key/config is accessed, no
HTTP endpoint is contacted, no plugin code runs. Test-only `.test` URLs and fabricated archives
are explicitly fixtures, not publication evidence. App tests exercise real signature verification
→ injected HTTP bytes → real ZIP review → isolated disabled/untrusted install/restart, plus tamper,
size/digest, manifest mismatch, private/DNS/redirect/content errors and cancellation/stale tokens.
The website has no lookup/download busy/cancel state: it only hands an untrusted link to the OS;
those states live in the desktop Storybook. No page can detect a handler/install result reliably.
Website Storybook includes explicit fictional AppReady/PublishedUnready/Preview handoffs, enabled
only by a Storybook-only exact-identity allowlist. Never click those fixture OS links; they are
rendering checks, not install evidence. The production app contract and seed entries are unchanged.

### Checks executed for this milestone

On the macOS development host: **41 tests passed**, standalone typecheck, production Vite build,
Storybook build and the existing Brave production smoke passed. Focused Brave Storybook checks
covered AppReady/PublishedUnready/Preview at 960/390px, visible catalogue errors, no horizontal
overflow, and no external request or OS-link launch. Screenshots are under
`/tmp/zdeck-registry-release-stories/`; production smoke screenshot is
`/tmp/zdeck-registry-smoke-narrow.png`. Storybook retains its non-failing large-chunk advisory.
The first focused browser run hit an ambiguous heading selector (fixture title plus README title);
using the first heading fixed the check without changing product behavior. The existing smoke
selector was updated from “Planned desktop request” to the current “Desktop request” disclosure.
No real endpoint, artifact, key bootstrap, deployment, OS association or native parity was tested.
