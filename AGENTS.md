# zDeck Registry Agent Guide

## Purpose

Maintain a static, Git-backed directory for zDeck plugins and themes. It helps a person judge a
plugin from its source, licence, runtime, platform, and honest availability before any future
install request, and judge a theme from its source, licence and fixed sample-deck previews. Plugins
and themes are separate catalogues. It is not a marketplace and not a publishing service.

## Workflow

`dev` is the default branch: iterate and preview there, and target `dev` with short-lived branches.
Promote `dev` to `production` by pull request; never edit `production` directly. There is no `main`.
Never create a remote or push/deploy unless the operator explicitly asks.

Commit completed work incrementally: one coherent, independently reviewable/revertible change per
commit, with its tests and relevant docs. Do not accumulate unrelated changes. Report every check
and every gap; never infer a result from a build that was not run.

## Invariants

- Validate both catalogues before use. A malformed, duplicate, unsafe, or README-less plugin or
  theme record fails tests/build; never serve a partial catalogue or silently drop an entry.
- Themes are their own type with exact keys. They have no release, runtime, archive, checksum,
  signature, package or install field, and no theme `zdeck://` link or install button. Built-ins
  say **Included in zDeck**; source previews say **Source preview** and remain non-installable.
- Theme previews are local regular non-symlink PNGs only, ≤2 MiB, exactly 1200×800 desktop and
  390×844 phone, on the `zdeck-sample-deck-1` fixture. Validation checks the PNG signature/IHDR
  only; never claim full image safety. No remote images, SVG, submitted CSS/code or placeholders.
  Preview images must be genuine captures, not fabricated or resized beyond the documented
  viewport.
- Never invent packages, downloads, checksums, reviews, releases, compatibility claims, or install
  successes. Mark examples and unpublished entries visibly. The seed entries stay labelled
  `preview` / `in-development` until a real archive exists.
- Do not enable install actions until a genuine prebuilt `.zdx` release and signed registry record
  exist. A `zdeck://plugins/install…` link is an untrusted request for a future desktop
  confirmation flow, not execution. The desktop must verify the signed record and archive before
  installing.
- `.zdx` is an ordinary ZIP. It must be prebuilt, self-contained, and free of install scripts.
  Never accept executable paths, install commands, or secrets from registry data. A community theme
  source preview is not a package and must not be described or shaped as one.
- READMEs are local build-time input under `registry/readmes/` and `registry/theme-readmes/`.
  Preview files are local input under `registry/previews/`. Never fetch arbitrary README or image
  URLs at runtime. Rendering must not allow raw executable HTML, remote tracking images, iframes,
  active embeds, submitted CSS/code, or `javascript:` links.
- No backend, accounts, ratings, polling, or publishing API. Search/filtering is local and small.
- Never run third-party plugin code in CI. CI has read-only permissions and no secrets.
- Do not put credentials or private data in records, READMEs, tests, or logs.

## Design invariant

Follow zDeck's visual system: self-hosted Geist, neutral gray surfaces, compact 13px base, sparing
cyan accent, restrained amber for unavailable states. Use the established tokens and button/key
surfaces; do not introduce a generic marketplace card grid or unrelated aesthetic.

Use appropriate cursors (`pointer`, `grab`/`grabbing`, `text`, `not-allowed`), visible
`:focus-visible` rings, keyboard-operable filters and disclosures, and responsive layouts down to
390px. Clickable rows must be single, real links. Empty and error states must give the next action.
Respect reduced motion. The install state must remain readable to screen readers even when the
button is disabled. Plugins/Themes category links expose `aria-current="page"`; plugin and theme
directories reuse the same search/filter/sort/URL/back conventions. Theme rows carry a local preview
thumbnail and never fake download/popularity metrics; theme detail reuses the detail type and shows
both authentic previews with plain-text alt text.

## Scope

Native desktop installation, update checks, plugin settings, drag-and-drop import and production
signing-key creation stay outside this repository. Build-time signature verification, deliberately
supplied external-key signing and immutable static release output are implemented in
`scripts/releases.ts`; see `docs/releases.md`. No secret belongs in the site or CI. Native interfaces
remain in `docs/desktop-handoff.md`; zDeck's native requirements do not apply to this static site.
Theme packages, theme signing, theme install/update and community theme execution are not defined
here. Community themes are Git-reviewed **source previews** only; built-in appearances are curated
maintainer records. Theme submission generation belongs to the separate submission tooling
(`scripts/theme_submission.py`); this repository validates the resulting records, READMEs and
previews.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run storybook:build
npm run smoke   # build first; Brave via CHROME_BIN on macOS
```

Browser smoke uses a local built site and installed Chromium-based browser. It covers the plugin
and theme categories, detail/back behavior, local preview dimensions/alt and the absence of theme
install/deep links. It does not execute plugin or theme code and makes no external requests. Report
it as browser evidence only, not native-app or desktop-install verification.
