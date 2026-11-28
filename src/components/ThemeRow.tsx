import { ArrowUpRight } from "lucide-react";
import { themeKindLabel, type ThemeRecord } from "../lib/themes";
import type { DirectorySort } from "../lib/directory";

export function ThemeRow({ theme, search = "", sort = "relevance", previewUrl }: {
  theme: ThemeRecord;
  search?: string;
  sort?: DirectorySort;
  previewUrl?: string;
}) {
  const dateKey = sort === "updatedAt" || sort === "addedAt" ? sort : null;
  return (
    <li className="plugin-item">
      <a className="plugin-row theme-row" href={`#/theme/${theme.id}${search}`}>
        {previewUrl ? (
          <img className="theme-thumb" src={previewUrl} alt="" width={960} height={680} loading="lazy" />
        ) : (
          <span className="key-well" aria-hidden="true"><span className="key-cap">{theme.name.slice(0, 1)}</span></span>
        )}
        <span className="plugin-main">
          <span className="plugin-heading"><span className="plugin-name">{theme.name}</span></span>
          <span className="plugin-summary">{theme.summary}</span>
          <span className="plugin-meta">
            <span>{theme.author}</span>
            {theme.tags?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            {dateKey ? <span>{dateKey === "addedAt" ? "Added" : "Updated"} {theme[dateKey] ? <time dateTime={theme[dateKey]}>{theme[dateKey]!.slice(0, 10)}</time> : "—"}</span> : null}
          </span>
        </span>
        <span className="plugin-state">
          <span className={`status ${theme.kind === "built-in" ? "status-published" : "status-preview"}`}>
            <span className="status-dot" aria-hidden="true" />
            {themeKindLabel(theme)}
          </span>
          <span className="no-download">{theme.kind === "built-in" ? "Built in" : "No package"}</span>
        </span>
        <ArrowUpRight className="plugin-arrow" size={16} aria-hidden="true" />
      </a>
    </li>
  );
}
