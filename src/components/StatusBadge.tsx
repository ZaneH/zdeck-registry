import { statusLabel, type PluginRecord } from "../lib/registry";

export function StatusBadge({ plugin }: { plugin: PluginRecord }) {
  return (
    <span className={`status status-${plugin.status}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabel(plugin)}
    </span>
  );
}
