import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function safeUrl(url: string): string {
  if (!url || url.startsWith("//")) return "";
  if (url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return url;
  return /^https?:/i.test(url) || /^mailto:/i.test(url) ? url : "";
}

const components: Components = {
  a: ({ href, children, ...props }) => {
    const safe = href ? safeUrl(href) : "";
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

export function SafeReadme({ markdown }: { markdown: string }) {
  return (
    <div className="readme">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) => safeUrl(url)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
