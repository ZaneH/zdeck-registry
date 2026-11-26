import { ArrowUpRight } from "lucide-react";
import type { PluginRecord } from "../lib/registry";
import { StatusBadge } from "./StatusBadge";

export function PluginRow({ plugin }: { plugin: PluginRecord }) {
  return (
    <li className="plugin-item">
      <a className="plugin-row" href={`#/plugin/${plugin.id}`}>
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
            {plugin.tags?.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            {plugin.runtime ? <span>{plugin.runtime.language} {plugin.runtime.minimum}+</span> : null}
            {plugin.platforms?.map((platform) => <span key={platform}>{platform}</span>)}
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
