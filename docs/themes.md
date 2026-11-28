# Theme catalogue records

Themes are a separate catalogue from plugins. A theme record documents an appearance or a
reviewed source preview; it is **not** an installable package. There is no release, runtime,
archive, checksum, signature, package field or `zdeck://` theme link. Do not disguise a theme as a
plugin or enable an install action.

## Files and layout

- `registry/themes/<id>.json` — one reviewed record per file; the filename must equal its ID.
- `registry/theme-readmes/<id>.md` — the record's local README, at most 64 KiB.
- `registry/previews/<id>/desktop.png` and `registry/previews/<id>/phone.png` — exactly two local
  PNG previews for the standard sample deck.

`src/lib/themes.ts` validates the whole theme catalogue before the app renders it.
`scripts/themes.ts` validates every record and README plus the actual local preview files at build
time. Any malformed record, missing/oversized README, duplicate ID, missing/stray preview file,
symlink, oversized file or wrong image dimension fails tests/build; no partial catalogue is served.

## Record fields

Every key is checked exactly. Unknown keys are rejected, including plugin-only keys such as
`release`, `runtime`, `version`, `status`, `install`, `packages` or `signatures`.

| Field | Required | Rule |
| --- | --- | --- |
| `id` | yes | `^[a-z][a-z0-9-]{0,63}$`; must match the filename and preview folder. |
| `name` | yes | 1–80 plain-text characters. |
| `summary` | yes | 1–200 plain-text characters, one sentence. |
| `author` | yes | 1–80 plain-text characters. |
| `license` | yes | SPDX-style identifier, 1–40 characters. |
| `repo` | yes | Absolute HTTPS source URL with no embedded credentials. |
| `readme` | yes | Filename such as `glass.md`; must exist under `registry/theme-readmes/` and be ≤64 KiB. |
| `kind` | yes | `built-in` or `source-preview`. |
| `builtin` | for `built-in` | `glass` or `terminal`. Must be absent for `source-preview`. |
| `sourceCommit` | yes | Full immutable source commit: exactly 40 lowercase hexadecimal characters. |
| `preview` | yes | Exact fixture and two local PNG references; see below. |
| `tags` | no | Up to 8 unique lowercase tags, each 1–32 characters. Also used as directory categories. |
| `provenance` | no | `{ "kind": "official" \| "community", "evidence"?: "https://…" }`; Official requires HTTPS evidence. |
| `addedAt`, `updatedAt` | no | Valid calendar date or canonical UTC timestamp, as in [registry.md](registry.md). Omit without traceable evidence. |
| `preview.fixture` | yes | Exactly `zdeck-sample-deck-1`. |
| `preview.desktop` | yes | `{ "src": "previews/<id>/desktop.png", "alt": "plain text" }`. |
| `preview.phone` | yes | `{ "src": "previews/<id>/phone.png", "alt": "plain text" }`. |

`kind: "built-in"` describes an appearance already in zDeck. `kind: "source-preview"` documents
reviewed theme source and screenshots without any package format or installability. A source
preview is submitted through a normal Git pull request, not a publishing API.

Example source-preview record:

```json
{
  "id": "example-theme",
  "name": "Example Theme",
  "summary": "A reviewed appearance shown on the standard sample deck.",
  "author": "Example Author",
  "license": "MIT",
  "repo": "https://github.com/example/zdeck-theme",
  "readme": "example-theme.md",
  "kind": "source-preview",
  "sourceCommit": "0123456789abcdef0123456789abcdef01234567",
  "preview": {
    "fixture": "zdeck-sample-deck-1",
    "desktop": { "src": "previews/example-theme/desktop.png", "alt": "Example Theme on the standard sample deck, desktop view." },
    "phone": { "src": "previews/example-theme/phone.png", "alt": "Example Theme on the standard sample deck, phone view." }
  },
  "tags": ["appearance", "example"]
}
```

## Preview boundary

- Previews are local PNG files only. SVG, remote URLs, data URLs, HTML and submitted CSS/code are
  rejected. The page never loads third-party CSS, code or images.
- Every preview folder and theme README must be referenced by a record; remove them when removing an entry. Each preview file must be a regular non-symlink file, larger than 0 bytes and at most 2 MiB. Desktop is
  exactly **1200 × 800**; phone is exactly **390 × 844**.
- Build validation checks the PNG signature and IHDR dimensions only. It is bounded and does not
  claim full image-safety validation or decode the picture. The site renders ordinary React
  `<img>` elements with plain-text `alt`; previews are evidence of one sample deck, not a live
  theme runtime, accessibility audit, performance result or platform-support claim.
- The checked-in built-in previews were captured from zDeck's authentic `ThemePreview` Storybook
  fixture (buttons, slider, dial, both toggles, a numeric reading, and the unknown/failed state
  examples) through a local Chromium browser at the fixed viewports. The desktop capture fits the
  fixture's content group into 1200 × 800 without cropping; the phone capture keeps its natural
  layout. They are not mock-ups or placeholders.

## Browsing and detail

- `#/` keeps the plugin directory; `#/themes` is the theme directory; `#/theme/<id>` is theme
  detail; `#/plugin/<id>` is unchanged.
- Both directories share search, category/publisher-style facets, sort/order controls, URL state,
  detail/back links, keyboard behavior and the compact row/detail visual language.
- Theme rows never show download, install or popularity metrics. Built-ins say **Included in
  zDeck** and the detail panel names the exact **Settings → Appearance** selection, plus the
  section **Theme → …** override. Source previews say **Source preview** and **no installable
  package**.
- Theme detail has no install button and no theme deep link. It shows the same fixture's desktop
  and phone local previews with plain-text alternatives, source repository, licence and full
  source commit.

## Built-in seeds

`glass` and `terminal` are genuine built-in zDeck appearances. Their source repository is
`https://github.com/ZaneH/zdeck`, licence MIT, and their source commit is
`c5a1ec849709db6a7d6ac68d6f8a670acdfa352d` (including the shared preview fixture and Glass spacing corrections). Publish that app commit before publishing these registry references. They are marked Official with an HTTPS source-tree
evidence URL. Inclusion in this directory does not assert accessibility, performance or
cross-platform verification beyond the checked preview fixture.
