import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readmeBaseUrl, SafeReadme } from "../src/lib/readme";

afterEach(cleanup);

const hostile = `# Hello

<script>alert("no")</script>
<iframe src="https://example.com/embed"></iframe>
<img src="https://example.com/tracking.png" alt="tracking pixel" />

[bad](javascript:alert("no"))

[external](https://example.com/docs)

![remote image](https://example.com/tracking.png)
`;

describe("safe README rendering", () => {
  it("does not render raw HTML, embeds, images, or javascript links", () => {
    const { container } = render(<SafeReadme markdown={hostile} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    expect(screen.getByText("[Image: remote image]")).toBeTruthy();
  });

  it("keeps http links external and inert to the current page", () => {
    render(<SafeReadme markdown={hostile} />);
    const link = screen.getByRole("link", { name: "external" });
    expect(link.getAttribute("href")).toBe("https://example.com/docs");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("leaves relative links non-clickable without a known source base", () => {
    render(<SafeReadme markdown="[contributing](./CONTRIBUTING.md) [protocol relative](//example.com/x)" />);
    expect(screen.getByText("contributing").closest("a")?.getAttribute("href")).toBeNull();
    expect(screen.getByText("protocol relative").closest("a")?.getAttribute("href")).toBeNull();
  });

  it("resolves relative links against an explicit repository base", () => {
    render(
      <SafeReadme
        markdown="[asset](assets/icon.svg) [licence](../LICENSE) [absolute](/root) [external](https://example.com/docs)"
        baseUrl="https://github.com/example/repo/blob/main/plugins/example/"
      />,
    );
    expect(screen.getByRole("link", { name: "asset" }).getAttribute("href"))
      .toBe("https://github.com/example/repo/blob/main/plugins/example/assets/icon.svg");
    expect(screen.getByRole("link", { name: "licence" }).getAttribute("href"))
      .toBe("https://github.com/example/repo/blob/main/plugins/LICENSE");
    expect(screen.getByText("absolute").closest("a")?.getAttribute("href")).toBeNull();
    expect(screen.getByRole("link", { name: "external" }).getAttribute("href")).toBe("https://example.com/docs");
  });

  it("rejects backslash and scheme-relative links even with a base", () => {
    render(
      <SafeReadme
        markdown={String.raw`[backslash](\evil.example\path) [scheme](//evil.example/x) [mixed](/\evil.example/x) [javascript](javascript:alert(1))`}
        baseUrl="https://github.com/example/repo/blob/main/plugins/example/"
      />,
    );
    for (const name of ["backslash", "scheme", "mixed", "javascript"]) {
      expect(screen.getByText(name).closest("a")?.getAttribute("href")).toBeNull();
    }
  });

  it("derives a base only from an explicit GitHub tree URL", () => {
    expect(readmeBaseUrl("https://github.com/example/repo/tree/main/plugins/example"))
      .toBe("https://github.com/example/repo/blob/main/plugins/example/");
    expect(readmeBaseUrl("https://github.com/example/repo")).toBeUndefined();
    expect(readmeBaseUrl("https://github.com/example/repo/tree/main")).toBeUndefined();
    expect(readmeBaseUrl("http://github.com/example/repo/tree/main/plugins/example")).toBeUndefined();
  });
});
