import type { PluginRecord } from "./registry";
import type { ThemeRecord } from "./themes";

export const SORTS = ["relevance", "name", "downloads", "githubStars", "updatedAt", "addedAt"] as const;
export const THEME_SORTS = ["relevance", "name", "updatedAt", "addedAt"] as const;
export type DirectorySort = typeof SORTS[number];
export type Origin = "official" | "community" | "built-in" | "source-preview";
export interface DirectoryState {
  query: string;
  categories: string[];
  origins: Origin[];
  sort: DirectorySort;
  order: "asc" | "desc";
}
export const DEFAULT_DIRECTORY: DirectoryState = { query: "", categories: [], origins: [], sort: "relevance", order: "desc" };

export const originOf = (entry: { provenance?: { kind: "official" | "community" } }): Origin =>
  entry.provenance?.kind ?? "community";
const lower = (text: string) => text.toLocaleLowerCase("en");
const names = new Intl.Collator("en", { sensitivity: "base", numeric: true });

interface CatalogEntry {
  id: string;
  name: string;
  summary: string;
  tags?: string[];
  addedAt?: string;
  updatedAt?: string;
  downloads?: { count: number };
  githubStars?: { count: number };
}

const byName = (a: CatalogEntry, b: CatalogEntry) =>
  names.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function relevance(entry: CatalogEntry, query: string): number | null {
  if (!query) return 0;
  const name = lower(entry.name), id = lower(entry.id);
  const fields = [name, id, lower(entry.summary), ...(entry.tags ?? []).map(lower)];
  const terms = query.split(/\s+/);
  if (!terms.every((term) => fields.some((field) => field.includes(term)))) return null;
  if (name === query || id === query) return 100;
  if (name.startsWith(query) || id.startsWith(query)) return 80;
  if (name.includes(query) || id.includes(query)) return 60;
  if (terms.every((term) => name.includes(term))) return 50;
  if (entry.tags?.some((tag) => lower(tag) === query)) return 30;
  return 10;
}

/** Synchronous, bounded to the catalogue's 500-record limit. Unknown values always sort last. */
function selectEntries<T extends CatalogEntry>(
  entries: readonly T[],
  state: DirectoryState,
  facetsOf: (entry: T) => readonly Origin[],
): T[] {
  const query = lower(state.query.trim());
  const scored = entries.flatMap((entry) => {
    if (state.origins.length && !state.origins.some((origin) => facetsOf(entry).includes(origin))) return [];
    if (state.categories.length && !state.categories.some((tag) => entry.tags?.includes(tag))) return [];
    const score = relevance(entry, query);
    return score === null ? [] : [{ entry, score }];
  });
  const direction = state.order === "asc" ? 1 : -1;
  const sort = state.sort;
  return scored.sort((a, b) => {
    if (sort === "relevance") return (query ? (a.score - b.score) * direction : 0) || byName(a.entry, b.entry);
    if (sort === "name") return names.compare(a.entry.name, b.entry.name) * direction || byName(a.entry, b.entry);
    const value = (entry: T) => {
      if (sort === "downloads" || sort === "githubStars") return entry[sort]?.count;
      const date = entry[sort];
      return date === undefined ? undefined : Date.parse(date);
    };
    const av = value(a.entry), bv = value(b.entry);
    if (av === undefined || bv === undefined) return av === bv ? byName(a.entry, b.entry) : av === undefined ? 1 : -1;
    return (av - bv) * direction || byName(a.entry, b.entry);
  }).map(({ entry }) => entry);
}

export function selectPlugins(plugins: readonly PluginRecord[], state: DirectoryState): PluginRecord[] {
  return selectEntries(plugins, state, (plugin) => [originOf(plugin)]);
}

export function selectThemes(themes: readonly ThemeRecord[], state: DirectoryState): ThemeRecord[] {
  return selectEntries(themes, state, (theme) => [theme.kind]);
}

export function parseDirectoryState(hash: string): DirectoryState {
  const params = new URLSearchParams(hash.split("?")[1] ?? "");
  const sort = params.get("sort");
  return {
    query: (params.get("q") ?? "").slice(0, 200),
    categories: [...new Set(params.getAll("category"))].filter((tag) => /^[a-z0-9][a-z0-9-]{0,31}$/.test(tag)),
    origins: [...new Set(params.getAll("origin"))].filter((kind): kind is Origin =>
      kind === "official" || kind === "community" || kind === "built-in" || kind === "source-preview"),
    sort: SORTS.includes(sort as DirectorySort) ? sort as DirectorySort : "relevance",
    order: params.get("order") === "asc" ? "asc" : "desc",
  };
}

export function directorySearch(state: DirectoryState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  state.categories.forEach((tag) => params.append("category", tag));
  state.origins.forEach((kind) => params.append("origin", kind));
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.order !== "desc") params.set("order", state.order);
  return params.size ? `?${params}` : "";
}

export const SORT_LABELS: Record<DirectorySort, string> = {
  relevance: "Relevance", name: "Name", downloads: "Downloads", githubStars: "GitHub stars", updatedAt: "Last updated", addedAt: "Date added",
};
export function orderLabels(sort: DirectorySort): { asc: string; desc: string } {
  if (sort === "name") return { asc: "A to Z", desc: "Z to A" };
  if (sort === "relevance") return { asc: "Weakest matches first", desc: "Best matches first" };
  if (sort === "updatedAt" || sort === "addedAt") return { asc: "Oldest first", desc: "Newest first" };
  return { asc: "Lowest first", desc: "Highest first" };
}
