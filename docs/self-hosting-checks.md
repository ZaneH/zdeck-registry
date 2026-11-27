# Implementation check record

Local macOS development host, Node v26.12.1. These are implementation checks, not publication or
production readiness. No server, DNS, tunnel, signing-key, app-trust or zDeck app changes were made.
The existing untracked `debug-storybook.log` was left alone.

| Command | Result |
| --- | --- |
| `npm test` | PASS: 43 tests in 6 files, including retention exact bytes/idempotence/history/no-overwrite/tampering/unknown-record/symlink/path checks |
| `npm run typecheck` | PASS |
| `npm run build` | PASS: entire checked-in registry validated, static output built; seeds and not-ready contract unchanged |
| `npm run storybook:build` | PASS; existing large-chunk advisory and Node module.register deprecation warning remain |
| `CHROME_BIN='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npm run smoke` | PASS: existing browser checks, screenshot `/tmp/zdeck-registry-smoke-narrow.png` |
| `docker compose config` | PASS: default loopback port 1431, read-only mounts/rootfs, dropped capabilities, tmpfs and healthcheck |
| `REGISTRY_PORT=8081 docker compose config --format json` | PASS: host port override resolves to 8081 |
| `node --check scripts/hosting-smoke.mjs` | PASS |
| `docker compose -p zdeck-config-check -f <owned-temp>/compose.json config --quiet` | PASS: smoke-style isolated bind mounts and random loopback port resolve without starting containers |
| `git diff --check` | PASS |
| `docker version` / `docker compose version` | Client 29.6.2 and Compose v5.3.1 present; daemon connection unavailable |
| `npm run hosting:smoke` | BLOCKED at `docker info`: cannot connect to `unix:///Users/me/.docker/run/docker.sock`; no container/project/fixture data created by this attempted command |

## Bounded native-server fallback

To check actual HTTP behavior without starting/installing Docker or a global service, downloaded
Nginx **1.28.0** source over HTTPS from `https://nginx.org/download/nginx-1.28.0.tar.gz` into an owned
`mktemp` directory; configured with `--with-http_gzip_static_module` and the existing system PCRE2
include/library paths, and compiled with `make -j2`. No global install or privileged command ran.
This is a macOS source build, **not the Alpine image** and not proof of image availability/runtime.

Executed:

```sh
node --experimental-strip-types /tmp/zdeck-registry-local-nginx-check.mjs \
  /tmp/zdeck-nginx-check.VISYLy
```

The temporary harness used `retainReleases` with an in-memory generated fixture-only key and
synthetic non-installable bytes. It rewrote only config paths/logs/temp directories and the listen
address to an unused loopback port, ran `nginx -t`, then imported the committed `checkServing` from
`scripts/hosting-smoke.mjs`. **PASS:** direct HTTP 200 JSON/ZIP types, exact SHA-256, no encoding or
redirects even when requesting gzip/Brotli, invalid/missing paths 404 with no-store/no immutable,
site fallback/health; stopped/restarted only its own Nginx process and repeated checks against the
same retained bytes. Final evidence is under
`/private/tmp/zdeck-nginx-check.VISYLy/fixture-1uZocl/` (temporary, not a repository dependency).

Two initial temporary-harness attempts failed: a path-replacement ordering bug, then macOS `/tmp`
being a symlink rejected by the config's `disable_symlinks on`. Correcting the harness to use real
paths resolved them; no weakening of the serving config was needed.

**Still unverified:** Docker image build/up/health under UID 101/read-only rootfs/tmpfs, container
force-recreation persistence and smoke cleanup, actual CT kernel/nesting/storage policy, image
execution on x86_64/arm64, public DNS/TLS/Cloudflare routing/transforms, real release/trust setup and
native desktop installation. Run `npm run hosting:smoke` on the intended Docker host before exposure.
