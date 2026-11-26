# Desktop handoff (not implemented here)

This is a contract for future zDeck desktop work. **None of it exists in this repository or in the
current desktop app.** The website does not install plugins, verify signatures, download archives,
check for updates, or run plugin settings.

## Install request

A published record can produce:

```text
zdeck://plugins/install?id=<encoded id>&version=<encoded version>
```

The link is an untrusted request. The desktop must not execute it silently.

A future desktop flow should:

1. Treat the query as untrusted input and resolve the plugin from a locally verified signed
   registry snapshot, not by fetching arbitrary website content.
2. Show the plugin name, version, publisher, source repository, licence, runtime/platform
   requirements, archive URL, SHA-256, and signature status.
3. Download only over HTTPS from the recorded release URL, verify the archive SHA-256 and signature,
   and extract the ordinary ZIP `.zdx` into a temporary directory. Reject malformed archives,
   path traversal, symlinks, and unexpected executable paths.
4. Require an explicit confirmation that explains the plugin runs as a separate process with the
   user's permissions, not in a sandbox. Cancel must leave no installed files.
5. Hand the validated package to the same native installer used by drag/drop and the file picker.
   Never run install scripts or a pre-install/post-install hook.

No signature algorithm, key distribution, or immutable artifact store is implemented yet. Do not
claim “verified” in the UI until those exist and are tested.

## Manual update checks

Desktop update checks are manual and explicit. There is no polling or background install in this
registry prototype.

- Exact success result: **All packages are up to date.**
- A failed or unreachable check must be shown as a failure/unknown, not as that success string.
- A new version is a review-and-confirm action, using the same archive/signature checks as install.
- Never auto-retry an uncertain install or silently replace an installed package.

The exact success sentence belongs to the future desktop UI; the website does not run update
checks.

## Plugin settings

The desktop should show plugin-specific settings **only when the plugin declares them**. There is no
generic permissions or settings form in this registry, and no giant access questionnaire is
required to list a plugin. A plugin without declared settings gets no settings section.

## Drag/drop and file picker

A dropped `.zdx` and a `.zdx` chosen with the file picker must feed the **same** native installer:
same archive validation, same signature/checksum prompt, same confirmation, same destination rules.
There must not be a second, weaker import path.

## Handoff data

The registry can supply:

- manifest identity: `id`, `version`, `name`, `summary`, `license`, `author`
- source: `repo`
- compatibility: `platforms`, `runtime`
- artifact: `release.url`, `release.sha256`, optional `release.signature`
- documentation: the local README filename rendered by this site

The desktop remains responsible for verifying all of it. Registry JSON is not a trust root.
