import { describe, expect, it } from "vitest";
import { DEFAULT_DIRECTORY, directorySearch, parseDirectoryState, selectPlugins, SORTS, type DirectoryState } from "../src/lib/directory";
import { parseRegistry, isRegistryDate } from "../src/lib/registry";
import { DIRECTORY_FIXTURES as plugins } from "../src/stories/directoryFixtures";

const ids = (patch: Partial<DirectoryState> = {}, entries = plugins) => selectPlugins(entries, { ...DEFAULT_DIRECTORY, ...patch }).map((plugin) => plugin.id);

describe("local directory selection", () => {
  it("ranks exact, prefix and name matches above tags and summaries", () => {
    expect(ids({ query: " ECHO " })).toEqual(["echo", "echo-tools", "deck-echo", "media-bridge", "audio-pad"]);
    expect(ids({ query: "echo tools" })).toEqual(["echo-tools"]);
    expect(ids({ query: "echo media" })).toEqual(["audio-pad", "echo", "echo-tools", "media-bridge"]);
    expect(ids({ query: "missing" })).toEqual([]);
  });
  it("uses alphabetical order without a query and honors explicit sort with one", () => {
    expect(ids()).toEqual(["audio-pad", "deck-echo", "echo", "echo-tools", "media-bridge", "unknown"]);
    expect(ids({ query: "echo", sort: "githubStars" })).toEqual(["echo-tools", "audio-pad", "echo", "deck-echo", "media-bridge"]);
    expect(ids({ query: "echo", order: "asc" })).toEqual(["audio-pad", "media-bridge", "deck-echo", "echo-tools", "echo"]);
  });
  it("combines query with OR within facets and AND between facets", () => {
    expect(ids({ query: "echo", categories: ["media", "smart-home"], origins: ["community"] })).toEqual(["echo-tools", "deck-echo", "media-bridge", "audio-pad"]);
    expect(ids({ origins: ["official"] })).toEqual(["echo"]);
    expect(ids({ origins: ["official", "community"], categories: ["utilities"] })).toEqual(["echo-tools", "unknown"]);
    expect(ids({ categories: ["nonexistent"] })).toEqual([]);
  });
  for (const sort of ["downloads", "githubStars", "updatedAt", "addedAt"] as const) {
    for (const order of ["asc", "desc"] as const) {
      it(`sorts ${sort} ${order}, unknowns last and ties deterministically`, () => {
        const metric = sort === "downloads" || sort === "githubStars";
        const values = [2, undefined, 1, 2, undefined];
        const entries = values.map((value, i) => ({
          ...plugins[0], id: `p-${i}`, name: i === 3 ? "Alpha" : `Plugin ${i}`,
          [sort]: value === undefined ? undefined : metric
            ? { count: value, asOf: "2026-01-01", source: "https://example.invalid/metrics" }
            : `2026-01-0${value}`,
        }));
        expect(ids({ sort, order }, entries)).toEqual(order === "asc" ? ["p-2", "p-3", "p-0", "p-1", "p-4"] : ["p-3", "p-0", "p-2", "p-1", "p-4"]);
      });
    }
  }
  it("keeps a genuine zero distinct from missing counts", () => {
    expect(ids({ sort: "downloads", order: "asc" })).toEqual(["deck-echo", "echo-tools", "audio-pad", "echo", "media-bridge", "unknown"]);
  });
  it("sorts names locale-aware with stable IDs for equivalent names", () => {
    const entries = ["z", "a", "b"].map((id) => ({ ...plugins[0], id, name: id === "z" ? "Zulu" : id === "a" ? "Écho" : "echo" }));
    expect(ids({ sort: "name", order: "asc" }, entries)).toEqual(["a", "b", "z"]);
    expect(ids({ sort: "name", order: "desc" }, entries)).toEqual(["z", "a", "b"]);
  });
  it("never infers official authorship from names or repository URLs", () => {
    const unclassified = { ...plugins[0], provenance: undefined, author: "zDeck", repo: "https://github.com/ZaneH/zdeck" };
    expect(ids({ origins: ["official"] }, [unclassified])).toEqual([]);
    expect(ids({ origins: ["community"] }, [unclassified])).toEqual(["echo"]);
  });
  it("does not mutate the catalogue", () => {
    const original = plugins.map((p) => p.id);
    for (const sort of SORTS) ids({ sort });
    expect(plugins.map((p) => p.id)).toEqual(original);
  });
});

describe("optional metadata trust boundary", () => {
  const valid = (patch: Record<string, unknown>) => parseRegistry({ schemaVersion: 1, plugins: [{ ...plugins[0], author: undefined, ...patch }] }, new Set(["fictional.md"]));
  it("accepts 500 records and rejects a larger or partly malformed catalogue as a whole", () => {
    const entries = Array.from({ length: 500 }, (_, index) => ({ ...plugins[0], id: `test-${index}`, author: undefined }));
    expect(parseRegistry({ schemaVersion: 1, plugins: entries }, new Set(["fictional.md"])).ok).toBe(true);
    expect(parseRegistry({ schemaVersion: 1, plugins: [...entries, { ...entries[0], id: "overflow" }] }, new Set(["fictional.md"])).ok).toBe(false);
    expect(parseRegistry({ schemaVersion: 1, plugins: [...entries.slice(0, 499), { ...entries[499], downloads: { count: -1 } }] }, new Set(["fictional.md"])).ok).toBe(false);
  });
  it("accepts complete optional snapshots and curated provenance", () => {
    const result = valid({ addedAt: "2024-02-29", updatedAt: "2026-01-01T12:30:00.000Z" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.registry.plugins[0].downloads?.count).toBe(1200);
    expect(valid({ provenance: undefined, downloads: undefined, githubStars: undefined, addedAt: undefined, updatedAt: undefined }).ok).toBe(true);
  });
  it("rejects malformed dates instead of silently rolling the calendar forward", () => {
    for (const value of ["2025-02-29", "2024-02-30", "2026-04-31", "2026-13-01", "2026-1-1", "2026-01-01T00:00:00Z", "2026-01-01T25:00:00.000Z", "2026-01-01T00:00:00.000+01:00", "2026-01-01 ", "yesterday", null, 0]) {
      expect(isRegistryDate(value), String(value)).toBe(false);
      expect(valid({ addedAt: value }).ok).toBe(false);
      expect(valid({ updatedAt: value }).ok).toBe(false);
    }
  });
  it("rejects invalid or unsubstantiated official classification", () => {
    for (const provenance of [null, "official", { kind: "verified" }, { kind: "official" }, { kind: "official", evidence: "http://example.com" }, { kind: "community", evidence: "javascript:alert(1)" }, { kind: "official", evidence: "https://example.com", endorsed: true }]) {
      expect(valid({ provenance }).ok).toBe(false);
    }
    expect(valid({ provenance: { kind: "community" } }).ok).toBe(true);
  });
  for (const key of ["downloads", "githubStars"]) {
    it(`rejects unsafe ${key} snapshots`, () => {
      const snapshot = { count: 0, asOf: "2026-01-01", source: "https://example.com/metrics" };
      expect(valid({ [key]: snapshot }).ok).toBe(true);
      for (const value of [null, 0, ...[-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "4"].map((count) => ({ ...snapshot, count })), { ...snapshot, asOf: "2026-02-30" }, { ...snapshot, source: "http://example.com" }, { ...snapshot, extra: true }, { count: 3 }]) {
        expect(valid({ [key]: value }).ok).toBe(false);
      }
    });
  }
});

describe("directory URL state", () => {
  it("round-trips query, combined filters, sort and direction through detail/back links", () => {
    const state: DirectoryState = { query: "echo & audio", categories: ["media", "smart-home"], origins: ["community", "official"], sort: "downloads", order: "asc" };
    const search = directorySearch(state);
    expect(parseDirectoryState(`#/${search}`)).toEqual(state);
    expect(parseDirectoryState(`#/plugin/echo${search}`)).toEqual(state);
    expect(directorySearch(DEFAULT_DIRECTORY)).toBe("");
  });
  it("ignores malformed options and deduplicates facets", () => {
    expect(parseDirectoryState("#/?sort=evil&order=evil&origin=evil&origin=official&origin=official&category=media&category=media&category=../secret")).toEqual({ ...DEFAULT_DIRECTORY, origins: ["official"], categories: ["media"] });
    expect(parseDirectoryState(`#/?q=${"x".repeat(300)}`).query).toHaveLength(200);
  });
});
