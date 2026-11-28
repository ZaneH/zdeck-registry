import { describe, expect, it } from "vitest";
import glass from "../registry/themes/glass.json";
import terminal from "../registry/themes/terminal.json";
import { DEFAULT_DIRECTORY, parseDirectoryState, selectThemes } from "../src/lib/directory";
import { parseThemeFiles, parseThemes, themeAvailability, themeKindLabel } from "../src/lib/themes";

const READMES = new Set(["glass.md", "terminal.md"]);
const PREVIEWS = new Set(["previews/glass/desktop.png", "previews/glass/phone.png", "previews/terminal/desktop.png", "previews/terminal/phone.png"]);
const raw = () => structuredClone([glass, terminal]) as Record<string, unknown>[];

function parse(entries: unknown) {
  return parseThemes(entries, READMES, PREVIEWS);
}

function valid(): Record<string, unknown> {
  return structuredClone(glass) as unknown as Record<string, unknown>;
}

function expectRejected(theme: Record<string, unknown>) {
  expect(parse([theme]).ok).toBe(false);
}

describe("theme catalogue validation", () => {
  it("accepts the two built-in seeds and no installable theme state", () => {
    const result = parseThemeFiles({ "glass.json": glass, "terminal.json": terminal }, READMES, PREVIEWS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.themes.themes.map((theme) => theme.id)).toEqual(["glass", "terminal"]);
      expect(result.themes.themes.map(themeKindLabel)).toEqual(["Included in zDeck", "Included in zDeck"]);
      expect(result.themes.themes.map(themeAvailability)).toEqual([
        "Included in zDeck. Choose it in Appearance; there is nothing to download.",
        "Included in zDeck. Choose it in Appearance; there is nothing to download.",
      ]);
      for (const theme of result.themes.themes) {
        expect(JSON.stringify(theme)).not.toContain("zdeck://");
        expect(theme).not.toHaveProperty("release");
      }
    }
  });

  it("accepts a source preview without a builtin and rejects either half of the pair alone", () => {
    const source = valid();
    source.kind = "source-preview";
    delete source.builtin;
    const sourceResult = parse([source]);
    expect(sourceResult.ok).toBe(true);
    if (sourceResult.ok) {
      const [theme] = sourceResult.themes.themes;
      expect(theme.builtin).toBeUndefined();
      expect(themeKindLabel(theme)).toBe("Source preview");
      expect(themeAvailability(theme)).toContain("No installable theme package");
    }
    const missingBuiltin = valid();
    delete missingBuiltin.builtin;
    expectRejected(missingBuiltin);
    expectRejected({ ...valid(), kind: "source-preview" });
    expectRejected({ ...valid(), builtin: "watch" });
    expectRejected({ ...valid(), kind: "package" });
  });

  it("rejects unknown keys, including every plugin install field", () => {
    for (const key of ["release", "runtime", "install", "packages", "signatures", "version", "status", "builtinPreview"]) {
      expectRejected({ ...valid(), [key]: null });
    }
  });

  it("requires an exact full lowercase source commit", () => {
    for (const commit of ["4550363", "4550363F027F7807FD7C6537D4AEB699CFDEC9F0", " 4550363f027f7807fd7c6537d4aeb699cfdec9f0", "g".repeat(40), 42, undefined]) {
      const theme = valid();
      theme.sourceCommit = commit;
      expectRejected(theme);
    }
  });

  it("rejects preview paths outside this theme's two local PNGs", () => {
    for (const src of ["previews/other/desktop.png", "https://example.com/desktop.png", "previews/glass/desktop.svg", "../glass/desktop.png", "previews/glass/desktop.png?x=1"]) {
      const theme = valid();
      (theme.preview as Record<string, unknown>).desktop = { src, alt: "x" };
      expectRejected(theme);
    }
    const missing = structuredClone(glass) as unknown as Record<string, unknown>;
    (missing.preview as Record<string, unknown>).phone = { src: "previews/glass/phone.png", alt: "x" };
    expect(parseThemes([missing], READMES, new Set(["previews/glass/desktop.png"])).ok).toBe(false);
  });

  it("rejects an unknown fixture, malformed alt text and extra preview keys", () => {
    for (const preview of [
      { ...glass.preview, fixture: "another-deck" },
      { ...glass.preview, desktop: { ...glass.preview.desktop, alt: " " } },
      { ...glass.preview, desktop: { ...glass.preview.desktop, alt: "bad\u0007alt" } },
      { ...glass.preview, desktop: { ...glass.preview.desktop, alt: "bad\ud800alt" } },
      { ...glass.preview, phone: { ...glass.preview.phone, extra: true } },
      { ...glass.preview, extra: true },
      null,
    ]) {
      expectRejected({ ...valid(), preview });
    }
  });

  it("requires a local bounded README and rejects filenames that do not match ids", () => {
    expectRejected({ ...valid(), readme: "missing.md" });
    expectRejected({ ...valid(), readme: "../secret.md" });
    expect(parseThemeFiles({ "other.json": glass }, READMES, PREVIEWS).ok).toBe(false);
    expect(parseThemeFiles({ "glass.json": { ...glass, id: "terminal" } }, READMES, PREVIEWS).ok).toBe(false);
    expect(parseThemeFiles({ "glass.JSON": glass }, READMES, PREVIEWS).ok).toBe(false);
  });

  it("rejects duplicate ids, duplicate tags and unsafe or missing required presentation fields", () => {
    expect(parse([glass, glass]).ok).toBe(false);
    expectRejected({ ...valid(), tags: ["appearance", "appearance"] });
    expectRejected({ ...valid(), tags: ["Not A Tag"] });
    for (const key of ["name", "summary", "author"]) {
      expectRejected({ ...valid(), [key]: "   " });
    }
    expectRejected({ ...valid(), license: "" });
    expectRejected({ ...valid(), repo: "http://example.com/theme" });
    expectRejected({ ...valid(), repo: "javascript:alert(1)" });
  });

  it("validates optional curated metadata and dates without inferring them", () => {
    expect(parse([{ ...valid(), provenance: undefined, addedAt: undefined, updatedAt: undefined }]).ok).toBe(true);
    expect(parse([{ ...valid(), provenance: { kind: "community" }, addedAt: "2026-11-28", updatedAt: "2026-11-28T12:00:00.000Z" }]).ok).toBe(true);
    expectRejected({ ...valid(), provenance: { kind: "official" } });
    expectRejected({ ...valid(), provenance: { kind: "community", evidence: "http://example.com" } });
    expectRejected({ ...valid(), addedAt: "2026-02-30" });
    expectRejected({ ...valid(), updatedAt: "2026-11-28T00:00:00Z" });
  });

  it("rejects an oversized or non-array catalogue as a whole", () => {
    expect(parse(null).ok).toBe(false);
    const entries = Array.from({ length: 500 }, (_, index) => {
      const theme = structuredClone(glass) as unknown as Record<string, unknown>;
      theme.id = `fixture-${index}`;
      theme.preview = {
        fixture: "zdeck-sample-deck-1",
        desktop: { src: `previews/fixture-${index}/desktop.png`, alt: "Desktop preview" },
        phone: { src: `previews/fixture-${index}/phone.png`, alt: "Phone preview" },
      };
      return theme;
    });
    const previews = new Set(entries.flatMap((theme) => {
      const preview = (theme.preview as { desktop: { src: string }; phone: { src: string } });
      return [preview.desktop.src, preview.phone.src];
    }));
    expect(parseThemes(entries, READMES, previews).ok).toBe(true);
    expect(parseThemes([...entries, entries[0]], READMES, previews).ok).toBe(false);
    expect(parse([...raw(), raw()[0], { ...raw()[1], name: "" }]).ok).toBe(false);
  });
});

describe("theme directory selection", () => {
  const parsed = parseThemes([glass, terminal], READMES, PREVIEWS);
  if (!parsed.ok) throw new Error(parsed.error);
  const themes = parsed.themes.themes;

  it("searches names, summaries and tags and filters by kind", () => {
    expect(selectThemes(themes, { ...DEFAULT_DIRECTORY, query: "phosphor" }).map((theme) => theme.id)).toEqual(["terminal"]);
    expect(selectThemes(themes, { ...DEFAULT_DIRECTORY, query: "GLASS" }).map((theme) => theme.id)).toEqual(["glass"]);
    expect(selectThemes(themes, { ...DEFAULT_DIRECTORY, query: "appearance", origins: ["source-preview"] })).toEqual([]);
    expect(selectThemes(themes, { ...DEFAULT_DIRECTORY, categories: ["monospace"] }).map((theme) => theme.id)).toEqual(["terminal"]);
    expect(selectThemes(themes, { ...DEFAULT_DIRECTORY, origins: ["built-in"], categories: ["lilac"] }).map((theme) => theme.id)).toEqual(["glass"]);
  });

  it("round-trips theme kind facets and rejects unknown facet values", () => {
    const state = parseDirectoryState("#/themes?q=glass&category=appearance&origin=built-in&sort=name&order=asc");
    expect(state.origins).toEqual(["built-in"]);
    expect(parseDirectoryState("#/themes?origin=built-in&origin=evil").origins).toEqual(["built-in"]);
    expect(selectThemes(themes, state).map((theme) => theme.id)).toEqual(["glass"]);
  });
});
