# Directory UI verification

Checked locally on 2026-11-28, using the built static site and Storybook with installed headless
Brave on macOS. Browser evidence only: no third-party plugin or theme code and no native install
flow ran.

## Commands

```sh
npm test
npm run typecheck
npm run build
npm run storybook:build
CHROME_BIN="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npm run smoke
CHROME_BIN="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npm run smoke:directory
```

- Tests: 97 Vitest tests across 10 files plus 15 Python tests. Coverage includes the existing
  plugin README safety/release/install gates, plugin directory behavior, and the new theme parser
  exact-key/path/commit/README/preview rejection cases, theme kind facets, route parsing, preview
  file signature/dimension/size/symlink checks, and theme UI (no install button or theme deep link).
- Typecheck, production build and Storybook build passed. Storybook reports its large generated
  preview chunk warning and Node's `module.register()` deprecation warning; neither blocks builds.
- Existing plugin smoke passed: search/empty/detail, disabled preview installation, safe README,
  narrow.
- Theme smoke passed: category switch and `aria-current`, detail/back with preserved search,
  both built-in rows, local 1200×800 thumbnails, detail previews at 1200×800 and 390×844 with alt,
  exact Appearance guidance, no theme install button, no theme `zdeck://` link, and 390px overflow.
- `npm run submission:theme` was exercised locally for a throwaway source-preview bundle; the
  generated record/README/previews then passed the same whole-catalogue build validation. Nothing
  was signed, uploaded, published or installed.
- Directory smoke passed: real detail/back links, browser Back, reload, root navigation reset,
  menu arrow/Home/End/Escape focus, checkbox keyboard interaction, filter selection count and
  Escape restoration, ranked fictional results and explicit GitHub-star sorts.
- Browser smoke observed **zero external HTTP requests and zero page errors**. The script blocks
  and records external requests; it does not authorize third-party calls.

## Layout and screenshots

At 1280px the filter rail is 184px wide, x=148..332; results are x=360..1132 (772px). At 390px,
results are 358px wide; at 320px, 288px. Document scroll width exactly matched viewport width at
1280, 390 and 320px, with filters open and closed. Fictional long/unbroken names and a maximum
safe-integer count also fit both narrow viewports without document overflow.

Generated screenshots (local `/tmp` evidence, not production assets):

- `/tmp/zdeck-registry-themes-narrow.png`
- `/tmp/zdeck-registry-theme-detail-narrow.png`
- `/tmp/zdeck-directory-desktop.png`
- `/tmp/zdeck-directory-390.png`
- `/tmp/zdeck-directory-390-filters.png`
- `/tmp/zdeck-directory-320.png`
- `/tmp/zdeck-directory-320-filters.png`
- `/tmp/zdeck-directory-fictional-stars.png`
- `/tmp/zdeck-directory-fictional-long-390.png`
- `/tmp/zdeck-directory-fictional-long-320.png`
- `/tmp/zdeck-registry-smoke-narrow.png` (existing smoke)

The fictional screenshots have an explicit fixture banner; their metrics are not real plugins.

## Search timing evidence—not a performance guarantee

The reproducible directory smoke uses the **built Storybook** 500-record fictional catalogue.
It measures from a native input event to matching rendered row count, checked at an animation
frame, including React/rendering work—not just the filter function. Twenty query samples cycle
through 0, 1, 15 and 176 matching rows, clearing to 500 between each query.

One local run:

| Interaction | Samples | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Query to 0/1/15/176 rows | 20 | 14.4ms | 28.3ms | 31.8ms |
| Clear and recreate up to 500 rows | 20 | 66.2ms | 118.4ms | 161.6ms |

These are local headless Brave observations, not universal device/browser latency claims or a
paint/compositor benchmark. Search has no intentional delay or network dependency. Recreating
500 rows is more expensive than narrowing results; no virtualization or search dependency was
added for this bounded catalogue.

## Limits

Real download/star counts and plugin-update dates remain absent. Optional metadata only accepts
attributable snapshots; no backend, analytics or importer/feed was introduced. Preview and
in-development entries remain unavailable for install. Native app/phone/hardware, screen-reader
software, other browser engines and Docker deployment were not exercised for this UI change.
See [registry.md](registry.md) for the classification and snapshot policy.
