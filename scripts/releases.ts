// Build/release tooling only. No private key is imported into the website bundle.
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseRegistry } from "../src/lib/registry.ts";

export const DOMAIN = Buffer.from("zdeck-release-v1\0");
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const KEY = /^[a-z0-9-]{1,64}$/;
const LIMIT = 16 * 1024 * 1024;
function requireThat(ok: unknown): asserts ok { if (!ok) throw new Error("Invalid release, trust configuration or catalogue. See docs/releases.md."); }
function object(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  requireThat(!!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)));
}
function text(value: unknown, max: number): asserts value is string { requireThat(typeof value === "string" && value.length > 0 && value.length <= max && !/[\p{Cc}]/u.test(value)); }
export function https(value: unknown): string {
  text(value, 2048); requireThat(/^[\x21-\x7e]+$/.test(value) && !/[\\@]/.test(value));
  const u = new URL(value);
  requireThat(u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash && !value.includes("?") && !value.includes("#") && !u.port);
  // DNS is never contacted by tooling. Desktop additionally resolves and pins only public IPs.
  requireThat(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.?$/i.test(u.hostname) && !/^[\d.]+$/.test(u.hostname) && !/\.(localhost|local|internal|home|lan)\.?$/i.test(u.hostname));
  return value;
}
export interface Payload {
  schema: 1; id: string; version: string;
  artifact: { url: string; sha256: string; bytes: number };
  compatibility: { protocol: 1; runtime: "node" | "python"; minimum: string; platforms: string[] };
  source: { repo: string; commit: string; license: string };
}
export interface Envelope { schema: 1; keyId: string; payload: string; signature: string }
export interface Trust { schema: 1; ready: boolean; endpoint: string | null; keys: { id: string; publicKey: string }[] }
export function payload(value: unknown): Payload {
  object(value, ["schema", "id", "version", "artifact", "compatibility", "source"]);
  requireThat(value.schema === 1 && typeof value.id === "string" && ID.test(value.id) && typeof value.version === "string" && VERSION.test(value.version));
  const a = value.artifact, c = value.compatibility, s = value.source;
  object(a, ["url", "sha256", "bytes"]); https(a.url);
  requireThat(new URL(a.url as string).pathname.endsWith(".zdx") && typeof a.sha256 === "string" && /^[a-f0-9]{64}$/.test(a.sha256) && Number.isSafeInteger(a.bytes) && (a.bytes as number) > 0 && (a.bytes as number) <= LIMIT);
  object(c, ["protocol", "runtime", "minimum", "platforms"]);
  requireThat(c.protocol === 1 && ["node", "python"].includes(c.runtime as string) && c.minimum === (c.runtime === "node" ? "22.18.0" : "3.10.0") && Array.isArray(c.platforms) && c.platforms.length > 0 && c.platforms.length <= 3 && new Set(c.platforms).size === c.platforms.length && c.platforms.every(p => ["macos", "windows", "linux"].includes(p)));
  object(s, ["repo", "commit", "license"]); https(s.repo); text(s.license, 40); requireThat(typeof s.commit === "string" && /^[a-f0-9]{40}$/.test(s.commit));
  return value as unknown as Payload;
}
function decode(value: unknown, bytes?: number): Buffer {
  text(value, 32768); const decoded = Buffer.from(value, "base64");
  requireThat(decoded.toString("base64") === value && (bytes === undefined || decoded.length === bytes)); return decoded;
}
export function trust(value: unknown): Trust {
  object(value, ["schema", "ready", "endpoint", "keys"]);
  requireThat(value.schema === 1 && typeof value.ready === "boolean" && Array.isArray(value.keys) && value.keys.length <= 8);
  if (value.endpoint !== null) requireThat(https(value.endpoint).endsWith("/"));
  const seen = new Set<string>();
  for (const k of value.keys) { object(k, ["id", "publicKey"]); requireThat(typeof k.id === "string" && KEY.test(k.id) && !seen.has(k.id)); decode(k.publicKey, 32); seen.add(k.id); }
  requireThat(!value.ready || (value.endpoint !== null && seen.size > 0));
  return value as unknown as Trust;
}
// Compact tooling JSON also rejects duplicate keys. Signature verification itself uses raw payload bytes.
export function compactJson(bytes: Buffer): unknown { requireThat(bytes.length <= 32768); const s = bytes.toString("utf8"); const v: unknown = JSON.parse(s); requireThat(JSON.stringify(v) === s.replace(/\n$/, "")); return v; }
export function verifyEnvelope(value: unknown, config: Trust): { envelope: Envelope; release: Payload } {
  object(value, ["schema", "keyId", "payload", "signature"]); requireThat(value.schema === 1 && typeof value.keyId === "string");
  const key = config.keys.find(k => k.id === value.keyId); requireThat(key);
  const bytes = decode(value.payload), signature = decode(value.signature, 64);
  const publicKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: decode(key.publicKey, 32).toString("base64url") }, format: "jwk" });
  requireThat(verify(null, Buffer.concat([DOMAIN, bytes]), publicKey, signature));
  return { envelope: value as unknown as Envelope, release: payload(compactJson(bytes)) };
}
export function signPayload(bytes: Buffer, keyFile: string, keyId: string): Envelope {
  payload(compactJson(bytes)); requireThat(KEY.test(keyId));
  // The deliberately supplied external file is read only here, never logged, returned or bundled.
  const key = createPrivateKey(readFileSync(keyFile)); requireThat(key.asymmetricKeyType === "ed25519");
  return { schema: 1, keyId, payload: bytes.toString("base64"), signature: sign(null, Buffer.concat([DOMAIN, bytes]), key).toString("base64") };
}
export function checkArchive(release: Payload, archive: Buffer): void {
  requireThat(archive.length === release.artifact.bytes && createHash("sha256").update(archive).digest("hex") === release.artifact.sha256 && archive.subarray(0, 4).equals(Buffer.from("PK\x03\x04")));
}
function boundedFile(path: string, max: number): Buffer {
  const stat = lstatSync(path); requireThat(stat.isFile() && !stat.isSymbolicLink() && stat.size <= max);
  const bytes = readFileSync(path); requireThat(bytes.length <= max); return bytes;
}
export function buildReleases(root: string): { records: Map<string, string>; ready: string[] } {
  for (const path of ["registry", "registry/readmes", "registry/releases"]) requireThat(lstatSync(join(root, path)).isDirectory());
  const config = trust(JSON.parse(boundedFile(join(root, "registry/app-contract.json"), 4096).toString("utf8")));
  const readmes = new Set(readdirSync(join(root, "registry/readmes")));
  const catalogue = parseRegistry(JSON.parse(boundedFile(join(root, "registry/plugins.json"), 2 * 1024 * 1024).toString("utf8")), readmes);
  requireThat(catalogue.ok); const records = new Map<string, string>(); const releases = new Map<string, Payload>();
  for (const id of readdirSync(join(root, "registry/releases"))) {
    if (id === ".gitkeep") continue;
    requireThat(ID.test(id) && lstatSync(join(root, "registry/releases", id)).isDirectory() && !lstatSync(join(root, "registry/releases", id)).isSymbolicLink());
    for (const filename of readdirSync(join(root, "registry/releases", id))) {
      const version = filename.replace(/\.json$/, ""); requireThat(filename === `${version}.json` && VERSION.test(version));
      const path = `releases/${id}/${filename}`; const bytes = boundedFile(join(root, "registry", path), 32768);
      const verified = verifyEnvelope(compactJson(bytes), config);
      requireThat(verified.release.id === id && verified.release.version === version);
      records.set(path, bytes.toString("utf8")); releases.set(path, verified.release);
    }
  }
  const ready: string[] = [];
  for (const p of catalogue.registry.plugins) {
    boundedFile(join(root, "registry/readmes", p.readme), 64 * 1024);
    if (!p.release) continue;
    const r = releases.get(p.release.record); requireThat(r);
    requireThat(r.id === p.id && r.version === p.version && r.source.repo === p.repo && r.source.license === p.license && r.compatibility.runtime === p.runtime?.language && r.compatibility.minimum === p.runtime?.minimum);
    const labels: Record<string, string> = { macOS: "macos", Windows: "windows", Linux: "linux" };
    requireThat(p.platforms && JSON.stringify(p.platforms.map(v => labels[v]).sort()) === JSON.stringify([...r.compatibility.platforms].sort()));
    if (config.ready) ready.push(`${p.id}@${p.version}`);
  }
  return { records, ready };
}
function output(file: string, value: unknown) { mkdirSync(dirname(resolve(file)), { recursive: true }); writeFileSync(file, JSON.stringify(value) + "\n", { flag: "wx", mode: 0o644 }); }
function main(args: string[]) {
  const [command, ...rest] = args; const flags = new Map<string, string>();
  requireThat(rest.length % 2 === 0); for (let i = 0; i < rest.length; i += 2) { requireThat(rest[i].startsWith("--") && !flags.has(rest[i])); flags.set(rest[i], rest[i + 1]); }
  const get = (k: string) => { const v = flags.get(`--${k}`); requireThat(v); flags.delete(`--${k}`); return v; };
  if (command === "prepare") {
    const manifest = JSON.parse(boundedFile(get("manifest"), 16384).toString("utf8"));
    const archive = boundedFile(get("archive"), LIMIT); const runtime = get("runtime");
    const release = payload({ schema: 1, id: manifest.id, version: manifest.version,
      artifact: { url: get("url"), sha256: createHash("sha256").update(archive).digest("hex"), bytes: archive.length },
      compatibility: { protocol: manifest.protocolVersion, runtime, minimum: runtime === "node" ? "22.18.0" : "3.10.0", platforms: get("platforms").split(",") },
      source: { repo: get("repo"), commit: get("commit"), license: get("license") } });
    const out = get("output"); requireThat(flags.size === 0); checkArchive(release, archive); output(out, release);
  } else if (command === "sign") {
    const bytes = boundedFile(get("payload"), 16384), key = get("key"), keyId = get("key-id"), out = get("output"); requireThat(flags.size === 0); output(out, signPayload(bytes, key, keyId));
  } else if (command === "verify") {
    const record = compactJson(boundedFile(get("record"), 32768)), config = trust(JSON.parse(boundedFile(get("trust"), 4096).toString("utf8")));
    const { release } = verifyEnvelope(record, config);
    if (flags.has("--archive")) checkArchive(release, boundedFile(get("archive"), LIMIT));
    requireThat(flags.size === 0);
  } else if (command === "build") {
    const root = resolve(get("root")), out = resolve(get("output")); requireThat(flags.size === 0);
    const { records } = buildReleases(root);
    for (const [path, bytes] of records) { const file = join(out, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes, { flag: "wx" }); }
  } else throw new Error("Use prepare, sign, verify or build; see docs/releases.md.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); } catch { console.error("Release command failed. No keys or payload data are logged. Check arguments and docs/releases.md; existing output is never overwritten."); process.exitCode = 1; }
}
