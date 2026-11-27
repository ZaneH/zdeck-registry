import { describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { buildReleases, checkArchive, compactJson, payload, retainReleases, signPayload, trust, verifyEnvelope, type Payload } from "../scripts/releases";
import interop from "./fixtures/ed25519-public-fixture.json";
import spotify from "../registry/plugins/spotify.json";
const raw = { plugins: [spotify] };

function fixture(hosted = false) {
  const root = mkdtempSync(join(tmpdir(), "zdeck-release-fixture-"));
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  // Explicitly fixture-only, generated in a private temp directory and removed in finally.
  const keyFile = join(root, "fixture-only-key.pem"); writeFileSync(keyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const config = trust({ schema: 1, ready: false, endpoint: "https://registry.example.test/v1/", keys: [{ id: "fixture-only", publicKey: Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url").toString("base64") }] });
  const archive = Buffer.from("PK\x03\x04fixture-only-not-a-real-archive");
  const p: Payload = { schema: 1, id: "spotify", version: "0.1.0", artifact: { url: hosted ? "https://registry.example.test/artifacts/spotify/0.1.0.zdx" : "https://artifacts.example.test/spotify-0.1.0.zdx", sha256: createHash("sha256").update(archive).digest("hex"), bytes: archive.length }, compatibility: { protocol: 1, runtime: "node", minimum: "22.18.0", platforms: ["macos"] }, source: { repo: raw.plugins[0].repo, commit: "a".repeat(40), license: "MIT" } };
  const envelope = signPayload(Buffer.from(JSON.stringify(p)), keyFile, "fixture-only");
  const put = (path: string, value: unknown) => { const full = join(root, path); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, typeof value === "string" ? value : JSON.stringify(value) + "\n"); };
  put("registry/app-contract.json", config); put("registry/releases/spotify/0.1.0.json", envelope); put("registry/readmes/spotify.md", "# Fixture only");
  put("registry/plugins/spotify.json", { ...raw.plugins[0], status: "published", release: { record: "releases/spotify/0.1.0.json" } });
  return { root, keyFile, config, archive, p, envelope, put, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
describe("signed release tooling", () => {
  it("validates the entire checked-in catalogue, trust contract and historical release directory", () => {
    const checked = buildReleases(process.cwd());
    // Both checked-in macOS pilots are published; each exact identity is gated by its own record.
    expect(checked.ready).toEqual(["home-assistant@0.2.0", "spotify@0.1.0"]);
    const config = trust(JSON.parse(readFileSync("registry/app-contract.json", "utf8")));
    const { release } = verifyEnvelope(compactJson(Buffer.from(checked.records.get("releases/home-assistant/0.2.0.json")!)), config);
    expect(release.compatibility.platforms).toEqual(["macos"]);
    expect(release.artifact.sha256).toBe("2bc4fde8f462feabbf91b929a9b5213eee63183972f34435b53485de225e979d");
    const spotifyRelease = verifyEnvelope(compactJson(Buffer.from(checked.records.get("releases/spotify/0.1.0.json")!)), config).release;
    expect(spotifyRelease.compatibility.platforms).toEqual(["macos"]);
    expect(spotifyRelease.artifact.sha256).toBe("4483286cdfe8fed0620879b7cca4821cd63932b8579181e79fff067b66980d8a");
    expect(spotifyRelease.source.commit).toBe("c688567f8359f6d20ff4a7ee30ba6c18e25cc963");
  });
  it("rejects legacy catalogues, filename mismatches, malformed files and symlinked records", () => {
    const f = fixture(); try {
      f.put("registry/plugins.json", { schemaVersion: 1, plugins: [] });
      expect(() => buildReleases(f.root)).toThrow();
      rmSync(join(f.root, "registry/plugins.json"));
      f.put("registry/plugins/other.json", raw.plugins[0]);
      expect(() => buildReleases(f.root)).toThrow();
      rmSync(join(f.root, "registry/plugins/other.json"));
      f.put("registry/plugins/broken.json", "{");
      expect(() => buildReleases(f.root)).toThrow();
      rmSync(join(f.root, "registry/plugins/broken.json"));
      rmSync(join(f.root, "registry/plugins/spotify.json"));
      symlinkSync(join(process.cwd(), "registry/plugins/spotify.json"), join(f.root, "registry/plugins/spotify.json"));
      expect(() => buildReleases(f.root)).toThrow();
    } finally { f.cleanup(); }
  });
  it("verifies the shared public-only Node/Rust interop fixture", () => {
    const verified = verifyEnvelope(interop.envelope, trust(interop.trust));
    expect(verified.release.id).toBe("fixture");
    expect(verified.release.source.repo).toBe("https://source.example.test/fixture-only");
  });
  it("validates every envelope and emits exact immutable bytes, only gating genuine ready platform-scoped releases", () => {
    const f = fixture(); try {
      expect(verifyEnvelope(f.envelope, f.config).release).toEqual(f.p);
      expect(buildReleases(f.root).ready).toEqual([]);
      f.put("registry/app-contract.json", { ...f.config, ready: true });
      expect(buildReleases(f.root).ready).toEqual(["spotify@0.1.0"]);
      const output = join(f.root, "output");
      execFileSync(process.execPath, ["--experimental-strip-types", "scripts/releases.ts", "build", "--root", f.root, "--output", output]);
      expect(readFileSync(join(output, "releases/spotify/0.1.0.json"), "utf8")).toBe(JSON.stringify(f.envelope) + "\n");
      expect(() => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/releases.ts", "build", "--root", f.root, "--output", output], { stdio: "pipe" })).toThrow();
      f.put("registry/releases/spotify/0.2.0.json", f.envelope);
      expect(() => buildReleases(f.root)).toThrow();
    } finally { f.cleanup(); }
  });
  it("retains verified public bytes idempotently, refuses overwrite, and preserves history", () => {
    const f = fixture(true); try {
      const archives = join(f.root, "staging"), out = join(f.root, "public");
      mkdirSync(join(archives, "spotify"), { recursive: true });
      writeFileSync(join(archives, "spotify/0.1.0.zdx"), f.archive);
      execFileSync(process.execPath, ["--experimental-strip-types", "scripts/releases.ts", "retain", "--root", f.root, "--output", out, "--archives", archives]);
      expect(readFileSync(join(out, "releases/spotify/0.1.0.json"))).toEqual(Buffer.from(JSON.stringify(f.envelope) + "\n"));
      expect(readFileSync(join(out, "artifacts/spotify/0.1.0.zdx"))).toEqual(f.archive);
      // A later catalogue may remove an entry, but verified Git-tracked history is retained.
      rmSync(join(f.root, "registry/plugins/spotify.json"));
      retainReleases(f.root, out, join(out, "artifacts"));
      writeFileSync(join(out, "releases/spotify/0.1.0.json"), "changed");
      expect(() => retainReleases(f.root, out, archives)).toThrow();
      expect(readFileSync(join(out, "releases/spotify/0.1.0.json"), "utf8")).toBe("changed");
    } finally { f.cleanup(); }
  });
  it("refuses tampered archives, unknown retained records, symlinks and incompatible hosted paths", () => {
    const f = fixture(true); try {
      const archives = join(f.root, "staging"), out = join(f.root, "public");
      mkdirSync(join(archives, "spotify"), { recursive: true });
      writeFileSync(join(archives, "spotify/0.1.0.zdx"), "tampered");
      expect(() => retainReleases(f.root, out, archives)).toThrow();
      writeFileSync(join(archives, "spotify/0.1.0.zdx"), f.archive);
      retainReleases(f.root, out, archives);
      const unknown = join(out, "releases/spotify/9.9.9.json");
      writeFileSync(unknown, JSON.stringify(f.envelope));
      expect(() => retainReleases(f.root, out, archives)).toThrow();
      rmSync(unknown);
      mkdirSync(join(out, "releases/unreviewed"));
      expect(() => retainReleases(f.root, out, archives)).toThrow();
      rmSync(join(out, "releases/unreviewed"), { recursive: true });
      const record = join(out, "releases/spotify/0.1.0.json");
      rmSync(record); symlinkSync(join(f.root, "registry/releases/spotify/0.1.0.json"), record);
      expect(() => retainReleases(f.root, out, archives)).toThrow();
    } finally { f.cleanup(); }
    const other = fixture(); try {
      expect(() => retainReleases(other.root, join(other.root, "public"), join(other.root, "staging"))).toThrow();
    } finally { other.cleanup(); }
  });
  it("refuses fake signatures, unknown keys, unknown fields and unsupported contracts", () => {
    const f = fixture(); try {
      for (const bad of [{ ...f.envelope, signature: Buffer.alloc(64).toString("base64") }, { ...f.envelope, payload: Buffer.from("{}").toString("base64") }, { ...f.envelope, keyId: "unknown" }, { ...f.envelope, schema: 2 }, { ...f.envelope, algorithm: "none" }]) expect(() => verifyEnvelope(bad, f.config)).toThrow();
      for (const bad of [ { ...f.p, schema: 2 }, { ...f.p, unknown: true }, { ...f.p, artifact: { ...f.p.artifact, bytes: 0 } }, { ...f.p, compatibility: { ...f.p.compatibility, minimum: "99.0.0" } }, { ...f.p, source: { ...f.p.source, commit: "dev" } }, { ...f.p, source: { ...f.p.source, license: "\uD800" } } ]) expect(() => payload(bad)).toThrow();
      for (const url of ["http://example.test/a.zdx", "https://user:secret@example.test/a.zdx", "https://example.test/a.zdx#", "https://127.0.0.1/a.zdx", "https://evil.local/a.zdx", "https://example.test/a.zdx?query=1"]) expect(() => payload({ ...f.p, artifact: { ...f.p.artifact, url } })).toThrow();
      for (const bytes of [Buffer.from('{"id":"a","id":"b"}'), Buffer.from(" ".repeat(32769)), Buffer.concat([Buffer.from('{"license":"'), Buffer.from([0xff]), Buffer.from('"}')])]) expect(() => compactJson(bytes)).toThrow();
      expect(() => trust({ ...f.config, ready: true, keys: [] })).toThrow();
      expect(() => trust({ ...f.config, ready: true, endpoint: null })).toThrow();
      expect(() => trust({ ...f.config, keys: [...f.config.keys, ...f.config.keys] })).toThrow();
      expect(() => verifyEnvelope(f.envelope, { ...f.config, keys: [] })).toThrow();
      expect(() => checkArchive(f.p, Buffer.from("tampered"))).toThrow();
    } finally { f.cleanup(); }
  });
  it("rejects mismatched catalogue facts, missing records and decorative signatures", () => {
    const f = fixture(); try {
      for (const mismatch of [{ version: "9.9.9" }, { repo: "https://other.example.test/" }, { license: "Other" }, { runtime: { language: "python", minimum: "3.10.0" } }, { platforms: ["Linux"] }, { release: { signature: { keyId: "fake", value: "A".repeat(64) } } }]) {
        f.put("registry/plugins/spotify.json", { ...raw.plugins[0], status: "published", release: { record: "releases/spotify/0.1.0.json" }, ...mismatch });
        expect(() => buildReleases(f.root)).toThrow();
      }
    } finally { f.cleanup(); }
  });
  it("prepares/signs/verifies via explicit external key-file CLI without overwriting or exposing it", () => {
    const f = fixture(); try {
      f.put("manifest.json", { id: "spotify", version: "0.1.0", protocolVersion: 1 });
      writeFileSync(join(f.root,"archive.zdx"), f.archive);
      const cli = (...args: string[]) => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/releases.ts", ...args], { encoding: "utf8", stdio: "pipe" });
      const p = join(f.root,"payload.json"), signed = join(f.root,"signed.json");
      expect(cli("prepare", "--manifest",join(f.root,"manifest.json"),"--archive",join(f.root,"archive.zdx"),"--runtime","node","--url",f.p.artifact.url,"--platforms","macos","--repo",f.p.source.repo,"--commit",f.p.source.commit,"--license","MIT","--output",p)).toBe("");
      expect(cli("sign","--payload",p,"--key",f.keyFile,"--key-id","fixture-only","--output",signed)).toBe("");
      expect(cli("verify","--record",signed,"--trust",join(f.root,"registry/app-contract.json"),"--archive",join(f.root,"archive.zdx"))).toBe("");
      expect(() => cli("sign","--payload",p,"--key",f.keyFile,"--key-id","fixture-only","--output",signed)).toThrow();
      expect(readFileSync(signed,"utf8")).not.toContain("PRIVATE KEY");
    } finally { f.cleanup(); }
  });
});
