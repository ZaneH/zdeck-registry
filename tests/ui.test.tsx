import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { READMES, REGISTRY } from "../src/data/registry";
import { DirectoryPage } from "../src/pages/DirectoryPage";
import { PluginPage } from "../src/pages/PluginPage";

afterEach(cleanup);

if (!REGISTRY.ok) throw new Error(REGISTRY.error);
const plugins = REGISTRY.registry.plugins;

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

  it("renders a missing README as a visible error without hiding the install state", () => {
    const spotify = plugins.find((plugin) => plugin.id === "spotify");
    if (!spotify) throw new Error("spotify fixture missing");
    render(<PluginPage plugin={spotify} readmes={{}} />);
    expect(screen.getByText("README unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Install unavailable" })).toBeTruthy();
  });
});
