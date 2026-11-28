import { ArrowLeft, ExternalLink } from "lucide-react";
import { SafeReadme, readmeBaseUrl } from "../lib/readme";
import { themeAvailability, themeKindLabel, themeReadmeFor, type ThemeRecord } from "../lib/themes";

interface ThemePageProps {
  theme: ThemeRecord;
  readmes: Readonly<Record<string, string>>;
  previews: Readonly<Record<string, string>>;
  directoryHref?: string;
}

export function ThemePage({ theme, readmes, previews, directoryHref = "#/themes" }: ThemePageProps) {
  const markdown = themeReadmeFor(theme, readmes);
  const desktop = previews[theme.preview.desktop.src];
  const phone = previews[theme.preview.phone.src];
  const builtIn = theme.kind === "built-in";

  return (
    <main className="page detail-page">
      <a className="back-link" href={directoryHref}>
        <ArrowLeft size={15} aria-hidden="true" />
        All themes
      </a>

      <article className="detail">
        <div className="detail-main">
          <header className="detail-head">
            <span className="key-well key-well-large" aria-hidden="true">
              <span className="key-cap">{theme.name.slice(0, 1)}</span>
            </span>
            <div className="detail-title">
              <div className="detail-title-row">
                <h1>{theme.name}</h1>
                <span className={`status ${builtIn ? "status-published" : "status-preview"}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {themeKindLabel(theme)}
                </span>
              </div>
              <p className="detail-summary">{theme.summary}</p>
              <div className="detail-meta">
                <span>{theme.author}</span>
                <span>{theme.license}</span>
                <span>{theme.kind === "built-in" ? "Built-in appearance" : "Community source preview"}</span>
              </div>
            </div>
          </header>

          {desktop && phone ? (
            <section className="theme-previews" aria-label="Sample deck previews">
              <figure className="preview-figure">
                <a href={desktop} target="_blank" rel="noopener noreferrer" aria-label="Open full-size desktop preview">
                  <img src={desktop} alt={theme.preview.desktop.alt} width={1200} height={800} />
                </a>
                <figcaption>Desktop · 1200 × 800</figcaption>
              </figure>
              <figure className="preview-figure preview-phone">
                <a href={phone} target="_blank" rel="noopener noreferrer" aria-label="Open full-size phone preview">
                  <img src={phone} alt={theme.preview.phone.alt} width={390} height={844} />
                </a>
                <figcaption>Phone · 390 × 844</figcaption>
              </figure>
            </section>
          ) : (
            <div className="inline-error" role="alert">
              <h2>Previews unavailable</h2>
              <p>This entry's local preview images are missing. It cannot be shown reliably.</p>
            </div>
          )}

          {markdown ? (
            <SafeReadme markdown={markdown} baseUrl={readmeBaseUrl(theme.repo)} />
          ) : (
            <div className="inline-error" role="alert">
              <h2>README unavailable</h2>
              <p>This entry points at a README that is missing, too large, or invalid.</p>
            </div>
          )}
        </div>

        <aside className="install-panel" aria-labelledby="theme-availability-title">
          <h2 id="theme-availability-title">Availability</h2>
          <p className="install-state">{themeAvailability(theme)}</p>
          {builtIn ? (
            <div className="theme-guidance">
              <p>
                In zDeck, open <strong>Settings → Appearance</strong> and choose <strong>{theme.name}</strong> in
                the Theme menu. Changes save automatically. For one section only, open its section menu and
                choose <strong>Theme → {theme.name}</strong>.
              </p>
            </div>
          ) : (
            <p className="install-help">
              A source preview is a Git-reviewed record of theme source and sample-deck screenshots. There is
              no package format, download, or install action, and this page loads no submitted CSS or code.
            </p>
          )}

          <dl className="facts">
            <dt>Type</dt>
            <dd>{builtIn ? "Built-in appearance" : "Source preview"}</dd>
            <dt>Status</dt>
            <dd>{themeKindLabel(theme)}</dd>
            <dt>License</dt>
            <dd>{theme.license}</dd>
            <dt>Source</dt>
            <dd>
              <a href={theme.repo} target="_blank" rel="noopener noreferrer">
                Repository <ExternalLink size={12} aria-hidden="true" />
              </a>
            </dd>
            <dt>Source commit</dt>
            <dd><code>{theme.sourceCommit}</code></dd>
            <dt>Preview fixture</dt>
            <dd><code>{theme.preview.fixture}</code></dd>
            {theme.provenance ? <><dt>Curation</dt><dd>{theme.provenance.kind === "official" ? "Official" : "Community"}</dd></> : null}
          </dl>
        </aside>
      </article>
    </main>
  );
}
