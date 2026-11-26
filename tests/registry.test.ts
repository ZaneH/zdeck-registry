import { describe, expect, it } from "vitest";
import raw from "../registry/plugins.json";
import {
  canOfferInstall,
  filterPlugins,
  installRequestUrl,
  parseRegistry,
  readmeFor,
  README_LIMIT,
  tagsOf,
  type PluginRecord,
} from "../src/lib/registry";

const READMES = new Set(["spotify.md", "home-assistant.md"]);
const seed = () => structuredClone(raw) as { schemaVersion: number; plugins: Record<string, unknown>[] };

function parsePlugin(plugin: Record<string, unknown>) {
  return parseRegistry({ schemaVersion: 1, plugins: [plugin] }, READMES);
}

function validPlugin(): Record<string, unknown> {
  return structuredClone(seed().plugins[0]);
}

function expectRejected(plugin: Record<string, unknown>) {
  expect(parsePlugin(plugin).ok).toBe(false);
}

function published(): Record<string, unknown> {
  const plugin = validPlugin();
  plugin.status = "published";
  plugin.release = {
    url: "https://example.com/spotify-0.1.0.zdx",
    sha256: "a".repeat(64),
  };
  return plugin;
}

describe("registry validation", () => {
  it("accepts the checked-in catalogue", () => {
    const result = parseRegistry(raw, READMES);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.registry.plugins.map((plugin) => plugin.id)).toEqual(["spotify", "home-assistant"]);
    }
  });

  it("rejects a record missing its name", () => {
    const plugin = validPlugin();
    delete plugin.name;
    expectRejected(plugin);
  });

  it("rejects an empty summary and control characters", () => {
    const empty = validPlugin();
    empty.summary = "   ";
    expectRejected(empty);
    const controlled = validPlugin();
    controlled.summary = "bad\u0007summary";
    expectRejected(controlled);
  });

  it("rejects a non-HTTPS source repository", () => {
    const plugin = validPlugin();
    plugin.repo = "javascript:alert(1)";
    expectRejected(plugin);
  });

  it("rejects a non-HTTPS or non-zdx archive", () => {
    const insecure = published();
    (insecure.release as Record<string, unknown>).url = "http://example.com/spotify.zdx";
    expectRejected(insecure);

    const wrongExtension = published();
    (wrongExtension.release as Record<string, unknown>).url = "https://example.com/spotify.zip";
    expectRejected(wrongExtension);
  });

  it("rejects a malformed checksum", () => {
    const plugin = published();
    (plugin.release as Record<string, unknown>).sha256 = "abc";
    expectRejected(plugin);
  });

  it("accepts an optional signature on a release", () => {
    const plugin = published();
    (plugin.release as Record<string, unknown>).signature = { keyId: "zdeck-2026", value: "A".repeat(64) };
    expect(parsePlugin(plugin).ok).toBe(true);
  });

  it("requires a version, runtime, and archive for a published record", () => {
    const missingRelease = published();
    missingRelease.release = null;
    expectRejected(missingRelease);

    const missingRuntime = published();
    delete missingRuntime.runtime;
    expectRejected(missingRuntime);

    const missingVersion = published();
    delete missingVersion.version;
    expectRejected(missingVersion);
  });

  it("rejects an archive on an explicitly unpublished record", () => {
    const plugin = validPlugin();
    plugin.release = { url: "https://example.com/spotify.zdx", sha256: "a".repeat(64) };
    expectRejected(plugin);
  });

  it("accepts missing optional metadata", () => {
    const plugin = validPlugin();
    delete plugin.tags;
    delete plugin.platforms;
    delete plugin.runtime;
    delete plugin.version;
    expect(parsePlugin(plugin).ok).toBe(true);
  });

  it("rejects unsafe README references and unknown READMEs", () => {
    const traversal = validPlugin();
    traversal.readme = "../secret.md";
    expectRejected(traversal);

    const unknown = validPlugin();
    unknown.readme = "missing.md";
    expectRejected(unknown);
  });

  it("rejects duplicate IDs and duplicate tags", () => {
    const plugin = validPlugin();
    const duplicate = parseRegistry({ schemaVersion: 1, plugins: [plugin, plugin] }, READMES);
    expect(duplicate.ok).toBe(false);

    const duplicateTags = validPlugin();
    duplicateTags.tags = ["media", "media"];
    expectRejected(duplicateTags);
  });

  it("rejects malformed runtime constraints and tags", () => {
    const runtime = validPlugin();
    runtime.runtime = { language: "ruby", minimum: "1.0.0" };
    expectRejected(runtime);

    const minimum = validPlugin();
    minimum.runtime = { language: "node", minimum: "22" };
    expectRejected(minimum);

    const tags = validPlugin();
    tags.tags = ["Not A Tag"];
    expectRejected(tags);
  });
});

describe("install requests", () => {
  it("has no request for the unpublished seed entries", () => {
    const result = parseRegistry(raw, READMES);
    if (!result.ok) throw new Error(result.error);
    for (const plugin of result.registry.plugins) {
      expect(installRequestUrl(plugin)).toBeNull();
      expect(canOfferInstall(plugin)).toBe(false);
    }
  });

  it("builds a request only for a publishable record", () => {
    const result = parsePlugin(published());
    if (!result.ok) throw new Error(result.error);
    const plugin = result.registry.plugins[0];
    expect(installRequestUrl(plugin)).toBe("zdeck://plugins/install?id=spotify&version=0.1.0");
    // The prototype still refuses to surface it as an enabled action.
    expect(canOfferInstall(plugin)).toBe(false);
  });
});

describe("README bounds", () => {
  it("rejects a README over the size limit", () => {
    const result = parseRegistry(raw, READMES);
    if (!result.ok) throw new Error(result.error);
    const plugin = result.registry.plugins[0];
    expect(readmeFor(plugin, { [plugin.readme]: "a".repeat(README_LIMIT + 1) })).toBeNull();
    expect(readmeFor(plugin, { [plugin.readme]: "# ok" })).toBe("# ok");
  });
});

describe("directory filtering", () => {
  const result = parseRegistry(raw, READMES);
  if (!result.ok) throw new Error(result.error);
  const plugins: PluginRecord[] = result.registry.plugins;

  it("searches names, summaries, and tags without case sensitivity", () => {
    expect(filterPlugins(plugins, "SPOTIFY").map((plugin) => plugin.id)).toEqual(["spotify"]);
    expect(filterPlugins(plugins, "home").map((plugin) => plugin.id)).toEqual(["home-assistant"]);
    expect(filterPlugins(plugins, "MEDIA").map((plugin) => plugin.id)).toEqual(["spotify"]);
    expect(filterPlugins(plugins, "printer")).toEqual([]);
  });

  it("filters by tag and resets with the all tag", () => {
    expect(filterPlugins(plugins, "", "smart-home").map((plugin) => plugin.id)).toEqual(["home-assistant"]);
    expect(filterPlugins(plugins, "", "all")).toHaveLength(2);
    expect(tagsOf(plugins)).toEqual(["in-development", "macos", "media", "smart-home"]);
  });
});
