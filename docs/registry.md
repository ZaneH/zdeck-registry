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
| `name` | yes | 1–80 characters, no control characters. |
| `summary` | yes | 1–200 characters. Plain text, one sentence. |
| `version` | for published | Three numeric parts, such as `0.1.0`; must match the plugin manifest. |
| `author` | yes | 1–80 characters. |
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
and licence are the complete documentation request.

## Preview and in-development entries

- `preview` means an implementation exists, but no package is published for download.
- `in-development` means the work is announced but no verified plugin, runtime, or archive is
  available.
- Only `published` may carry `release`, `version`, and `runtime`, and the install request is still
  disabled until the desktop verifies signed releases.

The checked-in Spotify entry is a `preview` of the existing reference plugin. The Home Assistant
entry is an `in-development` placeholder. Neither is presented as installable.

## Release record

```json
{
  "release": {
    "url": "https://example.com/plugin-0.1.0.zdx",
    "sha256": "64 lowercase hex characters",
    "signature": { "keyId": "publisher-key", "value": "opaque encoded signature" }
  }
}
```

- The URL must be HTTPS and end in `.zdx`.
- `.zdx` is an ordinary ZIP archive, not a new executable format.
- The archive is prebuilt and self-contained: it includes everything needed at runtime and no
  install scripts, package-manager hooks, or download-on-first-run behavior.
- `sha256` is the digest of the exact archive served at that URL.
- `signature` is optional today and validated for shape only. It is **not verified** by this site,
  and its presence must not be read as a verified-release badge. A future signed release record
  will need a documented algorithm, key distribution, and verification path.

Nothing in this repository creates signing keys or claims a release was signed.

## Install request

The future website-to-app request is:

```text
zdeck://plugins/install?id=spotify&version=0.1.0
```

- The id and version are URL-encoded.
- It is an **untrusted request** for the desktop to show a confirmation flow. Opening the link must
  not download, extract, or execute anything by itself.
- `INSTALL_REQUESTS_ENABLED` is `false` in `src/lib/registry.ts`, so the UI renders a disabled
  install control even if a record is published. This keeps the prototype from implying that a
  deep-link handler or signed installer exists.
- The desktop handoff contract is in [desktop-handoff.md](desktop-handoff.md).

## README rendering

READMEs are imported with Vite `?raw` at build time from `registry/readmes/`. There is no runtime
request to a README URL, no remote image proxy, and no raw HTML execution. The renderer allows
headings, lists, tables, code blocks, task lists, relative links, and HTTP(S) links. It drops images
and refuses `javascript:` links; raw HTML and iframes are escaped or ignored. Tests cover hostile
input in `tests/readme.test.tsx`.

## Search and tags

Search is local over name, summary, and tags. Tag filters come from the records themselves. The
directory reports the total and filtered counts and an empty state with a clear-filters action.
Unpublished entries remain in the catalogue and in search; they are not hidden to make the site
look more complete.
