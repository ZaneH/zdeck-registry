# Submit a plugin or theme, not a catalogue edit

Plugins and themes are separate catalogues. A plugin PR adds `registry/plugins/<id>.json` and
`registry/readmes/<id>.md`. A theme PR adds a **source preview** under `registry/themes/<id>.json`,
`registry/theme-readmes/<id>.md`, and two local preview PNGs; see
[the theme schema](themes.md).
No account on this site, publishing API, auto-signing, or giant shared list. A source repository,
README and licence are the foundation. Plugins may optionally add name/summary/author/tags to
that one record; theme source previews require name, summary and author for comparable browsing. Counts/stars are not fetched or inferred; see
[registry.md](registry.md) for attributable snapshots and the no-analytics policy.

## Submit a theme source preview

A community theme is documentation, not a package. It records reviewed source and screenshots of
the standard `zdeck-sample-deck-1` fixture. There is no theme package format, release record,
signature, runtime, install action or theme `zdeck://` link. Built-in appearances are maintainer
curation only; a community PR uses `kind: "source-preview"` with no `builtin`.

Theme authors style existing zDeck controls; they do not reimplement sliders, switches or input behavior. Use the app's [theme development guide](https://github.com/ZaneH/zdeck/blob/dev/docs/theme-development.md) and `Themes/Theme preview` Storybook fixture. The app's `npm run theme:previews` command exports the required dimensions from those real controls; copy its PNGs without cropping or resizing. Custom appearances currently require an app-source change, not installation of a theme file. Integration behavior and future widgets belong to plugins.

One PR targeting `dev`:

- `registry/themes/<id>.json`
- `registry/theme-readmes/<id>.md`
- `registry/previews/<id>/desktop.png` (exactly 1200 × 800)
- `registry/previews/<id>/phone.png` (exactly 390 × 844)

Use the local generator (implemented by the registry maintainers) with an absolute output
directory:

```sh
npm run submission:theme -- \
  --metadata /absolute/theme-metadata.json \
  --readme /absolute/README.md \
  --desktop-preview /absolute/desktop.png \
  --phone-preview /absolute/phone.png \
  --repo https://github.com/you/zdeck-theme \
  --commit FULL_40_LOWERCASE_HEX_SOURCE_COMMIT \
  --output /absolute/new-theme-submission-directory
```

`--metadata` is a JSON object with the common presentation fields:

```json
{
  "id": "example-theme",
  "name": "Example Theme",
  "summary": "A reviewed appearance shown on the standard sample deck.",
  "author": "Example Author",
  "license": "MIT",
  "tags": ["appearance", "example"]
}
```

Do **not** put `kind`, `builtin`, `repo`, `sourceCommit`, `readme` or `preview` in the metadata
file; the flags supply the repo and exact commit, and the tool generates those fields plus the two
preview objects. `tags` is optional. The generator accepts only `id`, `name`, `summary`, `author`,
`license` and `tags` in the metadata file; it rejects `provenance`, dates, `builtin`, `kind` and
release/install fields. A maintainer may add reviewed provenance or traceable dates in a separate
curated edit, not through this community generator. The tool copies the supplied PNGs to the two catalogue paths and writes plain-text preview `alt`
text from the theme name and viewport; review/edit that wording in the PR if it is not accurate.

The generated `candidate.json` and `PR.md` are review evidence, not publication. The tool creates a
new output directory with exclusive files; it does not install, sign, upload, fetch a remote asset or
open a PR. Preview input must be a regular non-symlink PNG, larger than 0 bytes and at most 2 MiB,
with the exact dimensions above. The build checks the PNG signature and IHDR header only; that is
not a claim of full image-safety validation. SVG, remote URLs, submitted CSS/code and executable
content are rejected.

Review the source commit, licence, preview accuracy and the two local PNGs, then merge the generated
record/README/previews. A source preview is never installable; do not add plugin releases or theme
install links.

## Author: plugin source → archive → generated bundle

1. Commit the reviewed source. Build a **self-contained**, root-layout `.zdx` ZIP containing
   `manifest.json`, exactly one `main.js` or `main.py`, the packaged SDK/runtime dependencies,
   `README.md` and `LICENSE`. No downloads or install/lifecycle hooks. Use zDeck's offline
   `scripts/package-zdx.mjs` / `packageZdx(absoluteFolder, absoluteOutput)` on a prebuilt folder;
   don't just zip a development tree or commit credentials. It never runs plugin code.
2. In this registry checkout, with Python 3.10+ (standard library only):

```sh
npm run submission -- --archive /absolute/prebuilt/plugin.zdx \
  --repo https://github.com/you/plugin --commit FULL_40_LOWERCASE_HEX_SOURCE_COMMIT \
  --output /absolute/new-submission-directory
```

Identity/version/protocol come from the **archived** manifest; SHA-256/size from actual bytes;
licence from archived `package.json`. Python plugins without that metadata add `--license MIT`
(or their actual identifier). No redundant author/name/platform forms. The supplied source URL
and commit are claims for review, not fetched resources or proof of source/archive equivalence.
3. Copy the generated `registry/` files into your fork/branch and open a PR targeting `dev`.
   Review changes to an existing ID rather than blindly replacing its curated metadata.
   Attach `candidate.json`, archive digest and an immutable way for the maintainer to obtain the
   exact archive. Do not put archive binaries or secrets in the catalogue PR. The bundle's
   `PR.md` gives a short body. A preview has `release:null`, no asserted runtime minimum/platforms
   and no install link; don't relabel it published yourself.

The generator validates all ZIP entries (bounded sizes/CRC, portable paths, aliases, links,
local/central header consistency), without extracting files or importing any package. It accepts
stored/deflate ZIP32 with no comments, extras, descriptors, encryption, ZIP64 or hidden bytes;
zDeck's stored-ZIP packager produces that subset. It only inspects static manifest identity and
SDK presence, **not the desktop's entire manifest/SDK validation or code safety**. Output uses a
new directory and exclusive files. Nothing is installed, trusted, enabled, signed or uploaded.

## Maintainer-run GitHub workflow (optional actual automation)

Once this workflow exists on GitHub's **default branch**, use Actions → **Prepare unsigned plugin
submission** → Run workflow on a reviewed trusted branch. Workflow dispatch requires repository
write access; fork authors normally use the local command above and open a normal PR. There is no
cross-repository auto-PR bot or hidden token setup.

For an intake run, the maintainer deliberately stages the reviewed archive at
`submissions/plugin.zdx` on a temporary **same-repository** branch, and supplies its full commit SHA,
the source repo URL and source commit (licence only if absent). The job checks out tooling from
its own workflow revision and **only reads** the submission checkout. Input values pass through
environment variables and quoted argv, not interpolated shell programs. No npm installation,
plugin execution, remote metadata URL fetch, `pull_request_target`, private key, signing secret,
PR write permission or publication occurs. Submitted scripts/actions cannot run in this job.
Do not select a workflow revision containing unreviewed changes to the workflow/tool itself.

Download `unsigned-plugin-submission-<run-id>` from that run within seven days. GitHub sign-in and
repository access are required as applicable; it is a CI download, **not** an immutable desktop
release URL. Anyone may reproduce the generator locally from the same inputs. Actions artifact
immutability is per run/artifact; retention/deletion still applies. Copy just the record/README to
a clean PR branch, attach candidate evidence, and discard the staging branch through your normal
reviewed process. The workflow does not create a PR, merge, sign or publish. Using this automation
requires an explicit future push/staging/dispatch by the operator; none was performed locally.

## Review → offline sign → static publish

PR CI validates the whole catalogue, README presence, filenames/duplicate IDs, signed history and
install gates. The ordinary site test job runs registry project code with read-only permissions
and no secrets, never submitted plugin code. Review workflow/build dependency changes separately.
Maintainers still compare source commit, licence, runtime and **actual native platform evidence**,
then run the desktop's isolated generated-artifact ZIP/install test. Archive inspection alone
cannot establish runtime compatibility. Do not invent a three-OS compatibility assertion.

Only after evidence is adequate use [releases.md](releases.md) to prepare the signable payload,
review it, deliberately sign offline with an external key, and verify against independently
reviewed public keys. Set matching catalogue facts and the signed record reference in a separate
maintainer change. Manually retain/publish immutable JSON/ZIP and deploy under separate operator
authorization. `ready:false` stays until public exact-byte hosting, configured app distribution
and installed native QA pass on every platform **claimed by the offered release**. A scoped pilot
excludes and rejects unverified platforms; it does not claim or waive three-OS parity.
Community submission never auto-enables installation.

References: GitHub [manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[artifact downloads](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts),
and [token permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication).
