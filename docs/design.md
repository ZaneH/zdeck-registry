# Registry design notes

## Brief

A static, Git-backed directory for zDeck plugins. It should make a plugin's identity, licence,
source, runtime, and honest availability obvious before anyone is asked to install anything. It is
not a marketplace: no accounts, ratings, reviews, download counts, or publishing API.

## North star

zDeck's established system is a compact, tactile editor: recessed deck surfaces, shallow key edges,
neutral gray surfaces, Geist, and a sparing cyan accent. The registry should read as the same
instrument, not as a generic SaaS card grid.

## Plan

**Color.** Reuse zDeck tokens: `#18191b` background, `#212326` surface, `#f1f2f3` text,
`#b2b6bc` secondary text, `#34373b` border, `#4cc9f0` accent. Amber `#dec18b` marks an unreleased
or in-development entry. No new brand palette.

**Type.** Self-hosted Geist (OFL) for all prose and UI. Monospace only for versions, identifiers,
runtime constraints, and the future deep-link request. Type scale follows zDeck's compact 13px
base with a restrained display size; no separate display face.

**Layout.** A single left-aligned reading column, max ~1000px, with a header that mirrors zDeck's
topbar instead of a marketing hero.

```
┌─ zDeck / Plugins ─────────────────────────────── prototype ┐
│ Plugins for zDeck.                 [ search… ] [tags]      │
│ Honest state line: 2 entries · 0 installable               │
├─────────────────────────────────────────────────────────────┤
│ [key] Spotify              0.1.0   Preview · no download →  │
│ [key] Home Assistant              In development · no download
├─────────────────────────────────────────────────────────────┤
│ detail: back · name/version/status · README reading column  │
│                                        install panel (right)│
└─────────────────────────────────────────────────────────────┘
```

Entries are rows, not detached cards: a recessed key-like icon well, name and one-line summary,
then compact metadata. This echoes a deck's keys and keeps scanning fast. On narrow screens the
rows stack metadata below the title; the detail install panel follows the README.

**Principles.**
- Availability is the loudest fact, not an afterthought. “Preview · no download” and “In
  development · no download” appear before any install control.
- The install control is visibly unavailable until a genuine `.zdx` archive and signed registry
  record exist. Nothing on the page implies that clicking it installs code.
- Metadata earns its space: source, licence, runtime, platform. Presentation extras are optional.
- Tags and search are small, local, and keyboard-accessible. The empty result explains how to
  clear the filter.
- The README is content, not remote content: it comes from the registry checkout at build time and
  renders without raw HTML, remote images, iframes, or executable links.

## Check against the north star

- Not a broadsheet or card marketplace: one column, short rules, key-like row wells.
- No numbered steps or eyebrow labels: the content is a catalog, not a sequence.
- Accent is used for focus and selection only; amber is reserved for honest unavailability.
- The page can be read top-to-bottom with one install decision, or skimmed by name and status.

## States to build and show in Storybook

Directory default, filtered, no matches, narrow; detail preview, in-development/pending release;
registry error; narrow detail. Stories use local fixtures only.

## Inspiration observations (checked 2026-11-26)

- **pi.dev/packages** (liked): a compact catalogue with “Recently published” then “All packages”,
  free-text search, type and sort filters, and rows containing name, one-line summary, author,
  relative time, package type, and copyable install command. The detail page leads with the README
  and also shows manifest JSON, version, published date, author, licence, size, dependencies, and a
  security note. We keep the scannable list and the README-led detail; we omit downloads, “report”,
  and install-command affordances because this registry has no package host yet.
- **search.nixos.org/packages?query=discord** (liked): the page is a JavaScript app. Once rendered,
  it shows a result count (“Showing results 1-38 of 38 packages”), sort control, and a left rail of
  facets: package sets, licences, maintainers, platforms, categories, and broken/deprecated status.
  Each result expands to show version, outputs, homepage, source, and licence. We borrow the dense
  metadata and explicit status, but keep one local tag filter and no facet panel: the catalogue is
  currently two entries, and facet chrome would be larger than the content.
- **Typst Universe submission** (disliked friction): the public submit URL we tried returned 404,
  so we read the repository guidance. A submission is a Git PR that copies the package into
  `packages/preview/{name}/{version}`; it requires a manifest plus README, a matching licence file,
  naming rules, size review, and security review. Once merged it may take up to 30 minutes to
  appear, and packages are effectively not removed. This registry keeps one JSON record per plugin
  and reuses the plugin's existing repository README instead of duplicating package files, a
  README, and a licence form into a versioned directory.

We did not find a usable rendered page at the Typst submit URL, and did not invent its contents.

