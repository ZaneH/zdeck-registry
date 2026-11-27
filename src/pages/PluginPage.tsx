import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { readmeBaseUrl, SafeReadme } from "../lib/readme";
import {
  canOfferInstall,
  installRequestUrl,
  readmeFor,
  statusNote,
  type PluginRecord,
} from "../lib/registry";

interface PluginPageProps {
  plugin: PluginRecord;
  readmes: Readonly<Record<string, string>>;
}

export function PluginPage({ plugin, readmes }: PluginPageProps) {
  const markdown = readmeFor(plugin, readmes);
  const request = installRequestUrl(plugin);
  const offered = canOfferInstall(plugin) && request !== null;

  return (
    <main className="page detail-page">
      <a className="back-link" href="#/">
        <ArrowLeft size={15} aria-hidden="true" />
        All plugins
      </a>

      <article className="detail">
        <div className="detail-main">
          <header className="detail-head">
            <span className="key-well key-well-large" aria-hidden="true">
              <span className="key-cap">{plugin.name.slice(0, 1)}</span>
            </span>
            <div className="detail-title">
              <div className="detail-title-row">
                <h1>{plugin.name}</h1>
                {plugin.version ? <span className="plugin-version">{plugin.version}</span> : null}
                <StatusBadge plugin={plugin} />
              </div>
              {plugin.summary ? <p className="detail-summary">{plugin.summary}</p> : null}
              <div className="detail-meta">
                {plugin.author ? <span>{plugin.author}</span> : null}
                <span>{plugin.license}</span>
                {plugin.platforms?.map((platform) => <span key={platform}>{platform}</span>)}
              </div>
            </div>
          </header>

          {markdown ? (
            <SafeReadme markdown={markdown} baseUrl={readmeBaseUrl(plugin.repo)} />
          ) : (
            <div className="inline-error" role="alert">
              <h2>README unavailable</h2>
              <p>This entry points at a README that is missing, too large, or invalid.</p>
            </div>
          )}
        </div>

        <aside className="install-panel" aria-labelledby="install-title">
          <h2 id="install-title">Install</h2>
          <p className="install-state">{statusNote(plugin)}</p>
          {offered && request ? (
            <a className="button primary install-button" href={request}>Install in zDeck</a>
          ) : (
            <button type="button" className="button primary install-button" disabled aria-describedby="install-unavailable">
              Install unavailable
            </button>
          )}
          <p className="install-help" id="install-unavailable">
            {plugin.status === "published"
              ? offered ? "Opens an untrusted request in the configured desktop build. Lookup, download and disabled installation each need your confirmation." : "This published record is not activated for the configured desktop release contract. This site will not trigger a download."
              : "There is no downloadable .zdx archive for this entry. Nothing will be installed."}
          </p>

          <dl className="facts">
            <dt>Status</dt>
            <dd>{plugin.status === "published" ? "Published" : plugin.status === "preview" ? "Preview, unpublished" : "In development"}</dd>
            <dt>Version</dt>
            <dd>{plugin.version ?? "Not declared"}</dd>
            <dt>Runtime</dt>
            <dd>{plugin.runtime ? `${plugin.runtime.language} ${plugin.runtime.minimum}+` : "Not declared"}</dd>
            <dt>Platform</dt>
            <dd>{plugin.platforms?.join(", ") ?? "Not declared"}</dd>
            <dt>License</dt>
            <dd>{plugin.license}</dd>
            <dt>Source</dt>
            <dd>
              <a href={plugin.repo} target="_blank" rel="noopener noreferrer">
                Repository <ExternalLink size={12} aria-hidden="true" />
              </a>
            </dd>
          </dl>

          <details className="install-request">
            <summary>Desktop request</summary>
            {request ? <code>{request}</code> : <p>No request is available for this entry.</p>}
            <p>
              This asks zDeck to <strong>show a review</strong>. It does not install anything by
              itself. The desktop independently verifies its configured release record and archive.
            </p>
          </details>

          <p className="security-note">
            <ShieldAlert size={15} aria-hidden="true" />
            Plugins run as separate processes with your user permissions, not in a sandbox. Review
            the source before installing any plugin.
          </p>
        </aside>
      </article>
    </main>
  );
}
