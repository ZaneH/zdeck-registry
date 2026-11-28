import { isRegistryDate, readmeFor } from "./registry.ts";

export type ThemeKind = "built-in" | "source-preview";
export type BuiltinTheme = "glass" | "terminal";

/** The one curated sample-deck fixture every submitted preview must show. */
export const THEME_PREVIEW_FIXTURE = "zdeck-sample-deck-1";
export const PREVIEW_LIMIT = 2 * 1024 * 1024;
export const PREVIEW_DIMENSIONS = {
  desktop: { width: 1200, height: 800 },
  phone: { width: 390, height: 844 },
} as const;

export interface ThemePreviewImage {
  src: string;
  alt: string;
}

export interface ThemePreview {
  fixture: typeof THEME_PREVIEW_FIXTURE;
  desktop: ThemePreviewImage;
  phone: ThemePreviewImage;
}

/**
 * A theme catalogue entry documents an appearance or a reviewed source preview.
 * It is deliberately not a PluginRecord: there is no release, runtime, archive or install field.
 */
export interface ThemeRecord {
  id: string;
  name: string;
  summary: string;
  author: string;
  license: string;
  repo: string;
  readme: string;
  kind: ThemeKind;
  builtin?: BuiltinTheme;
  sourceCommit: string;
  preview: ThemePreview;
  tags?: string[];
  provenance?: { kind: "official" | "community"; evidence?: string };
  addedAt?: string;
  updatedAt?: string;
}

export interface ThemeRegistry {
  themes: ThemeRecord[];
}

export type ThemeParseResult =
  | { ok: true; themes: ThemeRegistry }
  | { ok: false; error: string };

const ID = /^[a-z][a-z0-9-]{0,63}$/;
const README = /^[a-z0-9][a-z0-9-]{0,63}\.md$/;
const COMMIT = /^[a-f0-9]{40}$/;
const BUILTINS: BuiltinTheme[] = ["glass", "terminal"];
const KINDS: ThemeKind[] = ["built-in", "source-preview"];
const KEYS = [
  "id", "name", "summary", "author", "license", "repo", "readme", "kind", "builtin",
  "sourceCommit", "preview", "tags", "provenance", "addedAt", "updatedAt",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length >= 1 && value.length <= max && !/[\p{Cc}\p{Cs}]/u.test(value);
const httpsUrl = (value: unknown): value is string => {
  if (!text(value, 2048) || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
};

function parsePreviewImage(value: unknown, id: string, kind: "desktop" | "phone", available: ReadonlySet<string>): ThemePreviewImage | null {
  if (!isRecord(value) || !exactKeys(value, ["src", "alt"]) || !text(value.alt, 200)) return null;
  const expected = `previews/${id}/${kind}.png`;
  if (value.src !== expected || !available.has(expected)) return null;
  return { src: expected, alt: value.alt };
}

function parsePreview(value: unknown, id: string, available: ReadonlySet<string>): ThemePreview | null {
  if (!isRecord(value) || !exactKeys(value, ["fixture", "desktop", "phone"])
    || value.fixture !== THEME_PREVIEW_FIXTURE) return null;
  const desktop = parsePreviewImage(value.desktop, id, "desktop", available);
  const phone = parsePreviewImage(value.phone, id, "phone", available);
  return desktop && phone ? { fixture: THEME_PREVIEW_FIXTURE, desktop, phone } : null;
}

function isProvenance(value: unknown): value is NonNullable<ThemeRecord["provenance"]> {
  return isRecord(value) && exactKeys(value, ["kind", "evidence"])
    && (value.kind === "official" || value.kind === "community")
    && (value.evidence === undefined ? value.kind !== "official" : httpsUrl(value.evidence));
}

function parseTheme(value: unknown, readmes: ReadonlySet<string>, previews: ReadonlySet<string>): ThemeRecord | null {
  if (!isRecord(value) || !exactKeys(value, KEYS)) return null;
  if (typeof value.id !== "string" || !ID.test(value.id)
    || !text(value.name, 80) || !text(value.summary, 200) || !text(value.author, 80)
    || !text(value.license, 40) || !httpsUrl(value.repo)
    || typeof value.readme !== "string" || !README.test(value.readme) || !readmes.has(value.readme)
    || !KINDS.includes(value.kind as ThemeKind)
    || typeof value.sourceCommit !== "string" || !COMMIT.test(value.sourceCommit)) return null;
  if (value.provenance !== undefined && !isProvenance(value.provenance)) return null;
  if (value.addedAt !== undefined && !isRegistryDate(value.addedAt)) return null;
  if (value.updatedAt !== undefined && !isRegistryDate(value.updatedAt)) return null;
  if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.length > 8
    || !value.tags.every((item) => typeof item === "string" && /^[a-z0-9][a-z0-9-]{0,31}$/.test(item))
    || new Set(value.tags).size !== value.tags.length)) return null;

  const kind = value.kind as ThemeKind;
  if (kind === "built-in") {
    if (!BUILTINS.includes(value.builtin as BuiltinTheme)) return null;
  } else if (value.builtin !== undefined) return null;

  const preview = parsePreview(value.preview, value.id, previews);
  if (!preview) return null;

  return {
    id: value.id, name: value.name, summary: value.summary, author: value.author,
    license: value.license, repo: value.repo, readme: value.readme,
    kind, ...(kind === "built-in" ? { builtin: value.builtin as BuiltinTheme } : {}),
    sourceCommit: value.sourceCommit, preview,
    ...(value.tags === undefined ? {} : { tags: value.tags as string[] }),
    ...(value.provenance === undefined ? {} : { provenance: value.provenance as ThemeRecord["provenance"] }),
    ...(value.addedAt === undefined ? {} : { addedAt: value.addedAt as string }),
    ...(value.updatedAt === undefined ? {} : { updatedAt: value.updatedAt as string }),
  };
}

/** Validates the whole theme catalogue and its README/preview references. No partial catalogue. */
export function parseThemes(
  entries: unknown,
  readmes: ReadonlySet<string>,
  previews: ReadonlySet<string>,
): ThemeParseResult {
  if (!Array.isArray(entries) || entries.length > 500) {
    return { ok: false, error: "Theme data is not a bounded catalogue." };
  }
  const seen = new Set<string>();
  const themes: ThemeRecord[] = [];
  for (const entry of entries) {
    const theme = parseTheme(entry, readmes, previews);
    if (!theme) return { ok: false, error: "A theme record is malformed or references an unknown README or preview." };
    if (seen.has(theme.id)) return { ok: false, error: `Duplicate theme id: ${theme.id}.` };
    seen.add(theme.id);
    themes.push(theme);
  }
  return { ok: true, themes: { themes } };
}

/** One reviewed record per file; filename identity and the whole catalogue fail closed. */
export function parseThemeFiles(
  files: Readonly<Record<string, unknown>>,
  readmes: ReadonlySet<string>,
  previews: ReadonlySet<string>,
): ThemeParseResult {
  for (const [filename, record] of Object.entries(files)) {
    if (!/^[a-z][a-z0-9-]{0,63}\.json$/.test(filename) || !isRecord(record)
      || filename !== `${record.id}.json`) return { ok: false, error: "Theme filename must match its manifest ID." };
  }
  return parseThemes(Object.values(files), readmes, previews);
}

export const themeKindLabel = (theme: ThemeRecord) =>
  theme.kind === "built-in" ? "Included in zDeck" : "Source preview";

export const themeAvailability = (theme: ThemeRecord) =>
  theme.kind === "built-in"
    ? "Included in zDeck. Choose it in Appearance; there is nothing to download."
    : "Source preview. No installable theme package exists, and this page will not install anything.";

/** Theme READMEs use the same bounded, non-executing local renderer as plugin READMEs. */
export const themeReadmeFor = (theme: ThemeRecord, readmes: Readonly<Record<string, string>>) =>
  readmeFor(theme, readmes);
