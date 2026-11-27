# Registry records and install contract

## Catalogue

Each `registry/plugins/<id>.json` contains one record below. There is no aggregate JSON source
or handwritten import list. The browser and release tooling assemble a version-1 catalogue at
build time. Filenames must match IDs; non-record files, symlinks, unknown keys, duplicate IDs,
malformed values, unsafe URLs and missing READMEs fail the whole build, never a partial catalogue.
The old `registry/plugins.json` is rejected if present. Existing optional metadata and directory
search/filter/sort semantics are unchanged.

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
| `tags` | no | Up to 8 unique lowercase tags, each 1–32 characters. Also used as directory categories; no second category list. |
| `provenance` | no | `{ "kind": "official" \| "community", "evidence"?: "https://…" }`. Official requires evidence; operator-reviewed classification, not a signature or inferred author identity. |
| `downloads`, `githubStars` | no | Each is `{ "count": 0, "asOf": "2026-01-01", "source": "https://…" }`. Nonnegative safe integer and dated, attributable snapshot. Omit without evidence. |
| `addedAt`, `updatedAt` | no | Valid calendar date `YYYY-MM-DD` or canonical UTC timestamp `YYYY-MM-DDTHH:mm:ss.sssZ`. No offsets, ambiguous local times, or rolled-over dates. |
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

## Directory search, filters and ordering

Search runs synchronously in memory over ID, name, summary and tags (at most 500 records). No
submit, debounce delay, background request or README fetching. Every query word must match at
least one field. Relevance ranks whole-query exact names/IDs, prefixes, contained name matches,
all-name word matches, exact tags, then other matches; ties are alphabetical. The empty query is
alphabetical. An explicitly chosen sort is not replaced when the query changes.

Categories reuse `tags`. Selected categories match **any** selected tag; publisher choices match
**any** selected group. Query, category and publisher filters combine with **AND**. No selected
checkbox in a group means all. Missing `provenance` is grouped under **Community**, meaning
“not classified Official,” not a verified claim about who wrote it. Official is an explicit
registry-maintainer assertion of zDeck maintenance, supported by the evidence URL and review of
the source. Neither a familiar author string, repository username, README claim, nor a valid
release signature automatically makes a plugin Official. The two checked-in reference entries
are explicitly classified from their plugin directories in the zDeck source tree; their preview /
in-development availability remains unchanged. Official does not mean security-reviewed, a
Spotify/Home Assistant endorsement, or installable.

Sorts: relevance, name, downloads, GitHub stars, last updated, date added. Every sort offers both
directions with contextual labels. Missing metrics/dates sort **last in both directions**, not as
zero. Metric/date ties use ascending English locale-aware names, then exact IDs. Name sorting
uses the same collator (including numeric names), with ID ties independent of direction.
Query, checkbox selections, sort and direction live in hash query parameters, are replaced rather
than adding a history entry per keystroke, and travel with detail/back links. Reload and browser
Back restore the same criteria. Unpublished entries remain visible in search.

### Snapshot and date semantics

There is **no download counter or GitHub snapshot feed** in this registry. The real entries have
no counts or dates and display `—`, never fabricated zeroes. The website does not count clicks,
phone home, poll GitHub, or fetch metrics while searching. Storybook values are explicitly
fictional fixtures and never imported by the production app.

An operator may manually add an optional snapshot in a reviewed Git change, with an attributable
HTTPS `source` and `asOf` observation date/time. `downloads` means the cumulative number of
successful prebuilt `.zdx` archive downloads for this plugin across versions, as reported by that
source—not installs, unique users, page views, source ZIP downloads, or inferred popularity. Omit
it if the host does not provide that measure. `githubStars` means the source repository's star
count at observation time; a monorepo count is repository-wide, not plugin-specific. Do not use a
monorepo count as a plugin popularity claim. Each metric has its own source and observation date;
hovering a known row count exposes these. Unknown and actual zero stay distinct.

`addedAt` is the first inclusion of this ID in this catalogue. `updatedAt` is a substantive plugin
source/release update, not a registry edit, snapshot refresh, or build timestamp. Supply either
only with traceable source/release/Git-history evidence in the PR. They are independent dates,
not a claim that the plugin was created on that day. The checked-in seeds deliberately omit both;
we do not infer plugin-update history from registry Git history. Changing presentation metadata
does not affect signed release payloads or the app-ready install gate.
