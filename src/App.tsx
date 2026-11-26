import { useEffect, useState } from "react";
import { BrandMark } from "./components/BrandMark";
import { READMES, REGISTRY } from "./data/registry";
import { DirectoryPage } from "./pages/DirectoryPage";
import { PluginPage } from "./pages/PluginPage";

export type Route =
  | { kind: "directory" }
  | { kind: "plugin"; id: string }
  | { kind: "not-found" };

export function parseRoute(hash: string): Route {
  const value = hash.replace(/^#\/?/, "");
  if (!value) return { kind: "directory" };
  const [section, id, ...rest] = value.split("/");
  if (section !== "plugin" || !id || rest.length > 0) return { kind: "not-found" };
  try {
    return { kind: "plugin", id: decodeURIComponent(id) };
  } catch {
    return { kind: "not-found" };
  }
}

export function NotFoundPage() {
  return (
    <main className="state-page">
      <h1>That plugin is not in the registry.</h1>
      <p>The entry may have been removed, or the address is mistyped. Nothing was installed.</p>
      <a className="button" href="#/">Browse plugins</a>
    </main>
  );
}

export function RegistryErrorPage({ error }: { error: string }) {
  return (
    <main className="state-page" role="alert">
      <h1>Registry unavailable.</h1>
      <p>{error}</p>
      <p>
        The catalogue is validated as a whole before it is used. Run <code>npm test</code> and
        check <code>registry/plugins.json</code> and its README files.
      </p>
      <a className="button" href="#/">Try again</a>
    </main>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!REGISTRY.ok) {
      document.title = "Registry unavailable · zDeck";
    } else if (route.kind === "plugin") {
      const plugin = REGISTRY.registry.plugins.find((entry) => entry.id === route.id);
      document.title = plugin ? `${plugin.name} · zDeck plugins` : "Plugin not found · zDeck";
    } else {
      document.title = "Plugins · zDeck";
    }
  }, [route]);

  let content;
  if (!REGISTRY.ok) {
    content = <RegistryErrorPage error={REGISTRY.error} />;
  } else if (route.kind === "plugin") {
    const plugin = REGISTRY.registry.plugins.find((entry) => entry.id === route.id);
    content = plugin ? <PluginPage plugin={plugin} readmes={READMES} /> : <NotFoundPage />;
  } else if (route.kind === "not-found") {
    content = <NotFoundPage />;
  } else {
    content = <DirectoryPage plugins={REGISTRY.registry.plugins} />;
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#/">
            <BrandMark />
            <span>zDeck <span className="brand-sub">Plugins</span></span>
          </a>
          <span className="header-note">prototype</span>
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

