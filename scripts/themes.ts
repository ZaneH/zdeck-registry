// Build-time preview checks only. Images are never executed or decoded into the page.
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseThemeFiles, PREVIEW_DIMENSIONS, PREVIEW_LIMIT, type ThemeRecord } from "../src/lib/themes.ts";

const ID = /^[a-z][a-z0-9-]{0,63}$/;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Header-only dimensions. This is not a full image-safety scan. */
// shortcut: PNG signature/IHDR only, upgrade if the registry ever processes untrusted decoded images
function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG)
    || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("not a PNG with a valid signature and IHDR header");
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Rejects missing previews, stray files, symlinks, oversized images and wrong dimensions.
 * Returns the catalogue-relative paths the theme parser may reference.
 */
export function validateThemePreviews(root: string): Map<string, { width: number; height: number }> {
  const directory = resolve(root, "registry/previews");
  if (!existsSync(directory)) throw new Error("registry/previews is missing; theme records need local preview PNGs.");
  const directoryStat = lstatSync(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error("registry/previews: expected a regular non-symlink directory.");
  }
  const available = new Map<string, { width: number; height: number }>();
  for (const id of readdirSync(directory).sort()) {
    const folder = join(directory, id);
    const stat = lstatSync(folder);
    if (stat.isSymbolicLink() || !stat.isDirectory() || !ID.test(id)) {
      throw new Error(`registry/previews/${id}: expected a regular theme-id directory.`);
    }
    const names = readdirSync(folder).sort();
    for (const name of names) {
      const path = join(folder, name);
      const file = lstatSync(path);
      const kind = name === "desktop.png" ? "desktop" : name === "phone.png" ? "phone" : null;
      if (file.isSymbolicLink() || !file.isFile() || !kind) {
        throw new Error(`registry/previews/${id}/${name}: expected desktop.png or phone.png as a regular non-symlink file.`);
      }
      if (file.size === 0 || file.size > PREVIEW_LIMIT) {
        throw new Error(`registry/previews/${id}/${name}: must be 1 byte to 2 MiB.`);
      }
      const bytes = readFileSync(path);
      if (bytes.length === 0 || bytes.length > PREVIEW_LIMIT) {
        throw new Error(`registry/previews/${id}/${name}: must be 1 byte to 2 MiB.`);
      }
      let dimensions;
      try {
        dimensions = pngDimensions(bytes);
      } catch (error) {
        throw new Error(`registry/previews/${id}/${name}: ${(error as Error).message}.`);
      }
      const expected = PREVIEW_DIMENSIONS[kind];
      if (dimensions.width !== expected.width || dimensions.height !== expected.height) {
        throw new Error(`registry/previews/${id}/${name}: expected ${expected.width}x${expected.height}, got ${dimensions.width}x${dimensions.height}.`);
      }
      available.set(`previews/${id}/${name}`, dimensions);
    }
    for (const name of ["desktop.png", "phone.png"]) {
      if (!names.includes(name)) throw new Error(`registry/previews/${id}/${name}: missing.`);
    }
    if (names.length !== 2) throw new Error(`registry/previews/${id}: only desktop.png and phone.png are allowed.`);
  }
  return available;
}

function boundedFile(path: string, max: number): Buffer {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max) throw new Error(`${path}: expected a regular non-symlink file no larger than ${max} bytes.`);
  return readFileSync(path);
}

/**
 * Validates the whole theme catalogue, its READMEs and its local previews before a build is emitted.
 * Theme records still have no release, runtime, package or install field.
 */
export function buildThemes(root: string): ThemeRecord[] {
  for (const path of ["registry/themes", "registry/theme-readmes", "registry/previews"]) {
    const stat = lstatSync(resolve(root, path));
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${path}: expected a regular directory.`);
  }
  if (existsSync(resolve(root, "registry/themes.json"))) throw new Error("registry/themes.json is not a catalogue input; use one record per file.");
  const previews = validateThemePreviews(root);
  const readmes = new Set(readdirSync(resolve(root, "registry/theme-readmes")));
  const filenames = readdirSync(resolve(root, "registry/themes")).sort();
  if (filenames.length > 500) throw new Error("Theme catalogue exceeds 500 records.");
  const files = Object.fromEntries(filenames.map((name) => {
    if (!/^[a-z][a-z0-9-]{0,63}\.json$/.test(name)) throw new Error(`registry/themes/${name}: expected <id>.json.`);
    return [name, JSON.parse(boundedFile(resolve(root, "registry/themes", name), 16 * 1024).toString("utf8"))];
  }));
  const parsed = parseThemeFiles(files, readmes, new Set(previews.keys()));
  if (!parsed.ok) throw new Error(parsed.error);
  const referencedPreviews = new Set(parsed.themes.themes.flatMap((theme) => [theme.preview.desktop.src, theme.preview.phone.src]));
  const referencedReadmes = new Set(parsed.themes.themes.map((theme) => theme.readme));
  for (const theme of parsed.themes.themes) {
    boundedFile(resolve(root, "registry/theme-readmes", theme.readme), 64 * 1024);
  }
  for (const path of previews.keys()) {
    if (!referencedPreviews.has(path)) throw new Error(`Unreferenced theme preview: ${path}.`);
  }
  for (const name of readmes) {
    if (!referencedReadmes.has(name)) throw new Error(`Unreferenced theme README: ${name}.`);
  }
  return parsed.themes.themes;
}
