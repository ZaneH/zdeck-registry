export type PluginStatus = "preview" | "in-development" | "published";
export type RuntimeLanguage = "node" | "python";

export interface PluginRuntime {
  language: RuntimeLanguage;
  minimum: string;
}

/** Local immutable signed envelope, verified by build tooling before publication. */
export interface PluginRelease { record: string }

export interface MetricSnapshot {
  count: number;
  asOf: string;
  source: string;
}

export interface PluginRecord {
  /** Operator-curated authorship, independent of release signatures. Omitted means unclassified. */
  provenance?: { kind: "official" | "community"; evidence?: string };
  downloads?: MetricSnapshot;
  githubStars?: MetricSnapshot;
  addedAt?: string;
  updatedAt?: string;
  id: string;
  name: string;
  summary: string;
  version?: string;
  author: string;
  license: string;
  repo: string;
  platforms?: string[];
  runtime?: PluginRuntime;
  tags?: string[];
  readme: string;
  status: PluginStatus;
  release: PluginRelease | null;
}

export interface Registry {
  schemaVersion: 1;
  plugins: PluginRecord[];
}

export type ParseResult =
  | { ok: true; registry: Registry }
  | { ok: false; error: string };

const ID = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const README = /^[a-z0-9][a-z0-9-]{0,63}\.md$/;
const STATUSES: PluginStatus[] = ["preview", "in-development", "published"];
const RUNTIMES: RuntimeLanguage[] = ["node", "python"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const text = (value: unknown, max: number, min = 1): value is string =>
  typeof value === "string" && value.trim().length >= min && value.length <= max && !/\p{Cc}/u.test(value);
const httpsUrl = (value: unknown, suffix?: string) => {
  if (!text(value, 2048) || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !!url.hostname && !url.username && !url.password
    && (!suffix || url.pathname.endsWith(suffix));
};

function parseRuntime(value: unknown): PluginRuntime | null {
  if (!isRecord(value) || !exactKeys(value, ["language", "minimum"])
    || !RUNTIMES.includes(value.language as RuntimeLanguage)
    || typeof value.minimum !== "string" || !VERSION.test(value.minimum)) return null;
  return { language: value.language as RuntimeLanguage, minimum: value.minimum };
}

function parseRelease(value: unknown): PluginRelease | null {
  if (!isRecord(value) || !exactKeys(value, ["record"]) || typeof value.record !== "string"
    || !/^releases\/[a-z][a-z0-9-]{0,63}\/\d{1,4}\.\d{1,4}\.\d{1,4}\.json$/.test(value.record)) return null;
  return { record: value.record };
}

/** Only calendar dates or canonical UTC timestamps; Date.parse alone accepts impossible dates. */
export function isRegistryDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === (value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

function isMetric(value: unknown): value is MetricSnapshot {
  return isRecord(value) && exactKeys(value, ["count", "asOf", "source"])
    && typeof value.count === "number" && Number.isSafeInteger(value.count) && value.count >= 0
    && isRegistryDate(value.asOf) && httpsUrl(value.source);
}

function isProvenance(value: unknown): value is NonNullable<PluginRecord["provenance"]> {
  return isRecord(value) && exactKeys(value, ["kind", "evidence"])
    && (value.kind === "official" || value.kind === "community")
    && (value.evidence === undefined ? value.kind !== "official" : httpsUrl(value.evidence));
}

function parsePlugin(value: unknown, availableReadmes: ReadonlySet<string>): PluginRecord | null {
  if (!isRecord(value) || !exactKeys(value, [
    "id", "name", "summary", "version", "author", "license", "repo", "platforms",
    "runtime", "tags", "readme", "status", "release", "provenance",
    "downloads", "githubStars", "addedAt", "updatedAt",
  ])) return null;
  if ((value.provenance !== undefined && !isProvenance(value.provenance))
    || (value.downloads !== undefined && !isMetric(value.downloads))
    || (value.githubStars !== undefined && !isMetric(value.githubStars))
    || (value.addedAt !== undefined && !isRegistryDate(value.addedAt))
    || (value.updatedAt !== undefined && !isRegistryDate(value.updatedAt))) return null;
  if (typeof value.id !== "string" || !ID.test(value.id)
    || (value.name !== undefined && !text(value.name, 80))
    || (value.summary !== undefined && !text(value.summary, 200))
    || (value.author !== undefined && !text(value.author, 80))
    || !text(value.license, 40) || !httpsUrl(value.repo)
    || typeof value.readme !== "string" || !README.test(value.readme)
    || !availableReadmes.has(value.readme)
    || !STATUSES.includes(value.status as PluginStatus)) return null;
  if (value.version !== undefined && (typeof value.version !== "string" || !VERSION.test(value.version))) return null;
  if (value.platforms !== undefined && (!Array.isArray(value.platforms) || value.platforms.length < 1
    || value.platforms.length > 8 || !value.platforms.every((item) => text(item, 40)))) return null;
  if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.length > 8
    || !value.tags.every((item) => typeof item === "string" && /^[a-z0-9][a-z0-9-]{0,31}$/.test(item))
    || new Set(value.tags).size !== value.tags.length)) return null;
  const runtime = value.runtime === undefined ? undefined : parseRuntime(value.runtime);
  if (value.runtime !== undefined && !runtime) return null;
  const release = value.release === null ? null : parseRelease(value.release);
  if (value.release !== null && !release) return null;

  const status = value.status as PluginStatus;
  const version = value.version as string | undefined;
  // Only a published record can carry an archive; the seeds stay honestly unpublished.
  if (status === "published" && (!release || !version || !runtime || release.record !== `releases/${value.id}/${version}.json`)) return null;
  if (status !== "published" && release) return null;

  return {
    id: value.id as string,
    name: value.name === undefined ? value.id : value.name as string,
    summary: value.summary === undefined ? "" : value.summary as string,
    ...(version === undefined ? {} : { version }),
    author: value.author === undefined ? "" : value.author as string,
    license: value.license as string, repo: value.repo as string,
    ...(value.platforms === undefined ? {} : { platforms: value.platforms as string[] }),
    ...(runtime ? { runtime } : {}),
    ...(value.tags === undefined ? {} : { tags: value.tags as string[] }),
    ...(value.provenance === undefined ? {} : { provenance: value.provenance as PluginRecord["provenance"] }),
    ...(value.downloads === undefined ? {} : { downloads: value.downloads as MetricSnapshot }),
    ...(value.githubStars === undefined ? {} : { githubStars: value.githubStars as MetricSnapshot }),
    ...(value.addedAt === undefined ? {} : { addedAt: value.addedAt as string }),
    ...(value.updatedAt === undefined ? {} : { updatedAt: value.updatedAt as string }),
    readme: value.readme as string, status, release,
  };
}

/** Validates the entire registry before the site uses it. No partial catalogue. */
export function parseRegistry(value: unknown, availableReadmes: ReadonlySet<string>): ParseResult {
  if (!isRecord(value) || !exactKeys(value, ["schemaVersion", "plugins"])
    || value.schemaVersion !== 1 || !Array.isArray(value.plugins)
    || value.plugins.length > 500) return { ok: false, error: "Registry data is not a version 1 catalogue." };
  const seen = new Set<string>();
  const plugins: PluginRecord[] = [];
  for (const entry of value.plugins) {
    const plugin = parsePlugin(entry, availableReadmes);
    if (!plugin) return { ok: false, error: "A plugin record is malformed or references an unknown README." };
    if (seen.has(plugin.id)) return { ok: false, error: `Duplicate plugin id: ${plugin.id}.` };
    seen.add(plugin.id);
    plugins.push(plugin);
  }
  return { ok: true, registry: { schemaVersion: 1, plugins } };
}

/** One reviewed record per file; filename identity and the whole catalogue fail closed. */
export function parsePluginFiles(files: Record<string, unknown>, readmes: ReadonlySet<string>): ParseResult {
  for (const [filename, record] of Object.entries(files)) {
    if (!/^[a-z][a-z0-9-]{0,63}\.json$/.test(filename) || !isRecord(record)
      || filename !== `${record.id}.json`) return { ok: false, error: "Plugin filename must match its manifest ID." };
  }
  return parseRegistry({ schemaVersion: 1, plugins: Object.values(files) }, readmes);
}

/**
 * The install deep link is a request for the desktop app to show a confirmation flow.
 * It does not install anything by itself, and this site disables it until signed releases exist.
 */
declare const __ZDECK_APP_READY_RELEASES__: readonly string[];
const APP_READY_RELEASES: readonly string[] = typeof __ZDECK_APP_READY_RELEASES__ === "undefined" ? [] : __ZDECK_APP_READY_RELEASES__;

export function installRequestUrl(plugin: PluginRecord): string | null {
  if (plugin.status !== "published" || !plugin.version || !plugin.release || !plugin.runtime) return null;
  const query = new URLSearchParams({ id: plugin.id, version: plugin.version });
  return `zdeck://plugins/install?${query.toString()}`;
}

export const canOfferInstall = (plugin: PluginRecord, ready: readonly string[] = APP_READY_RELEASES) =>
  ready.includes(`${plugin.id}@${plugin.version}`) && installRequestUrl(plugin) !== null;

export function statusLabel(plugin: PluginRecord): string {
  if (plugin.status === "published") return "Published";
  if (plugin.status === "preview") return "Preview";
  return "In development";
}

export function statusNote(plugin: PluginRecord): string {
  if (plugin.status === "published") return canOfferInstall(plugin) ? "Published release. The desktop verifies it again before review." : "Published record; desktop release contract is not activated for this entry.";
  if (plugin.status === "preview") return "Reference plugin. No package is published for download.";
  return "Not published. Nothing to install yet.";
}

export function tagsOf(entries: readonly { tags?: string[] }[]): string[] {
  return [...new Set(entries.flatMap((entry) => entry.tags ?? []))].sort((a, b) => a.localeCompare(b));
}

export const README_LIMIT = 64 * 1024;

export function readmeFor(entry: { readme: string }, readmes: Readonly<Record<string, string>>): string | null {
  if (!Object.hasOwn(readmes, entry.readme)) return null;
  const markdown = readmes[entry.readme];
  return new TextEncoder().encode(markdown).length <= README_LIMIT ? markdown : null;
}
