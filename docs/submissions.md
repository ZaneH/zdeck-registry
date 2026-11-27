# Submit a plugin, not a catalogue edit

One PR targeting `dev`: `registry/plugins/<id>.json` and `registry/readmes/<id>.md`.
No account on this site, publishing API, auto-signing, or giant shared list. A source repository,
README and licence are enough documentation. Optional name/summary/author/tags may be added to
that one record, not another mandatory form. Counts/stars are not fetched or inferred; see
[registry.md](registry.md) for attributable snapshots and the no-analytics policy.

## Author: source → archive → generated bundle

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
authorization. `ready:false` stays until configured app distribution and installed native QA on
macOS, Windows and Linux pass. Community submission never auto-enables installation.

References: GitHub [manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[artifact downloads](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts),
and [token permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication).
