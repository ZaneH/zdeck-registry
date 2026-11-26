# Spotify local plugin folder

This MIT-licensed reference plugin controls Spotify desktop on macOS through local Automation. It does not use the Spotify Web API, credentials or OAuth. An installed Node.js **22.18.0 or newer** is required; Node itself is not bundled.

## Develop from this repository

`@zdeck/plugin-sdk@0.1.0` is published on the public npm registry. The plugin pins that exact version. From the repository root:

```sh
npm install --prefix plugins/spotify --ignore-scripts --no-audit --no-fund
printf '{"protocolVersion":1,"id":"dev","type":"describe"}\n' | node plugins/spotify/main.js
```

npm installs regular SDK files from the registry, not a repository-relative `file:` dependency or symlink. The lockfile records the published tarball and integrity. The project-only `.npmrc` retains `install-links=true` as a safeguard for intentional local-file experiments; normal installs use the registry package. `describe` reads only the manifest and does not access Spotify or request Automation permission.

This command updates the repository's dependency-managed `node_modules`; it does not repair a separate installed `~/.config` plugin folder. The desktop catalog still rejects SDK symlinks. For desktop installation, use the complete packaged folder below rather than an older source copy or partial SDK installation.

## Build the self-contained folder (from the repository)

Run `npm run plugin:package:spotify` from the repository root. This offline command copies the runtime files and the public SDK into `dist/plugins/spotify`. It installs nothing, makes no network request and does not execute the plugin. Build the app before packaging: the normal app build may clear `dist`.

Recipients do **not** run `npm install`. The packager copies real SDK files directly from the SDK source, not from development `node_modules`, and records the bundled SDK version (`0.1.0`); no repository-relative dependency or development lockfile is distributed.

The generated folder contains `manifest.json`, `main.js`, `spotify.js`, ESM package metadata, this README, the plugin MIT license, and the real SDK under `node_modules/@zdeck/plugin-sdk` with its own MIT license. The `.zdeck-generated` marker identifies packager-owned output. Keep the whole folder together; the source scripts alone are not a self-contained installation.

## Install and enable

1. Review the source, origin and both licenses. A plugin can access your user-level files, network and OS permissions. Stdio is not a sandbox.
2. In desktop Settings, choose **External plugin → Open plugin folder**. The default is `~/.config/zdeck/plugins` (an absolute `XDG_CONFIG_HOME` is honored on Linux).
3. Copy the complete generated `spotify` folder into that directory, so the fixed files are at `plugins/spotify/manifest.json` and `plugins/spotify/main.js`. Do not replace an existing user installation without reviewing/backing it up yourself. The packaging command never installs into your home directory.
4. Choose **Refresh**, select Spotify, acknowledge trust and **Enable plugin**. Node is detected automatically; there are no executable paths to enter. If no supported Node is found, install Node >=22.18 and Refresh.
5. Enabling reads the plugin description only. Read state is a separate intentional operation. Add actions from the editor's Plugins category, configure their integer arguments, and deliberately Run when ready. Preview remains simulated.

Only one plugin is active at a time. Disconnect before switching. Enabling is session-local, with no startup persistence, automatic polling, reconnect or action replay. Folder discovery and Refresh never execute the plugin; runtime discovery only probes Node's version.

## Provided control icons and attribution

After enabling the plugin, open a control's **Icon** picker and search **Spotify**. **spotify / Media** provides **Spotify (monochrome)** and **Spotify (original)** for any control, independently of its action. The existing Settings thumbnail and action defaults are unchanged. Both images are embedded in `manifest.json`; packaged installations need no asset files or network access. Picked images are copied into the deck and remain available after disabling the plugin.

- **Monochrome:** path from [Simple Icons' Spotify SVG](https://github.com/simple-icons/simple-icons/blob/develop/icons/spotify.svg), under [CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) ([legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode)). Source geometry is unchanged; presentation metadata was removed and a neutral `#80868e` fill added for visibility on both light and dark app surfaces. SVG image documents cannot inherit the app's `currentColor`, so this is intentionally a fixed neutral tone, not a theme-dependent color. Editable source: `assets/spotify-monochrome.svg` in the repository.
- **Original:** user-supplied `spotify.webp` from Downloads; resized from 3840×3840 to 96×96 using Pillow's `thumbnail`, then saved as lossless WebP without recoloring. Repository asset: `assets/spotify-original.webp`. The supplied file's upstream provenance/license was not provided; it is not covered by this plugin's MIT license.

Spotify and its logo are trademarks of Spotify. CC0 does not grant trademark rights, and neither logo is claimed under the plugin's MIT license. These icons identify the integration; no affiliation or endorsement is implied. Review Spotify's applicable brand terms before redistribution.

To update an embedded icon, base64-encode its asset bytes and replace the corresponding `icons[].src` data URL in `manifest.json`; keep the existing per-image and total manifest limits. The focused icon test checks asset/manifest agreement.

## Spotify and macOS permissions

Spotify must be installed at `/Applications/Spotify.app` and already open with a playable context. Play, pause, play-pause, next, previous and Spotify volume (integer 0–100) are supported. Volume is player volume, not system volume.

The first intentional Read state or Run may request Automation permission for the actual launching application to control Spotify. Allow only a launcher/plugin you trust in **System Settings → Privacy & Security → Automation**. An approval for Terminal may not apply to the desktop app. Accessibility and Full Disk Access are not required by this reference.

On timeout, disconnect, crash or an unknown outcome, check Spotify before retrying manually. A command may already have applied. There is no automatic retry. Live Spotify/Automation and real-phone operation require separate device testing.
