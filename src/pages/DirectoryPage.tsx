import { Search, X } from "lucide-react";
import { useState } from "react";
import { PluginRow } from "../components/PluginRow";
import {
  canOfferInstall,
  filterPlugins,
  TAG_ALL,
  tagsOf,
  type PluginRecord,
} from "../lib/registry";

interface DirectoryPageProps {
  plugins: PluginRecord[];
  initialQuery?: string;
  initialTag?: string;
}

export function DirectoryPage({ plugins, initialQuery = "", initialTag = TAG_ALL }: DirectoryPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const tags = tagsOf(plugins);
  const activeTag = tags.includes(tag) ? tag : TAG_ALL;
  const visible = filterPlugins(plugins, query, activeTag);
  const installable = plugins.filter(canOfferInstall).length;
  const filtered = query.trim() !== "" || activeTag !== TAG_ALL;

  function clear() {
    setQuery("");
    setTag(TAG_ALL);
  }

  return (
    <main className="page directory-page">
      <section className="intro" aria-labelledby="directory-title">
        <p className="kicker">Plugin registry</p>
        <h1 id="directory-title">Plugins for zDeck.</h1>
        <p className="lede">
          Small, local packages that add actions to your deck. Review the source, runtime, and
          permissions before installing anything.
        </p>
        <p className="prototype-note">
          Prototype registry. Downloads and desktop installation are not implemented yet.
        </p>
      </section>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search plugins</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, summary, or tag"
            autoComplete="off"
          />
          {query ? (
            <button type="button" className="clear-search" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {tags.length > 0 ? (
          <div className="tag-filters" role="group" aria-label="Filter by tag">
            <button
              type="button"
              className={activeTag === TAG_ALL ? "tag-filter is-active" : "tag-filter"}
              aria-pressed={activeTag === TAG_ALL}
              onClick={() => setTag(TAG_ALL)}
            >
              All
            </button>
            {tags.map((item) => (
              <button
                type="button"
                key={item}
                className={activeTag === item ? "tag-filter is-active" : "tag-filter"}
                aria-pressed={activeTag === item}
                onClick={() => setTag(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="catalogue-status" aria-live="polite">
        <span>
          {filtered ? `${visible.length} of ${plugins.length}` : plugins.length} {plugins.length === 1 ? "entry" : "entries"}
        </span>
        <span>{installable} installable</span>
      </div>

      {visible.length > 0 ? (
        <ul className="plugin-list">
          {visible.map((plugin) => <PluginRow plugin={plugin} key={plugin.id} />)}
        </ul>
      ) : (
        <div className="empty-state">
          <span className="key-well empty-well" aria-hidden="true"><span className="key-cap">?</span></span>
          <h2>No plugins match.</h2>
          <p>Try a different name, summary, or tag.</p>
          <button type="button" className="button" onClick={clear}>Clear filters</button>
        </div>
      )}
    </main>
  );
}
