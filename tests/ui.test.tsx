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

  it("filters with keyboard-operable tag buttons", () => {
    render(<DirectoryPage plugins={plugins} />);
    fireEvent.click(screen.getByRole("button", { name: "smart-home" }));
    expect(screen.getByText("1 of 2 entries")).toBeTruthy();
    expect(screen.queryByText("Spotify")).toBeNull();
    expect(screen.getByRole("button", { name: "smart-home" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("detail", () => {
  it("shows an unavailable install for an unpublished preview", () => {
    const spotify = plugins.find((plugin) => plugin.id === "spotify");
    if (!spotify) throw new Error("spotify fixture missing");
    const { container } = render(<PluginPage plugin={spotify} readmes={READMES} />);
    const button = screen.getByRole("button", { name: "Install unavailable" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(screen.getByText(/no downloadable \.zdx archive/i)).toBeTruthy();
    expect(screen.getByText("No request is available for this entry.")).toBeTruthy();
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
