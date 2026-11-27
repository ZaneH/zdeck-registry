# Registry records and install contract

## Catalogue

`registry/plugins.json` is version 1:

```json
{ "schemaVersion": 1, "plugins": [] }
```

The whole file is validated before use. Unknown keys, duplicate IDs, malformed values, unsafe
URLs, and missing READMEs reject the catalogue; entries are never silently skipped.

## Record fields

| Field | Required | Rule |
| --- | --- | --- |
| `id` | yes | Lowercase manifest ID: `^[a-z][a-z0-9-]{0,63}$`; must match the plugin manifest. |
| `name` | no | Optional presentation; 1–80 characters, no control characters. Defaults to the ID. |
| `summary` | no | Optional presentation; 1–200 characters. Plain text, one sentence. Omit to show no summary. |
| `version` | for published | Three numeric parts, such as `0.1.0`; must match the plugin manifest. |
| `author` | no | Optional presentation; 1–80 characters. Omit when no publisher identity should be asserted. |
| `license` | yes | SPDX-style identifier, 1–40 characters, matching the plugin's licence file. |
| `repo` | yes | Absolute HTTPS source URL with no embedded credentials. |
| `platforms` | no | 1–8 tested platform labels, such as `macOS` or `Linux`. Omit if untested. |
| `runtime` | for published | `{ "language": "node" \| "python", "minimum": "x.y.z" }`. |
| `tags` | no | Up to 8 unique lowercase tags, each 1–32 characters. Presentation and filtering only. |
| `readme` | yes | Filename such as `spotify.md`; must exist under `registry/readmes/` and be ≤64 KiB. |
| `status` | yes | `preview`, `in-development`, or `published`. |
| `release` | yes | `null` for unpublished entries; a release object only for `published`. |

`platforms` and `runtime` are compatibility facts, not marketing fields. Do not declare a minimum
that was not exercised, and do not add a generic access questionnaire. A README, source repository,
and licence are the complete documentation request. Name, summary, and author are optional; an
absent author means the registry does not assert who publishes the plugin.

## Preview and in-development entries

- `preview` means an implementation exists, but no package is published for download.
- `in-development` means the work is announced but no verified plugin, runtime, or archive is
  available.
- Only `published` may carry `release`. Version/runtime may describe a preview, but publication
  requires matching signed release metadata and the independent app-ready gate before installation
  can be offered.

The checked-in Spotify entry is a `preview` of the existing reference plugin. The Home Assistant
entry is an `in-development` placeholder. Neither is presented as installable.

## Release record and install gate

Published catalogue entries reference the exact local signed envelope:

```json
{ "release": { "record": "releases/<id>/<version>.json" } }
```

The path must equal that record's ID/version. The previous decorative `{url,sha256,signature}`
shape is rejected. Every envelope under `registry/releases/` (including historical versions) is
verified at build time with the reviewed public keys in `registry/app-contract.json`; catalogue
version/source/licence/runtime/platform facts must match. Platforms of published records use
`macOS`, `Windows`, `Linux`, corresponding to signed `macos`, `windows`, `linux`. Unknown keys,
missing records and any signature/schema mismatch reject the entire build.

See [releases.md](releases.md) for Ed25519 domain-separated exact bytes, strict payload fields,
external-key tooling, immutable static output and hosting, independent desktop trust distribution,
rotation/revocation and concrete isolated smoke. Nothing generates a production signing key.

`app-contract.json` is checked in **not ready**, with no endpoint/public keys. `ready:true` is an
explicit maintainer assertion that a matching configured desktop build and genuine immutable
releases have been distributed and verified on all three OSes. Only a published record with a
build-verified envelope and that active contract can offer an install action. A valid signed
published record with `ready:false` remains unavailable; preview entries can never be activated
by that flag. The browser receives only a build-generated allowlist of exact verified identities,
not private keys or Node crypto tooling.

The link remains `zdeck://plugins/install?id=<encoded-id>&version=<encoded-exact-version>`.
It is an **untrusted identity request**, not execution or a download. The desktop shows separate
lookup, download and archive-install intent steps and independently re-verifies everything.
The website does not fetch/install archives, detect an OS handler or claim an installation result.
See [desktop-handoff.md](desktop-handoff.md).

## README rendering

READMEs are imported with Vite `?raw` at build time from `registry/readmes/`. There is no runtime
request to a README URL, no remote image proxy, and no raw HTML execution. The renderer allows
headings, lists, tables, code blocks, task lists, and HTTP(S) links. Relative links resolve only
when an explicit GitHub `/tree/<branch>/<path>` source URL gives a known README base; otherwise they
are rendered non-clickable rather than linked to registry routes. It drops images and refuses
`javascript:`, protocol-relative, and backslash URLs; raw HTML and iframes are escaped or ignored.
Tests cover hostile input in `tests/readme.test.tsx`.

## Search and tags

Search is local over name, summary, and tags. Tag filters come from the records themselves. The
directory reports the total and filtered counts and an empty state with a clear-filters action.
Unpublished entries remain in the catalogue and in search; they are not hidden to make the site
look more complete.
