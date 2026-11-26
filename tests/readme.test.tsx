import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SafeReadme } from "../src/lib/readme";

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

  it("keeps relative links relative and rejects protocol-relative URLs", () => {
    render(<SafeReadme markdown="[contributing](./CONTRIBUTING.md) [protocol relative](//example.com/x)" />);
    expect(screen.getByRole("link", { name: "contributing" }).getAttribute("href")).toBe("./CONTRIBUTING.md");
    expect(screen.getByText("protocol relative").closest("a")?.getAttribute("href")).toBeNull();
  });
});
