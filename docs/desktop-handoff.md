# Desktop handoff (unreleased)

zDeck now implements the identity-only native link boundary and an explicitly configured signed
release resolver/downloader feeding its existing local ZIP review/installer. This static website
never installs code, runs plugins, reads settings or detects an install result. The public endpoint/key are configured with `ready:false`; no installable seeds or signed release
are published by this change. See [releases.md](releases.md) for the
matching exact signed envelope, public-key bootstrap and maintainer publication gates.

A build-verified published record with an explicitly app-ready contract may offer:

```text
zdeck://plugins/install?id=<encoded-id>&version=<encoded-exact-version>
```

The desktop accepts only bounded ID/exact version. No URLs, paths, commands or executable fields
are accepted. It shows an identity prompt, then **Look up release** for signature-verified metadata,
then **Download for review**, then **Install disabled** for the actual validated archive. It shows
registry key ID and authenticated source commit/licence/runtime/platform/artifact facts without
claiming publisher identity or safety review. Every fetch uses normal HTTPS/TLS with public DNS
validation/pinning, no redirects/proxies, bounded bodies and deadlines. Unknown keys/schema/fields,
wrong ID/version, unsupported compatibility, digest/size and ZIP/manifest mismatches fail closed.

Exact verified bytes use the same private staging, strict ZIP validation, snapshot/fingerprint
checks, serialized lifecycle and atomic no-replace installer as picker/drop. No install hooks or
plugin code run; installation remains disabled/untrusted after restart. Trust/enable are separate
explicit fingerprint decisions. Collisions are refused. Cancellation and stale/duplicate links
cannot replace an active local review or execute anything. Neither project silently registers an
OS handler or grants a website native privileges.

Release QA still needs installed handlers, closed/running/tray-hidden delivery, cancellation,
local priority, actual dialogs/drop and packaged-webview/filesystem behavior on **Windows, macOS
and Linux**. A browser test/no-bundle build is not evidence of that parity. Deliberate signing/publication,
independent public-key review, distributed configured builds and exact positive immutable hosting
checks remain maintainer prerequisites.

## Still out of scope

No polling, manual update checker or replacement flow is provided. A future explicit check must
report failure/unknown honestly, not “All packages are up to date.” Settings stay in the desktop
and appear only for plugins declaring them; there is no author questionnaire here. Downloads,
trust and enable must never be silently inferred from a website action or signature badge.
