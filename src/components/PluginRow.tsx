import { ArrowUpRight } from "lucide-react";
import type { MetricSnapshot, PluginRecord } from "../lib/registry";
import { originOf, type DirectorySort } from "../lib/directory";
import { StatusBadge } from "./StatusBadge";

const countFormat = new Intl.NumberFormat("en");
function metric(label: string, snapshot?: MetricSnapshot) {
  return <span title={snapshot ? `Snapshot ${snapshot.asOf}; source: ${snapshot.source}` : "No data"}>
    {label} <span className="metric-value">{snapshot ? countFormat.format(snapshot.count) : "—"}</span>
  </span>;
}

export function PluginRow({ plugin, search = "", sort = "relevance" }: { plugin: PluginRecord; search?: string; sort?: DirectorySort }) {
  const dateKey = sort === "updatedAt" || sort === "addedAt" ? sort : null;
  return (
    <li className="plugin-item">
      <a className="plugin-row" href={`#/plugin/${plugin.id}${search}`}>
        <span className="key-well" aria-hidden="true">
          <span className="key-cap">{plugin.name.slice(0, 1)}</span>
        </span>
        <span className="plugin-main">
          <span className="plugin-heading">
            <span className="plugin-name">{plugin.name}</span>
            {plugin.version ? <span className="plugin-version">{plugin.version}</span> : null}
          </span>
          {plugin.summary ? <span className="plugin-summary">{plugin.summary}</span> : null}
          <span className="plugin-meta">
            <span className={originOf(plugin) === "official" ? "origin-official" : ""}>{originOf(plugin) === "official" ? "Official" : "Community"}</span>
            {plugin.tags?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            {plugin.runtime ? <span>{plugin.runtime.language} {plugin.runtime.minimum}+</span> : null}
            {plugin.platforms?.map((platform) => <span key={platform}>{platform}</span>)}
          </span>
          <span className="plugin-metrics">
            {metric("Downloads", plugin.downloads)}
            {metric("GitHub stars", plugin.githubStars)}
            {dateKey ? <span>{dateKey === "addedAt" ? "Added" : "Updated"} {plugin[dateKey] ? <time dateTime={plugin[dateKey]}>{plugin[dateKey]!.slice(0, 10)}</time> : "—"}</span> : null}
          </span>
        </span>
        <span className="plugin-state">
          <StatusBadge plugin={plugin} />
          <span className="no-download">No download</span>
        </span>
        <ArrowUpRight className="plugin-arrow" size={16} aria-hidden="true" />
      </a>
    </li>
  );
}
