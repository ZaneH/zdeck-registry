export type PluginStatus = "preview" | "in-development" | "published";
export type RuntimeLanguage = "node" | "python";

export interface PluginRuntime {
  language: RuntimeLanguage;
  minimum: string;
}

/** A future signed archive record. This site does not verify signatures yet. */
export interface PluginRelease {
  url: string;
  sha256: string;
  signature?: { keyId: string; value: string };
}

export interface PluginRecord {
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

export const TAG_ALL = "all";

const ID = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const SHA256 = /^[a-f0-9]{64}$/;
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
  if (!isRecord(value) || !exactKeys(value, ["url", "sha256", "signature"])
    || !httpsUrl(value.url, ".zdx") || typeof value.sha256 !== "string" || !SHA256.test(value.sha256)) return null;
  if (!Object.hasOwn(value, "signature")) return { url: value.url as string, sha256: value.sha256 };
  const signature = value.signature;
  if (!isRecord(signature) || !exactKeys(signature, ["keyId", "value"])
    || typeof signature.keyId !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(signature.keyId)
    || typeof signature.value !== "string" || !/^[A-Za-z0-9+/=_-]{32,512}$/.test(signature.value)) return null;
  return { url: value.url as string, sha256: value.sha256, signature: { keyId: signature.keyId, value: signature.value } };
}

function parsePlugin(value: unknown, availableReadmes: ReadonlySet<string>): PluginRecord | null {
  if (!isRecord(value) || !exactKeys(value, [
    "id", "name", "summary", "version", "author", "license", "repo", "platforms",
    "runtime", "tags", "readme", "status", "release",
  ])) return null;
  if (typeof value.id !== "string" || !ID.test(value.id)
    || !text(value.name, 80) || !text(value.summary, 200)
    || !text(value.author, 80) || !text(value.license, 40) || !httpsUrl(value.repo)
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
  if (status === "published" && (!release || !version || !runtime)) return null;
  if (status !== "published" && release) return null;

  return {
    id: value.id as string, name: value.name as string, summary: value.summary as string,
    ...(version === undefined ? {} : { version }),
    author: value.author as string, license: value.license as string, repo: value.repo as string,
    ...(value.platforms === undefined ? {} : { platforms: value.platforms as string[] }),
    ...(runtime ? { runtime } : {}),
    ...(value.tags === undefined ? {} : { tags: value.tags as string[] }),
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

/**
 * The install deep link is a request for the desktop app to show a confirmation flow.
 * It does not install anything by itself, and this site disables it until signed releases exist.
 */
export const INSTALL_REQUESTS_ENABLED = false;

export function installRequestUrl(plugin: PluginRecord): string | null {
  if (plugin.status !== "published" || !plugin.version || !plugin.release || !plugin.runtime) return null;
  const query = new URLSearchParams({ id: plugin.id, version: plugin.version });
  return `zdeck://plugins/install?${query.toString()}`;
}

export const canOfferInstall = (plugin: PluginRecord) =>
  INSTALL_REQUESTS_ENABLED && !!plugin.release?.signature && installRequestUrl(plugin) !== null;

export function statusLabel(plugin: PluginRecord): string {
  if (plugin.status === "published") return "Published";
  if (plugin.status === "preview") return "Preview";
  return "In development";
}

export function statusNote(plugin: PluginRecord): string {
  if (plugin.status === "published") return "Release metadata present; install requests are still disabled.";
  if (plugin.status === "preview") return "Reference plugin. No package is published for download.";
  return "Not published. Nothing to install yet.";
}

export function filterPlugins(plugins: PluginRecord[], query: string, tag = TAG_ALL): PluginRecord[] {
  const needle = query.trim().toLocaleLowerCase();
  return plugins.filter((plugin) => {
    if (tag !== TAG_ALL && !plugin.tags?.includes(tag)) return false;
    if (!needle) return true;
    return [plugin.name, plugin.summary, ...(plugin.tags ?? [])]
      .some((value) => value.toLocaleLowerCase().includes(needle));
  });
}

export function tagsOf(plugins: PluginRecord[]): string[] {
  return [...new Set(plugins.flatMap((plugin) => plugin.tags ?? []))].sort((a, b) => a.localeCompare(b));
}

export const README_LIMIT = 64 * 1024;

export function readmeFor(plugin: PluginRecord, readmes: Readonly<Record<string, string>>): string | null {
  if (!Object.hasOwn(readmes, plugin.readme)) return null;
  const markdown = readmes[plugin.readme];
  return new TextEncoder().encode(markdown).length <= README_LIMIT ? markdown : null;
}
