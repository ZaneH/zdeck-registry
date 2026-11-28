import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PREVIEW_DIMENSIONS, PREVIEW_LIMIT } from "../src/lib/themes";
import { buildThemes, validateThemePreviews } from "../scripts/themes";
import glass from "../registry/themes/glass.json";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** Signature and IHDR only; enough to check dimensions, not a claim of full image validation. */
function png(width: number, height: number, padding = 0): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return Buffer.concat([header, Buffer.alloc(padding)]);
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), "zdeck-theme-previews-"));
  roots.push(root);
  const previews = join(root, "registry", "previews", "glass");
  mkdirSync(previews, { recursive: true });
  writeFileSync(join(previews, "desktop.png"), png(PREVIEW_DIMENSIONS.desktop.width, PREVIEW_DIMENSIONS.desktop.height));
  writeFileSync(join(previews, "phone.png"), png(PREVIEW_DIMENSIONS.phone.width, PREVIEW_DIMENSIONS.phone.height));
  return { root, previews };
}

const run = (root: string) => () => validateThemePreviews(root);

function setupCatalogue() {
  const { root } = setup();
  mkdirSync(join(root, "registry", "themes"), { recursive: true });
  mkdirSync(join(root, "registry", "theme-readmes"), { recursive: true });
  writeFileSync(join(root, "registry", "themes", "glass.json"), JSON.stringify(glass));
  writeFileSync(join(root, "registry", "theme-readmes", "glass.md"), "# Glass");
  return root;
}

describe("theme preview files", () => {
  it("accepts the checked-in authentic previews at the exact fixture dimensions", () => {
    const available = validateThemePreviews(process.cwd());
    expect([...available.keys()].sort()).toEqual([
      "previews/glass/desktop.png", "previews/glass/phone.png",
      "previews/terminal/desktop.png", "previews/terminal/phone.png",
    ]);
    expect(available.get("previews/glass/desktop.png")).toEqual({ width: 1200, height: 800 });
    expect(available.get("previews/terminal/phone.png")).toEqual({ width: 390, height: 844 });
  });

  it("rejects wrong dimensions, missing files, stray files and non-PNG data", () => {
    for (const [name, bytes] of [
      ["desktop.png", png(960, 680)],
      ["desktop.png", png(959, 680)],
      ["desktop.png", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")],
      ["desktop.png", png(960, 680).subarray(0, 20)],
    ] as const) {
      const { root, previews } = setup();
      writeFileSync(join(previews, name), bytes);
      expect(run(root)).toThrow(/desktop\.png/);
    }

    {
      const { root, previews } = setup();
      rmSync(join(previews, "phone.png"));
      expect(run(root)).toThrow(/phone\.png: missing/);
    }
    {
      const { root, previews } = setup();
      writeFileSync(join(previews, "extra.png"), png(960, 680));
      expect(run(root)).toThrow(/extra\.png/);
    }
    {
      const { root, previews } = setup();
      writeFileSync(join(previews, "desktop.svg"), png(960, 680));
      expect(run(root)).toThrow(/desktop\.svg/);
    }
    {
      const root = mkdtempSync(join(tmpdir(), "zdeck-theme-previews-"));
      roots.push(root);
      expect(run(root)).toThrow(/registry\/previews is missing/);
    }
  });

  it("rejects oversized images, symlinked files and symlinked theme folders", () => {
    {
      const { root, previews } = setup();
      writeFileSync(join(previews, "desktop.png"), png(960, 680, PREVIEW_LIMIT));
      expect(run(root)).toThrow(/1 byte to 2 MiB/);
    }
    {
      const { root, previews } = setup();
      rmSync(join(previews, "desktop.png"));
      symlinkSync(join(previews, "phone.png"), join(previews, "desktop.png"));
      expect(run(root)).toThrow(/regular non-symlink/);
    }
    {
      const { root } = setup();
      const linked = join(root, "registry", "previews", "linked");
      symlinkSync(join(root, "registry", "previews", "glass"), linked, "dir");
      expect(run(root)).toThrow(/regular theme-id directory/);
    }
  });
});

describe("whole theme catalogue build input", () => {
  it("validates the checked-in records, READMEs and previews together", () => {
    expect(buildThemes(process.cwd()).map((theme) => theme.id)).toEqual(["glass", "terminal"]);
  });

  it("fails the build for a malformed record, oversized README, missing README or aggregate file", () => {
    {
      const root = setupCatalogue();
      writeFileSync(join(root, "registry", "themes", "glass.json"), JSON.stringify({ ...glass, release: null }));
      expect(() => buildThemes(root)).toThrow(/malformed/);
    }
    {
      const root = setupCatalogue();
      writeFileSync(join(root, "registry", "theme-readmes", "glass.md"), "x".repeat(64 * 1024 + 1));
      expect(() => buildThemes(root)).toThrow(/no larger than 65536/);
    }
    {
      const root = setupCatalogue();
      rmSync(join(root, "registry", "theme-readmes", "glass.md"));
      expect(() => buildThemes(root)).toThrow(/malformed/);
    }
    {
      const root = setupCatalogue();
      writeFileSync(join(root, "registry", "themes.json"), "[]");
      expect(() => buildThemes(root)).toThrow(/one record per file/);
    }
  });

  it("rejects orphan preview folders and unreferenced theme READMEs", () => {
    {
      const root = setupCatalogue();
      const folder = join(root, "registry", "previews", "orphan");
      mkdirSync(folder);
      for (const [kind, dimensions] of Object.entries(PREVIEW_DIMENSIONS)) {
        writeFileSync(join(folder, `${kind}.png`), png(dimensions.width, dimensions.height));
      }
      expect(() => buildThemes(root)).toThrow(/Unreferenced theme preview/);
    }
    {
      const root = setupCatalogue();
      writeFileSync(join(root, "registry", "theme-readmes", "orphan.md"), "# Unreferenced");
      expect(() => buildThemes(root)).toThrow(/Unreferenced theme README/);
    }
  });

  it("fails the build for a symlinked record or README", () => {
    {
      const root = setupCatalogue();
      const record = join(root, "registry", "themes", "glass.json");
      const copy = join(root, "registry", "themes", "copied.json");
      writeFileSync(copy, JSON.stringify(glass));
      rmSync(record);
      symlinkSync(copy, record);
      expect(() => buildThemes(root)).toThrow(/regular non-symlink/);
    }
    {
      const root = setupCatalogue();
      const readme = join(root, "registry", "theme-readmes", "glass.md");
      const copy = join(root, "registry", "theme-readmes", "copied.md");
      writeFileSync(copy, "# Glass");
      rmSync(readme);
      symlinkSync(copy, readme);
      expect(() => buildThemes(root)).toThrow(/regular non-symlink/);
    }
  });
});
