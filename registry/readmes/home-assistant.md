# Home Assistant — macOS pilot 0.2.0

A real prebuilt, signed archive is published for this pilot. The website offers an untrusted
install request for this exact macOS identity; the desktop independently verifies the signed
record and archive before asking you to review and install. See the repository's
[pilot check record](https://github.com/ZaneH/zdeck-registry/blob/dev/docs/home-assistant-candidate.md).

## Compatibility and evidence

- **macOS only** in this exact signed release. Windows and Linux are explicitly rejected by the
  desktop resolver, not silently treated as supported. Their implementations remain in the app;
  verification and separate compatible releases are still required.
- Tested on macOS 27.0.1, Apple Silicon: public archive download, bundled native review and a
  fresh disabled, untrusted install of `0.2.0`, which persisted across a normal restart. Browser/OS
  deep-link delivery was checked with the app closed, running and hidden; an earlier automated
  lookup anomaly was not reproduced but remains unexplained.
- Installed Node.js **22.18.0 or newer** is required, not bundled. Forty HA/SDK tests pass using
  Node 22.18.0 and injected HTTP fakes, not real Home Assistant devices.
- Protocol 1, MIT. Exact source:
  [c688567f8359f6d20ff4a7ee30ba6c18e25cc963](https://github.com/ZaneH/zdeck/tree/c688567f8359f6d20ff4a7ee30ba6c18e25cc963/plugins/home-assistant).
- Archive: 51,614 bytes; SHA-256
  `2bc4fde8f462feabbf91b929a9b5213eee63183972f34435b53485de225e979d`.

Other macOS versions/architectures, Windows/Linux native parity, real Home Assistant device
operation and three-OS parity are not claimed. The pilot needs an app containing the
bundled-origin fix and the independently shipped registry trust root.

## What it provides

Power and brightness actions for supported lights/switches, and read-only light/switch state and
temperature snapshots. One configured Home Assistant instance per plugin. Refresh is explicit;
there is no background polling or automatic command retry. Uncertain command delivery requires
reconciliation rather than a success claim.

After installation the package stays **disabled and untrusted**. Inspect the source before
separately trusting/enabling it. Configure an origin-only Home Assistant URL and a long-lived
access token through desktop Connection settings; secrets belong in the OS credential store,
never in this registry. Plain HTTP on allowed local networks sends that token unencrypted;
prefer trusted HTTPS. This is trusted local code, **not a sandbox**.

Read the [exact source README](https://github.com/ZaneH/zdeck/blob/c688567f8359f6d20ff4a7ee30ba6c18e25cc963/plugins/home-assistant/README.md)
for supported entities, configuration, refresh/readback behavior and limitations. Installation
does not grant execution permission, connect to Home Assistant, replace an existing plugin, or
verify that a device is safe to control.
