import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Dropdown } from "../components/Dropdown";
import { PluginRow } from "../components/PluginRow";
import { canOfferInstall, tagsOf, type PluginRecord } from "../lib/registry";
import {
  DEFAULT_DIRECTORY, directorySearch, orderLabels, selectPlugins, SORT_LABELS, SORTS,
  type DirectorySort, type DirectoryState, type Origin,
} from "../lib/directory";

interface DirectoryPageProps {
  plugins: PluginRecord[];
  initialState?: Partial<DirectoryState>;
  onStateChange?: (state: DirectoryState) => void;
}

export function DirectoryPage({ plugins, initialState, onStateChange }: DirectoryPageProps) {
  const [state, setState] = useState<DirectoryState>(() => {
    const merged = { ...DEFAULT_DIRECTORY, ...initialState };
    return { ...merged, origins: merged.origins.filter((origin) => origin === "official" || origin === "community") };
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const filterId = useId();
  const tags = useMemo(() => tagsOf(plugins), [plugins]);
  const visible = useMemo(() => selectPlugins(plugins, state), [plugins, state]);
  const installable = plugins.filter((plugin) => canOfferInstall(plugin)).length;
  const filterCount = state.categories.length + state.origins.length;
  const filtered = state.query.trim() !== "" || filterCount > 0;
  const orders = orderLabels(state.sort);
  const search = directorySearch(state);

  function update(patch: Partial<DirectoryState>) {
    const next = { ...state, ...patch };
    setState(next);
    onStateChange?.(next);
  }
  function toggleCategory(tag: string) {
    update({ categories: state.categories.includes(tag) ? state.categories.filter((item) => item !== tag) : [...state.categories, tag] });
  }
  function toggleOrigin(origin: Origin) {
    update({ origins: state.origins.includes(origin) ? state.origins.filter((item) => item !== origin) : [...state.origins, origin] });
  }
  function clear() { update({ query: "", categories: [], origins: [] }); }

  return (
    <main className="page directory-page">
      <header className="directory-intro">
        <h1>Plugins for zDeck.</h1>
        <p>Find actions for your deck. Review the source and permissions before installing.</p>
      </header>

      <div className="directory-layout">
        <aside className="filter-rail" aria-label="Search criteria" onKeyDown={(event) => {
          if (event.key === "Escape" && filtersOpen) {
            setFiltersOpen(false);
            filterButton.current?.focus();
          }
        }}>
          <button ref={filterButton} type="button" className="button filter-toggle" aria-expanded={filtersOpen}
            aria-controls={filterId} onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Filters{filterCount ? ` (${filterCount})` : ""}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <div id={filterId} className={`filter-content${filtersOpen ? " is-open" : ""}`}>
            <div className="filter-heading"><h2>Filter plugins</h2><button className="text-button" type="button" aria-disabled={filterCount === 0} onClick={() => { if (filterCount) update({ categories: [], origins: [] }); }}>Reset</button></div>
            <fieldset>
              <legend>Publisher</legend>
              {(["official", "community"] as const).map((origin) => (
                <label className="facet-option" key={origin}>
                  <input type="checkbox" checked={state.origins.includes(origin)} onChange={() => toggleOrigin(origin)} />
                  <span>{origin === "official" ? "Official" : "Community"}</span>
                </label>
              ))}
              <p className="filter-help">Official is curated by registry maintainers. Community includes unclassified entries; neither is a security review.</p>
            </fieldset>
            <fieldset>
              <legend>Categories</legend>
              <p className="filter-help">Match any selected category.</p>
              {tags.map((tag) => (
                <label className="facet-option" key={tag}>
                  <input type="checkbox" checked={state.categories.includes(tag)} onChange={() => toggleCategory(tag)} />
                  <span>{tag}</span>
                </label>
              ))}
              {tags.length === 0 ? <p className="filter-help">No categories yet.</p> : null}
            </fieldset>
          </div>
        </aside>

        <section className="directory-results" aria-label="Plugin results">
          <label className="search-field">
            <Search size={16} aria-hidden="true" /><span className="sr-only">Search plugins</span>
            <input type="search" value={state.query} maxLength={200} onChange={(event) => update({ query: event.target.value })}
              placeholder="Search plugins" autoComplete="off" />
            {state.query ? <button type="button" className="clear-search" onClick={() => update({ query: "" })} aria-label="Clear search"><X size={14} aria-hidden="true" /></button> : null}
          </label>
          <div className="results-toolbar">
            <div className="catalogue-status" role="status">
              <span>{filtered ? `${visible.length} of ${plugins.length}` : plugins.length} {plugins.length === 1 ? "entry" : "entries"}</span>
              <span>{installable} installable</span>
            </div>
            <div className="sort-controls">
              <Dropdown label="Sort" value={state.sort} options={SORTS.map((value) => ({ value, label: SORT_LABELS[value] }))}
                onChange={(value) => update({ sort: value as DirectorySort, order: value === "name" ? "asc" : "desc" })} />
              <Dropdown label="Order" value={state.order} options={(["desc", "asc"] as const).map((value) => ({ value, label: orders[value] }))}
                onChange={(value) => update({ order: value as "asc" | "desc" })} />
            </div>
          </div>
          <p className="metrics-help">Counts are optional snapshots, not live activity. — means no data.</p>

          {visible.length > 0 ? (
            <ul className="plugin-list">{visible.map((plugin) => <PluginRow plugin={plugin} key={plugin.id} search={search} sort={state.sort} />)}</ul>
          ) : (
            <div className="empty-state">
              <span className="key-well empty-well" aria-hidden="true"><span className="key-cap">?</span></span>
              <h2>{plugins.length ? "No plugins match." : "No plugins yet."}</h2>
              <p>{plugins.length ? "Try another name or clear your search and filters." : "Check back after a registry entry is added."}</p>
              {filtered ? <button type="button" className="button" onClick={clear}>Clear filters</button> : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
