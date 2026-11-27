import type { PluginRecord } from "./registry";

export const SORTS = ["relevance", "name", "downloads", "githubStars", "updatedAt", "addedAt"] as const;
export type DirectorySort = typeof SORTS[number];
export type Origin = "official" | "community";
export interface DirectoryState {
  query: string;
  categories: string[];
  origins: Origin[];
  sort: DirectorySort;
  order: "asc" | "desc";
}
export const DEFAULT_DIRECTORY: DirectoryState = { query: "", categories: [], origins: [], sort: "relevance", order: "desc" };

export const originOf = (plugin: PluginRecord): Origin => plugin.provenance?.kind ?? "community";
const lower = (text: string) => text.toLocaleLowerCase("en");
const names = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const byName = (a: PluginRecord, b: PluginRecord) => names.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function relevance(plugin: PluginRecord, query: string): number | null {
  if (!query) return 0;
  const name = lower(plugin.name), id = lower(plugin.id);
  const fields = [name, id, lower(plugin.summary), ...(plugin.tags ?? []).map(lower)];
  const terms = query.split(/\s+/);
  if (!terms.every((term) => fields.some((field) => field.includes(term)))) return null;
  if (name === query || id === query) return 100;
  if (name.startsWith(query) || id.startsWith(query)) return 80;
  if (name.includes(query) || id.includes(query)) return 60;
  if (terms.every((term) => name.includes(term))) return 50;
  if (plugin.tags?.some((tag) => lower(tag) === query)) return 30;
  return 10;
}

/** Synchronous, bounded to the catalogue's 500-record limit. Unknown values always sort last. */
export function selectPlugins(plugins: readonly PluginRecord[], state: DirectoryState): PluginRecord[] {
  const query = lower(state.query.trim());
  const scored = plugins.flatMap((plugin) => {
    if (state.origins.length && !state.origins.includes(originOf(plugin))) return [];
    if (state.categories.length && !state.categories.some((tag) => plugin.tags?.includes(tag))) return [];
    const score = relevance(plugin, query);
    return score === null ? [] : [{ plugin, score }];
  });
  const direction = state.order === "asc" ? 1 : -1;
  const sort = state.sort;
  return scored.sort((a, b) => {
    if (sort === "relevance") return (query ? (a.score - b.score) * direction : 0) || byName(a.plugin, b.plugin);
    if (sort === "name") return names.compare(a.plugin.name, b.plugin.name) * direction || byName(a.plugin, b.plugin);
    const value = (plugin: PluginRecord) => {
      if (sort === "downloads" || sort === "githubStars") return plugin[sort]?.count;
      const date = plugin[sort];
      return date === undefined ? undefined : Date.parse(date);
    };
    const av = value(a.plugin), bv = value(b.plugin);
    if (av === undefined || bv === undefined) return av === bv ? byName(a.plugin, b.plugin) : av === undefined ? 1 : -1;
    return (av - bv) * direction || byName(a.plugin, b.plugin);
  }).map(({ plugin }) => plugin);
}

export function parseDirectoryState(hash: string): DirectoryState {
  const params = new URLSearchParams(hash.split("?")[1] ?? "");
  const sort = params.get("sort");
  return {
    query: (params.get("q") ?? "").slice(0, 200),
    categories: [...new Set(params.getAll("category"))].filter((tag) => /^[a-z0-9][a-z0-9-]{0,31}$/.test(tag)),
    origins: [...new Set(params.getAll("origin"))].filter((kind): kind is Origin => kind === "official" || kind === "community"),
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
