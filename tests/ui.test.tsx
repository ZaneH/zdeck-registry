import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { READMES, REGISTRY } from "../src/data/registry";
import { parseRegistry } from "../src/lib/registry";
import { DirectoryPage } from "../src/pages/DirectoryPage";
import { PluginPage } from "../src/pages/PluginPage";

afterEach(cleanup);

if (!REGISTRY.ok) throw new Error(REGISTRY.error);
const plugins = REGISTRY.registry.plugins;

const minimalResult = parseRegistry({
  schemaVersion: 1,
  plugins: [{
    id: "minimal",
    license: "MIT",
    repo: "https://github.com/example/minimal",
    readme: "spotify.md",
    status: "preview",
    release: null,
  }],
}, new Set(["spotify.md"]));
if (!minimalResult.ok) throw new Error(minimalResult.error);
const minimal = minimalResult.registry.plugins[0];

describe("directory", () => {
  it("lists the two honest seed entries", () => {
    render(<DirectoryPage plugins={plugins} />);
    expect(screen.getByText("Spotify")).toBeTruthy();
    expect(screen.getByText("Home Assistant")).toBeTruthy();
    expect(screen.getByText("2 entries")).toBeTruthy();
    expect(screen.getByText("0 installable")).toBeTruthy();
  });

  it("filters as the query changes and clears an empty result", () => {
    render(<DirectoryPage plugins={plugins} />);
    fireEvent.change(screen.getByLabelText("Search plugins"), { target: { value: "spotify" } });
    expect(screen.getByText("1 of 2 entries")).toBeTruthy();
    expect(screen.queryByText("Home Assistant")).toBeNull();

    fireEvent.change(screen.getByLabelText("Search plugins"), { target: { value: "printer" } });
    expect(screen.getByText("No plugins match.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Home Assistant")).toBeTruthy();
  });

  it("searches and renders a minimal record without presentation fields", () => {
    const { container } = render(<DirectoryPage plugins={[minimal]} />);
    expect(screen.getByText("minimal")).toBeTruthy();
    expect(container.querySelector(".plugin-summary")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search plugins"), { target: { value: "minimal" } });
    expect(container.querySelector(".catalogue-status")?.textContent).toContain("1 of 1");
  });

  it("combines checkbox categories and publisher filters", () => {
    render(<DirectoryPage plugins={plugins} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "smart-home" }));
    expect(screen.getByText("1 of 2 entries")).toBeTruthy();
    expect(screen.queryByText("Spotify")).toBeNull();
    expect((screen.getByRole("checkbox", { name: "smart-home" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Community" }));
    expect(screen.getByText("No plugins match.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Official" }));
    expect(screen.getByText("Home Assistant")).toBeTruthy();
  });

  it("offers keyboard sort selection and restores focus with Escape", () => {
    render(<DirectoryPage plugins={plugins} />);
    const trigger = screen.getByRole("button", { name: "Sort: Relevance" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Relevance" }));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Date added" }));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    fireEvent.click(document.activeElement!);
    expect(screen.getByRole("button", { name: "Sort: Name" })).toBe(document.activeElement);
    expect(screen.getByRole("button", { name: "Order: A to Z" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sort: Name" }));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sort: Name" }));
  });

  it("retains explicitly selected sorting when typing and includes state in real row links", () => {
    render(<DirectoryPage plugins={plugins} initialState={{ sort: "downloads", order: "asc", origins: ["official"], categories: ["media"] }} />);
    fireEvent.change(screen.getByLabelText("Search plugins"), { target: { value: "spotify" } });
    expect(screen.getByRole("button", { name: "Sort: Downloads" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Order: Lowest first" })).toBeTruthy();
    const row = screen.getByRole("link", { name: /Spotify/ });
    expect(row.getAttribute("href")).toContain("q=spotify");
    expect(row.getAttribute("href")).toContain("category=media");
    expect(row.getAttribute("href")).toContain("origin=official");
    expect(row.getAttribute("href")).toContain("sort=downloads&order=asc");
    expect(row.querySelector("a,button,input")).toBeNull();
    expect(row.textContent).toContain("Downloads —");
  });

  it("renders missing dates honestly and exposes snapshot context without nested row controls", () => {
    const { container } = render(<DirectoryPage plugins={[{ ...minimal, downloads: { count: 0, asOf: "2026-01-01", source: "https://example.invalid/counts" } }]} initialState={{ sort: "updatedAt" }} />);
    expect(screen.getByText("Updated —")).toBeTruthy();
    expect(screen.getByTitle("Snapshot 2026-01-01; source: https://example.invalid/counts").textContent).toContain("Downloads 0");
    expect(container.querySelectorAll(".plugin-row")).toHaveLength(1);
  });

  it("closes the narrow filter disclosure with Escape and restores its trigger", () => {
    render(<DirectoryPage plugins={plugins} />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Official" }), { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});

describe("detail", () => {
  it("shows an unavailable install for an unpublished preview", () => {
    const { container } = render(<PluginPage plugin={minimal} readmes={{ "spotify.md": "# Minimal" }} />);
    const button = screen.getByRole("button", { name: "Install unavailable" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(screen.getByText(/no downloadable \.zdx archive/i)).toBeTruthy();
    expect(screen.getByText("No request is available for this entry.")).toBeTruthy();
  });

  it("keeps a published pilot unavailable without the build allowlist", () => {
    const spotify = plugins.find((plugin) => plugin.id === "spotify");
    if (!spotify) throw new Error("spotify fixture missing");
    const { container } = render(<PluginPage plugin={spotify} readmes={READMES} />);
    expect(screen.getByRole("button", { name: "Install unavailable" })).toBeTruthy();
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(screen.getByText(/not activated for the configured desktop release contract/i)).toBeTruthy();
  });

  it("renders a minimal record without summary or author", () => {
    const { container } = render(<PluginPage plugin={minimal} readmes={{ "spotify.md": "# Minimal" }} />);
    expect(screen.getByRole("heading", { name: /^minimal$/ })).toBeTruthy();
    expect(container.querySelector(".detail-summary")).toBeNull();
    expect(container.querySelector(".detail-meta")?.textContent).toBe("MIT");
    expect(screen.getByRole("button", { name: "Install unavailable" })).toBeTruthy();
  });

  it("renders a missing README as a visible error without hiding the install state", () => {
    const spotify = plugins.find((plugin) => plugin.id === "spotify");
    if (!spotify) throw new Error("spotify fixture missing");
    render(<PluginPage plugin={spotify} readmes={{}} />);
    expect(screen.getByText("README unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Install unavailable" })).toBeTruthy();
  });
});
