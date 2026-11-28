import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Dropdown } from "../components/Dropdown";
import { ThemeRow } from "../components/ThemeRow";
import { tagsOf } from "../lib/registry";
import type { ThemeRecord } from "../lib/themes";
import {
  DEFAULT_DIRECTORY, directorySearch, orderLabels, selectThemes, SORT_LABELS, THEME_SORTS,
  type DirectorySort, type DirectoryState, type Origin,
} from "../lib/directory";

interface ThemesPageProps {
  themes: ThemeRecord[];
  previews: Readonly<Record<string, string>>;
  initialState?: Partial<DirectoryState>;
  onStateChange?: (state: DirectoryState) => void;
}

export function ThemesPage({ themes, previews, initialState, onStateChange }: ThemesPageProps) {
  const [state, setState] = useState<DirectoryState>(() => {
    const merged = { ...DEFAULT_DIRECTORY, ...initialState };
    merged.origins = merged.origins.filter((origin) => origin === "built-in" || origin === "source-preview");
    return (THEME_SORTS as readonly DirectorySort[]).includes(merged.sort) ? merged : { ...merged, sort: "relevance" };
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const filterId = useId();
  const tags = useMemo(() => tagsOf(themes), [themes]);
  const visible = useMemo(() => selectThemes(themes, state), [themes, state]);
  const included = themes.filter((theme) => theme.kind === "built-in").length;
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
        <h1>Themes for zDeck.</h1>
        <p>Appearances for the whole deck, shown on the same sample deck. Included themes are already in zDeck; source previews are not installable.</p>
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
            <div className="filter-heading"><h2>Filter themes</h2><button className="text-button" type="button" aria-disabled={filterCount === 0} onClick={() => { if (filterCount) update({ categories: [], origins: [] }); }}>Reset</button></div>
            <fieldset>
              <legend>Source</legend>
              {(["built-in", "source-preview"] as const).map((kind) => (
                <label className="facet-option" key={kind}>
                  <input type="checkbox" checked={state.origins.includes(kind)} onChange={() => toggleOrigin(kind)} />
                  <span>{kind === "built-in" ? "Included in zDeck" : "Source preview"}</span>
                </label>
              ))}
              <p className="filter-help">A source preview documents reviewed theme source and screenshots. It is not an installable package.</p>
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

        <section className="directory-results" aria-label="Theme results">
          <label className="search-field">
            <Search size={16} aria-hidden="true" /><span className="sr-only">Search themes</span>
            <input type="search" value={state.query} maxLength={200} onChange={(event) => update({ query: event.target.value })}
              placeholder="Search themes" autoComplete="off" />
            {state.query ? <button type="button" className="clear-search" onClick={() => update({ query: "" })} aria-label="Clear search"><X size={14} aria-hidden="true" /></button> : null}
          </label>
          <div className="results-toolbar">
            <div className="catalogue-status" role="status">
              <span>{filtered ? `${visible.length} of ${themes.length}` : themes.length} {themes.length === 1 ? "entry" : "entries"}</span>
              <span>{included} included in zDeck</span>
            </div>
            <div className="sort-controls">
              <Dropdown label="Sort" value={state.sort} options={THEME_SORTS.map((value) => ({ value, label: SORT_LABELS[value] }))}
                onChange={(value) => update({ sort: value as DirectorySort, order: value === "name" ? "asc" : "desc" })} />
              <Dropdown label="Order" value={state.order} options={(["desc", "asc"] as const).map((value) => ({ value, label: orders[value] }))}
                onChange={(value) => update({ order: value as "asc" | "desc" })} />
            </div>
          </div>
          <p className="metrics-help">Previews are local images of the zdeck-sample-deck-1 fixture. There are no download or popularity metrics.</p>

          {visible.length > 0 ? (
            <ul className="plugin-list">{visible.map((theme) => (
              <ThemeRow theme={theme} key={theme.id} search={search} sort={state.sort} previewUrl={previews[theme.preview.desktop.src]} />
            ))}</ul>
          ) : (
            <div className="empty-state">
              <span className="key-well empty-well" aria-hidden="true"><span className="key-cap">?</span></span>
              <h2>{themes.length ? "No themes match." : "No themes yet."}</h2>
              <p>{themes.length ? "Try another name or clear your search and filters." : "Check back after a theme entry is added."}</p>
              {filtered ? <button type="button" className="button" onClick={clear}>Clear filters</button> : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
