import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import terminal from "../registry/themes/terminal.json";
import { THEMES, THEME_PREVIEW_URLS, THEME_READMES } from "../src/data/themes";
import { parseThemes } from "../src/lib/themes";
import { ThemePage } from "../src/pages/ThemePage";
import { DirectoryPage } from "../src/pages/DirectoryPage";
import { REGISTRY } from "../src/data/registry";
import { ThemesPage } from "../src/pages/ThemesPage";

afterEach(cleanup);

if (!THEMES.ok) throw new Error(THEMES.error);
const themes = THEMES.themes.themes;
const source = (() => {
  const record = structuredClone(terminal) as unknown as Record<string, unknown>;
  record.id = "community-fixture";
  record.name = "Community Fixture";
  record.kind = "source-preview";
  record.provenance = { kind: "community" };
  delete record.builtin;
  record.preview = {
    fixture: "zdeck-sample-deck-1",
    desktop: { src: "previews/community-fixture/desktop.png", alt: "Community fixture desktop preview" },
    phone: { src: "previews/community-fixture/phone.png", alt: "Community fixture phone preview" },
  };
  const result = parseThemes([record], new Set(["terminal.md"]), new Set([
    "previews/community-fixture/desktop.png", "previews/community-fixture/phone.png",
  ]));
  if (!result.ok) throw new Error(result.error);
  return result.themes.themes[0];
})();
const sourcePreviews = {
  "previews/community-fixture/desktop.png": "/assets/community-desktop.png",
  "previews/community-fixture/phone.png": "/assets/community-phone.png",
};

describe("theme directory", () => {
  it("lists the built-in appearances without download or popularity metrics", () => {
    const { container } = render(<ThemesPage themes={themes} previews={THEME_PREVIEW_URLS} />);
    expect(screen.getByRole("heading", { name: "Themes for zDeck." })).toBeTruthy();
    expect(screen.getByText("Glass")).toBeTruthy();
    expect(screen.getByText("Wasteland Terminal")).toBeTruthy();
    expect(screen.getByText("2 entries")).toBeTruthy();
    expect(screen.getByText("2 included in zDeck")).toBeTruthy();
    expect(screen.getAllByText("Included in zDeck").length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toContain("Downloads");
    expect(container.textContent).not.toContain("GitHub stars");
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(screen.getByRole("link", { name: /Glass/ }).getAttribute("href")).toBe("#/theme/glass");
    expect(screen.getByRole("link", { name: /Glass/ }).querySelector("a,button,input")).toBeNull();
    expect(container.querySelectorAll("img.theme-thumb")).toHaveLength(2);
    expect(container.querySelectorAll('img[src][alt=""]')).toHaveLength(2);
  });

  it("searches and filters by source kind and categories", () => {
    render(<ThemesPage themes={themes} previews={THEME_PREVIEW_URLS} />);
    fireEvent.change(screen.getByLabelText("Search themes"), { target: { value: "phosphor" } });
    expect(screen.getByText("1 of 2 entries")).toBeTruthy();
    expect(screen.queryByText("Glass")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search themes"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Source preview" }));
    expect(screen.getByText("No themes match.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Source preview" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "monospace" }));
    expect(screen.getByText("1 of 2 entries")).toBeTruthy();
    expect(screen.queryByText("Glass")).toBeNull();
  });

  it("ignores plugin-only origin filters in a shared theme URL", () => {
    render(<ThemesPage themes={themes} previews={THEME_PREVIEW_URLS} initialState={{ origins: ["official", "community"] }} />);
    expect(screen.getByText("2 entries")).toBeTruthy();
    expect(screen.queryByText("No themes match.")).toBeNull();
  });

  it("ignores theme-only origin filters in a shared plugin URL", () => {
    if (!REGISTRY.ok) throw new Error(REGISTRY.error);
    const { container } = render(<DirectoryPage plugins={REGISTRY.registry.plugins} initialState={{ origins: ["built-in", "source-preview"] }} />);
    expect(container.querySelectorAll(".plugin-list > li")).toHaveLength(REGISTRY.registry.plugins.length);
    expect(screen.queryByText("No plugins match.")).toBeNull();
  });

  it("offers only honest theme sorts", () => {
    render(<ThemesPage themes={themes} previews={THEME_PREVIEW_URLS} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort: Relevance" }));
    expect(screen.getByRole("menuitemradio", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "Date added" })).toBeTruthy();
    expect(screen.queryByRole("menuitemradio", { name: "Downloads" })).toBeNull();
    expect(screen.queryByRole("menuitemradio", { name: "GitHub stars" })).toBeNull();
  });
});

describe("theme detail", () => {
  it("shows included built-ins with local previews, exact Appearance guidance and no install action", () => {
    const glass = themes.find((theme) => theme.id === "glass");
    if (!glass) throw new Error("Glass seed is missing.");
    const { container } = render(
      <ThemePage theme={glass} readmes={THEME_READMES} previews={THEME_PREVIEW_URLS} directoryHref="#/themes?q=glass" />,
    );
    expect(screen.getAllByRole("heading", { name: "Glass" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Included in zDeck").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Settings → Appearance");
    expect(container.textContent).toContain("choose Glass");
    expect(container.textContent).toContain("Theme → Glass");
    expect(screen.getAllByText("Built-in appearance").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "All themes" }).getAttribute("href")).toBe("#/themes?q=glass");
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("alt")).toContain("graphite and silver");
    expect(images[0].getAttribute("src")).toBe(THEME_PREVIEW_URLS["previews/glass/desktop.png"]);
    expect(images[1].getAttribute("alt")).toContain("phone");
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(container.querySelector('a[href*="install"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Install/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Install/ })).toBeNull();
  });

  it("shows a source preview as uninstalled documentation", () => {
    const { container } = render(
      <ThemePage theme={source} readmes={THEME_READMES} previews={sourcePreviews} />,
    );
    expect(screen.getAllByText("Source preview").length).toBeGreaterThan(0);
    expect(screen.getByText(/No installable theme package exists/)).toBeTruthy();
    expect(screen.getByText(/no package format, download, or install action/)).toBeTruthy();
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(container.querySelector('a[href^="zdeck://"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Install/ })).toBeNull();
  });
});
