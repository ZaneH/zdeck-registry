# Registry design notes

## Brief

A static, Git-backed directory for zDeck plugins and themes. It should make a plugin's identity,
licence, source, runtime, and honest availability obvious before anyone is asked to install
anything. Themes are a separate catalogue: built-ins are already in zDeck and community entries are
source previews, not packages. It is not a marketplace: no accounts, ratings, reviews, telemetry, or
publishing API. Optional attributed plugin metric snapshots can be shown; there is no live download
counter, GitHub feed or theme popularity metric.

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

**Layout.** A left-aligned directory, max ~1000px, with a header that mirrors zDeck's topbar instead
of a marketing hero. The directory title is compact (26px); search is the main working surface.
A 184px left filter rail stays sticky and scrolls within the viewport; the results column uses
`minmax(0, 1fr)`. At narrow container widths the rail becomes an inline Filters disclosure with a
selection count, keyboard checkboxes and Escape-to-trigger focus restoration. Search, result count
and the adapted zDeck Dropdown sort/order controls align above dense package rows.

```
┌─ zDeck / Plugins ─────────────────────────────── prototype ┐
│ Plugins for zDeck.                                        │
│ Filters       │ [ Search plugins…                       ] │
│ □ Official    │ 2 entries / 0 installable  [Sort] [Order]  │
│ □ Community  │ [key] Name · summary · state              │
│ Categories    │       Downloads —  GitHub stars —          │
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
- Tags and search are small, local, and keyboard-accessible. Exact/prefix/name relevance leads;
  explicit sorts stay explicit. Missing metrics/dates remain unknown and sort last, not as zero.
  The empty result explains how to clear criteria. Categories are tags, not duplicate metadata.
- The README is content, not remote content: it comes from the registry checkout at build time and
  renders without raw HTML, remote images, iframes, or executable links.

## Themes category

Themes share the plugin directory's shell rather than becoming a card marketplace:

- A compact **Plugins / Themes** switch sits in the header with `aria-current="page"` on the active
  category. `#/themes` and `#/theme/<id>` sit beside the unchanged `#/` and `#/plugin/<id>` routes.
- The same left filter rail, search field, result count, sort/order controls, keyboard behavior,
  URL state and detail/back links are reused. Theme facets are **Included in zDeck** and **Source
  preview**; categories reuse tags.
- Rows keep the recessed key/row rhythm, but replace the plugin key well with a small local desktop
  preview thumbnail. They show author, summary, tags and kind. They never show a downloads or
  popularity row: there is no theme metric, so there is no `—` pretending to be one.
- Theme detail reuses the plugin detail type and panel. It adds a desktop (1200 × 800) and phone
  (390 × 844) preview of the same sample deck, each with plain-text `alt` and a small caption.
- Built-ins say **Included in zDeck**, with the exact **Settings → Appearance** choice and the
  per-section **Theme → …** override. Source previews say **Source preview** and **no installable
  package**. No theme page has an install button or a theme `zdeck://` link.
- Preview files are local, bounded, non-symlink PNGs. The page loads no submitted CSS/code and no
  remote image. Screenshots are evidence of the fixture, not a live theme runtime or an
  accessibility/performance claim.

## Check against the north star

- Not a broadsheet or card marketplace: one column, short rules, key-like row wells.
- No numbered steps or eyebrow labels: the content is a catalog, not a sequence.
- Accent is used for focus and selection only; amber is reserved for honest unavailability.
- The page can be read top-to-bottom with one install decision, or skimmed by name and status.

## States to build and show in Storybook

Plugin directory default, filtered, no matches, empty, narrow, long/unbroken names, relevance, both
publisher groups, combined categories, metric/date sorts, unknown metrics, and the 500-record
limit; plugin detail preview, in-development/pending release; registry error; narrow detail.

Theme directory default, filtered, no matches, empty, included-only, source-preview, long names,
narrow; theme detail for Glass, Wasteland Terminal and a fictional source-preview state, with a
missing README and narrow detail. Stories use local fixtures only; synthetic counts, dates,
publisher classifications and the source-preview fixture have an explicit fictional banner and
never enter the production catalogue.

Directory behavior, reproducible browser checks, screenshots and bounded search timing evidence
are recorded in [directory-checks.md](directory-checks.md).

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
  metadata and explicit status. The original two-entry UI kept one local tag filter; the requested
  directory revision now uses a compact left facet rail for publisher/category criteria, not the
  full set of platform/licence/maintainer facets. No extra data collection is needed.
- **Typst Universe submission** (disliked friction): the public submit URL we tried returned 404,
  so we read the repository guidance. A submission is a Git PR that copies the package into
  `packages/preview/{name}/{version}`; it requires a manifest plus README, a matching licence file,
  naming rules, size review, and security review. Once merged it may take up to 30 minutes to
  appear, and packages are effectively not removed. This registry keeps one JSON record per plugin
  and reuses the plugin's existing repository README instead of duplicating package files, a
  README, and a licence form into a versioned directory.

We did not find a usable rendered page at the Typst submit URL, and did not invent its contents.

