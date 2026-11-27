# Self-hosting with Docker Compose

This is a static website, not a backend or publishing service. A preview needs only Docker Engine
and Compose v2.20+ (or Docker Desktop), Git, and enough disk/RAM to build the Node site. On a Linux
CT, the **operator** must first provision a Docker-capable container: nesting/cgroups/overlayfs and
networking must work under the host's policy. Do not disable host isolation or make a CT privileged
just to follow this guide. A VM is an alternative if the host cannot safely support nested Docker.
The images support normal x86_64 and arm64 hosts; there is no forced platform or emulation setting.

## Clone → local preview

```sh
git clone <your-reviewed-registry-repository-url> zdeck-registry
cd zdeck-registry
git switch dev
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:1431/healthz
# Open http://localhost:1431
```

No Node install, environment file, tunnel token, public domain or key is needed for this preview.
`REGISTRY_PORT=8081 docker compose up --build -d` changes the **host** port (remember the same value
for subsequent Compose commands, or put only `REGISTRY_PORT=8081` in a local untracked `.env`). The
port binds loopback, not the CT/LAN/public interface. Stop with `docker compose down`; it does not
delete the bind directories. Normal rebuild/update is again `docker compose up --build -d`.
Do not use `down -v`, prune storage, or replace `data/` as part of deployment.

The multi-stage image uses `npm ci` with the lockfile and runs tests plus the production build.
The build validates the **entire** catalogue, READMEs, trust config and all signed history before
emitting the site and exact `dist/releases/...` bytes. Invalid input fails the image build. Nothing
runs third-party plugin code. The final image contains only Nginx and static output, not Node,
build tooling, private keys or a signing service. Image tags are explicit versions, not invented
digests; maintainers should review upstream security updates and update those pins deliberately.

Nginx runs as UID/GID 101 on container port 8080 with no capabilities, no-new-privileges, a read-only
root filesystem, and a bounded 16 MiB nonexecutable `/tmp` tmpfs for PID/temp files. Logs go to
stdout/stderr; health uses unprivileged HTTP. Files and directories under `data/` must be readable
by that UID (normally files 0644, directories 0755); **do not** fix permission errors with 0777.
Hosts enforcing SELinux need an operator-reviewed bind-mount labeling policy. The service never
writes to these mounts and cannot publish or repair files.

## What is baked in, what survives updates

| Input / output | Location | Change path |
| --- | --- | --- |
| Catalogue, README, public trust/app-ready assertion | Git `registry/`, compiled into site | Review, test and rebuild image; no runtime JSON override |
| Signed source records, including history | Git `registry/releases/`, verified and emitted by build | Offline maintainer workflow, then deliberate retention below |
| Served immutable signed JSON | Host `data/releases/<id>/<version>.json` → `/releases/...` | Retain verified bytes; never overwrite |
| Served immutable prebuilt ZIP | Host `data/artifacts/<id>/<version>.zdx` → `/artifacts/...` | Retain checked bytes; never overwrite |

`data/` is operator-owned public storage, ignored by Git and excluded from the Docker context.
Back it up separately and keep it across checkouts/CT moves. Do not mount `dist/`: replacing a
checkout or rebuilding Vite must not wipe public history. The server has **one** release source:
the read-only public mounts. Although the image build also emits records, there is deliberately
no image fallback, startup copy, merge, deletion, runtime catalogue loader or unchecked metadata
API. An empty preview has empty public directories and returns 404 for release/archive lookups.
An image recreation alone never adds, mutates or removes hosted releases.

Treat host write access to `data/` as publication authority. Use only the checked retention path,
not ad-hoc file copying or a writable upload share. Nginx cannot cryptographically validate host
files; the desktop independently verifies signatures and archive hashes on every explicit request.
A host administrator can change mounted bytes, so filesystem access, backups and publication
review remain part of the trust boundary.

## Deliberate public release deployment (NOT run by Compose)

First follow [releases.md](releases.md) to review a real self-contained `.zdx`, prepare facts,
sign **offline** with an explicitly supplied external key, and verify the result. No private key
belongs in this checkout, Docker context, build secret, image, environment or running container.
Do not use a tunnel token as an application secret. The retention command does not sign anything.

For this hosting layout sign the final artifact URL as
`https://<your-public-registry-host>/artifacts/<id>/<version>.zdx`. Lookup base is
`https://<your-public-registry-host>/`, yielding `/releases/<id>/<version>.json`. These must be final
public HTTPS URLs, not redirecting download links. Add reviewed public keys, public signed records,
README and matching published catalogue facts to Git per the release guide. Keep `ready:false`
until the independent desktop/publication/native QA gates pass.

On a controlled **maintainer host with Node 22.18+**, stage archives outside the checkout as
`/reviewed/staging/artifacts/<id>/<version>.zdx`. Then, only when deliberate publication is authorized:

```sh
npm ci --no-audit --no-fund
npm test && npm run typecheck && npm run build
# --archives is the root containing <id>/<version>.zdx, NOT a ZIP or a URL.
# --output is the persistent public root actually bound by Compose.
npm run release -- retain --root "$PWD" \
  --archives /reviewed/staging/artifacts --output "$PWD/data"
docker compose up --build -d
```

`retain` revalidates the entire catalogue and signed history, verifies archive sizes/SHA-256/ZIP
magic, and requires exactly the `/artifacts/<id>/<version>.zdx` URL path. It preflights **all** existing
public records/archives against that validated Git history; unknown/changed files or symlinks fail
without overwriting or deleting anything. Keep historical signed records in Git and historical
archives in staging (the existing `data/artifacts` may itself be used as staging). Unchanged bytes
are accepted on a retry. Missing files are created atomically by same-directory hard-link with
no-clobber semantics, archives before metadata. This requires a local filesystem supporting hard
links. It is not a multi-file transaction: a disk failure can leave some verified files published;
fix capacity/permissions, review leftover `.tmp` files if interrupted, and retry. Never run concurrent
writers or mutate the public directories behind the helper. There is no auto-publication on boot.

If signing happens elsewhere, run retention into an isolated output there, then transfer exact
reviewed files with a no-overwrite process, and validate again on the host with this helper before
serving. Do not delete history to pass validation. Key removal/withdrawal requires a separate,
explicit historical-retention review: this helper refuses retained records absent from verified
build input; it is not a revocation/migration tool. See the release guide's older-desktop caveat.

Self-hosting the **page** is easy; trusting a custom registry is a separate desktop build decision.
New desktop builds ship the public `zreg.zaaane.com` endpoint/key independently. They do **not**
discover or trust arbitrary self-hosted registries. Independently
configure/distribute the desktop's public endpoint and reviewed public keys as described in
[releases.md](releases.md). Never fetch trust keys from the same server to bootstrap trust. No
runtime custom-registry UI is implemented here. Spotify remains a preview; HA 0.2.0 has a genuine
signed macOS pilot record, publicly hosted bytes and a public-only deploy bundle.
`app-contract.json` is active for that exact macOS identity after public serving and
installed-handler QA; see [the exact check record](home-assistant-candidate.md).

## Existing Cloudflare Tunnel on the CT

The operator's owned public names (2026-11-27):

- `https://zreg.zaaane.com` — this registry; read-only DNS/HTTPS/page/health checks passed, and
  the HA 0.2.0 release JSON and archive serve positively. Other paths remain 404.
- `https://zdeck.zaaane.com` — the separate app website, **not** a second Compose service here
  and not verified by the registry live check.

Keep using your externally managed tunnel. No `cloudflared` container or token is needed in this
repository. On a tunnel daemon running directly on the **same CT**, add an ingress rule through
its existing administration/configuration process:

```yaml
# Fragment of the operator's EXISTING tunnel config, before its final catch-all.
ingress:
  - hostname: zreg.zaaane.com
    service: http://127.0.0.1:1431
  # ...other existing routes and the existing catch-all remain unchanged...
```

This is documentation, not a complete replacement config or authorization to change DNS/tunnels.
If `cloudflared` runs in a container, **its** `localhost` means that container, not the CT. Attach it
to an operator-managed shared Docker network and route to `http://registry:8080` using a unique
network alias if needed; or use a deliberately reachable CT host address with reviewed bind/firewall
rules. The default loopback bind cannot be reached from another CT/machine or an ordinary bridged
container. Do not solve that by exposing the registry port to the Internet. Internal HTTP is
intentional; the tunnel terminates TLS, so Nginx must not force HTTP→HTTPS redirects.

Before real publication, the operator must independently verify:

1. Public DNS is reachable by general users and resolves only to supported public unicast addresses;
   public HTTPS has a normal valid certificate on port 443. No private DNS, Access login, cookies,
   interactive challenge/WAF gate or client certificate may be needed on release/archive paths.
2. `/releases/*` and `/artifacts/*` reach the local origin unchanged: no redirects (even same-origin),
   Workers rewrites, SPA fallback, gzip/Brotli, content transformation or archive MIME guessing.
   Configure Cloudflare cache/compression rules to **bypass cache and disable compression** on those
   paths, preserve `no-transform`, and disable conflicting page/redirect/security rules there.
   Do not globally weaken site security; scope exceptions to the read-only public release paths.
3. Exact versioned JSON is direct `200 application/json`, ZIP is direct `200 application/zip`, with
   no `Content-Encoding`, and downloaded bytes match the reviewed local SHA-256. Missing/invalid
   release/archive paths must be 404, never HTML 200 or redirects. Only successful versioned paths
   have immutable cache headers; errors must never be cached as immutable (cache-poisoning risk).
   The desktop disallows non-443 public ports, queries/fragments, redirects and private addresses.

For real reviewed paths, check headers **without** `curl -L`, request `Accept-Encoding: gzip, br`,
download to a fresh temporary file and compare `sha256sum` (`shasum -a 256` on macOS). A local HTTP
check does not prove public DNS/TLS/Cloudflare behavior or desktop installation readiness.

## Checks

See [the implementation check record](self-hosting-checks.md) for historical checks and
[the current live/candidate record](home-assistant-candidate.md) for executed checks and explicit gaps.
Local builds/tests now also require Python 3.10+ (standard library); the Docker build stage
installs it, but the final static Nginx image does not contain Python.

```sh
docker compose config
npm test
npm run typecheck
npm run build
npm run storybook:build
CHROME_BIN='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npm run smoke
npm run hosting:smoke
npm run hosting:live
# After independently verifying a published local envelope/archive with release verify:
npm run hosting:live -- --record /reviewed/release.json --archive /reviewed/plugin.zdx
```

`hosting:live` only contacts `zreg.zaaane.com:443`, never arbitrary metadata hosts, credentials or
proxies. It resolves public addresses, pins one answer, validates normal TLS/SNI, sends bounded
GETs with compression advertised, and refuses redirects/encoding/wrong MIME or bytes. Without
`--record/--archive` it asserts the first HA version is still 404 and explicitly reports that
positive immutable release serving is unverified. With them it compares **exact** public JSON/ZIP
bytes and successful immutable/no-transform headers. This is a serving check, not signature or
native-handler QA. Missing additional page security headers are reported, not treated as
cryptographic install evidence. Results are JSON on stdout; save outside the checkout if desired.

`hosting:smoke` requires a running Docker daemon and local Node 22.18+. It builds this image and
uses a unique temporary Compose project, random loopback port and **owned temporary** public bind
directories. A generated in-memory fixture key signs synthetic non-installable ZIP bytes; the real
retention helper validates those fixtures. The check asserts HTTP status/MIME/exact SHA, absent
encoding/redirects, safe 404s/cache policy, site routes and health, force-recreates the container,
then rechecks bytes. It takes down only its own project and deletes only its temp directory, never
operator `data/` or volumes (`down -v` is not used). This is serving/retention evidence, not real
release publication, desktop trust, valid installable ZIP, native installation or CT compatibility.
