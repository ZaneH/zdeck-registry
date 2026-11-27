import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
// Simulate the build-generated allowlist, not a signature field or renderer network response.
vi.hoisted(() => { (globalThis as unknown as Record<string, unknown>).__ZDECK_APP_READY_RELEASES__ = ["fixture@1.2.3"]; });
import { PluginPage } from "../src/pages/PluginPage";
import type { PluginRecord } from "../src/lib/registry";
afterEach(cleanup);
const plugin: PluginRecord = { id: "fixture", version: "1.2.3", name: "Fixture only", summary: "", author: "", license: "MIT", repo: "https://source.example.test/fixture", readme: "fixture.md", status: "published", runtime: { language: "node", minimum: "22.18.0" }, platforms: ["macOS"], release: { record: "releases/fixture/1.2.3.json" } };
describe("app-ready website rendering", () => {
  it("offers only the exact build-verified published identity as an untrusted OS handoff", () => {
    render(<PluginPage plugin={plugin} readmes={{ "fixture.md": "# Fixture only" }} />);
    expect(screen.getByRole("link", { name: "Install in zDeck" }).getAttribute("href")).toBe("zdeck://plugins/install?id=fixture&version=1.2.3");
    expect(screen.getByText(/each need your confirmation/)).toBeTruthy();
  });
  it("keeps other versions and preview entries disabled despite a ready fixture identity", () => {
    for (const p of [{ ...plugin, version: "1.2.4" }, { ...plugin, status: "preview" as const, release: null }]) {
      const view = render(<PluginPage plugin={p} readmes={{ "fixture.md": "# Fixture only" }} />);
      expect((screen.getByRole("button", { name: "Install unavailable" }) as HTMLButtonElement).disabled).toBe(true);
      expect(view.container.querySelector('a[href^="zdeck://"]')).toBeNull(); cleanup();
    }
  });
});
