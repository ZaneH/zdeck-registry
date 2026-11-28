import { useEffect, useState } from "react";
import { BrandMark } from "./components/BrandMark";
import { READMES, REGISTRY } from "./data/registry";
import { THEME_PREVIEW_URLS, THEME_READMES, THEMES } from "./data/themes";
import { DirectoryPage } from "./pages/DirectoryPage";
import { PluginPage } from "./pages/PluginPage";
import { ThemesPage } from "./pages/ThemesPage";
import { ThemePage } from "./pages/ThemePage";
import { directorySearch, parseDirectoryState } from "./lib/directory";

export type Route =
  | { kind: "directory" }
  | { kind: "plugin"; id: string }
  | { kind: "themes" }
  | { kind: "theme"; id: string }
  | { kind: "not-found" };

export function parseRoute(hash: string): Route {
  const value = hash.split("?")[0].replace(/^#\/?/, "");
  if (!value) return { kind: "directory" };
  if (value === "themes") return { kind: "themes" };
  const [section, id, ...rest] = value.split("/");
  if ((section !== "plugin" && section !== "theme") || !id || rest.length > 0) return { kind: "not-found" };
  try {
    return { kind: section, id: decodeURIComponent(id) };
  } catch {
    return { kind: "not-found" };
  }
}

export function NotFoundPage({ kind = "plugin" }: { kind?: "plugin" | "theme" }) {
  return (
    <main className="state-page">
      <h1>That {kind} is not in the registry.</h1>
      <p>The entry may have been removed, or the address is mistyped. Nothing was installed.</p>
      <a className="button" href={kind === "theme" ? "#/themes" : "#/"}>Browse {kind === "theme" ? "themes" : "plugins"}</a>
    </main>
  );
}

export function RegistryErrorPage({ error }: { error: string }) {
  return (
    <main className="state-page" role="alert">
      <h1>Registry unavailable.</h1>
      <p>{error}</p>
      <p>
        Each catalogue is validated as a whole before it is used. Run <code>npm test</code> and
        check <code>registry/plugins/</code>, <code>registry/themes/</code>, their READMEs and
        <code>registry/previews/</code>.
      </p>
      <a className="button" href="#/">Try again</a>
    </main>
  );
}

export function App() {
  const [navigation, setNavigation] = useState(() => ({ hash: window.location.hash, revision: 0 }));
  const { hash, revision } = navigation;
  const route = parseRoute(hash);
  const directoryState = parseDirectoryState(hash);
  const pluginDirectoryHref = `#/${directorySearch(directoryState)}`;
  const themeDirectoryHref = `#/themes${directorySearch(directoryState)}`;
  const catalogue = /^#\/theme(?:s|\/)/.test(hash) ? "themes" : "plugins";

  useEffect(() => {
    // Local query edits replace history without a hash event; even a return to the same root must reset the page.
    const onHashChange = () => setNavigation((previous) => ({ hash: window.location.hash, revision: previous.revision + 1 }));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!REGISTRY.ok || !THEMES.ok) {
      document.title = "Registry unavailable · zDeck";
    } else if (route.kind === "plugin") {
      const plugin = REGISTRY.registry.plugins.find((entry) => entry.id === route.id);
      document.title = plugin ? `${plugin.name} · zDeck plugins` : "Plugin not found · zDeck";
    } else if (route.kind === "theme") {
      const theme = THEMES.themes.themes.find((entry) => entry.id === route.id);
      document.title = theme ? `${theme.name} · zDeck themes` : "Theme not found · zDeck";
    } else if (route.kind === "themes") {
      document.title = "Themes · zDeck";
    } else {
      document.title = "Plugins · zDeck";
    }
  }, [navigation]);

  let content;
  if (!REGISTRY.ok || !THEMES.ok) {
    content = <RegistryErrorPage error={!REGISTRY.ok ? REGISTRY.error : !THEMES.ok ? THEMES.error : "Unknown registry error."} />;
  } else if (route.kind === "plugin") {
    const plugin = REGISTRY.registry.plugins.find((entry) => entry.id === route.id);
    content = plugin ? <PluginPage plugin={plugin} readmes={READMES} directoryHref={pluginDirectoryHref} /> : <NotFoundPage />;
  } else if (route.kind === "theme") {
    const theme = THEMES.themes.themes.find((entry) => entry.id === route.id);
    content = theme
      ? <ThemePage theme={theme} readmes={THEME_READMES} previews={THEME_PREVIEW_URLS} directoryHref={themeDirectoryHref} />
      : <NotFoundPage kind="theme" />;
  } else if (route.kind === "not-found") {
    content = <NotFoundPage />;
  } else if (route.kind === "themes") {
    content = <ThemesPage key={revision} themes={THEMES.themes.themes} previews={THEME_PREVIEW_URLS} initialState={directoryState}
      onStateChange={(state) => window.history.replaceState(null, "", `#/themes${directorySearch(state)}`)} />;
  } else {
    content = <DirectoryPage key={revision} plugins={REGISTRY.registry.plugins} initialState={directoryState}
      onStateChange={(state) => window.history.replaceState(null, "", `#/${directorySearch(state)}`)} />;
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#/">
            <BrandMark />
            <span>zDeck <span className="brand-sub">Registry</span></span>
          </a>
          <nav className="catalogue-nav" aria-label="Catalogue">
            <a href="#/" aria-current={catalogue === "plugins" ? "page" : undefined}>Plugins</a>
            <a href="#/themes" aria-current={catalogue === "themes" ? "page" : undefined}>Themes</a>
          </nav>
          <a className="header-link" href="https://github.com/ZaneH/zdeck" target="_blank" rel="noopener noreferrer">
            About zDeck
          </a>
        </div>
      </header>

      {content}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>Registry data is versioned in Git. Install requests are not enabled.</span>
          <a href="https://github.com/ZaneH/zdeck" target="_blank" rel="noopener noreferrer">zDeck source</a>
        </div>
      </footer>
    </div>
  );
}

