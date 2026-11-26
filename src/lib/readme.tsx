import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** A GitHub tree URL names the README's folder, so relative links can become blob links. */
export function readmeBaseUrl(repo: string): string | undefined {
  if (!repo || repo.includes("\\")) return undefined;
  try {
    const url = new URL(repo);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    const pathname = url.pathname.replace(/\/+$/, "");
    const marker = "/tree/";
    const index = pathname.indexOf(marker);
    if (index === -1) return undefined;
    const [branch, ...path] = pathname.slice(index + marker.length).split("/");
    if (!branch || path.length === 0) return undefined;
    return `${url.origin}${pathname.replace(marker, "/blob/")}/`;
  } catch {
    return undefined;
  }
}

function safeBaseUrl(url?: string): string | undefined {
  if (!url || url.includes("\\")) return undefined;
  try {
    const base = new URL(url);
    if (base.protocol !== "https:" || base.username || base.password) return undefined;
    base.search = "";
    base.hash = "";
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    return base.href;
  } catch {
    return undefined;
  }
}

function safeUrl(url: string, base?: string): string {
  const value = url.trim();
  if (!value || value.includes("\\") || /%5c/i.test(value) || value.startsWith("//")) return "";
  if (value.startsWith("#")) return value;
  if (/^https?:/i.test(value) || /^mailto:/i.test(value)) return value;
  if (!base || value.startsWith("/")) return "";
  try {
    const resolved = new URL(value, base);
    return resolved.protocol === "https:" && !resolved.username && !resolved.password ? resolved.href : "";
  } catch {
    return "";
  }
}

function componentsFor(base?: string): Components {
  return {
    a: ({ href, children, ...props }) => {
      const safe = href ? safeUrl(href, base) : "";
      const external = /^https?:/i.test(safe);
      return (
        <a
          {...props}
          href={safe || undefined}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    },
    // README images are intentionally not rendered: no remote tracking or build-external requests.
    img: ({ alt }) => (alt ? <span className="readme-image-note">[Image: {alt}]</span> : null),
  };
}

export function SafeReadme({ markdown, baseUrl }: { markdown: string; baseUrl?: string }) {
  const base = safeBaseUrl(baseUrl);
  return (
    <div className="readme">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={componentsFor(base)}
        urlTransform={(url) => safeUrl(url, base)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
