import type { PluginRecord } from "../lib/registry";

// Fictional catalogue and snapshot values for UI/tests only; never imported by the app.
const snapshot = (count: number) => ({ count, asOf: "2026-01-01", source: "https://example.invalid/fictional-snapshots" });
const base: PluginRecord = {
  id: "fictional", name: "Fictional", summary: "Fictional Storybook fixture, not an available plugin.",
  author: "", license: "MIT", repo: "https://example.invalid/fictional", readme: "fictional.md", status: "preview", release: null,
};
export const DIRECTORY_FIXTURES: PluginRecord[] = [
  { ...base, id: "echo", name: "Echo", tags: ["media"], provenance: { kind: "official", evidence: "https://example.invalid/fictional-maintainer" }, downloads: snapshot(1200), githubStars: snapshot(42), addedAt: "2025-01-01", updatedAt: "2026-01-01" },
  { ...base, id: "echo-tools", name: "Echo Tools", tags: ["media", "utilities"], downloads: snapshot(95), githubStars: snapshot(120), addedAt: "2025-02-01", updatedAt: "2025-12-01" },
  { ...base, id: "deck-echo", name: "Deck Echo", tags: ["smart-home"], provenance: { kind: "community" }, downloads: snapshot(0), githubStars: snapshot(0), addedAt: "2025-03-01", updatedAt: "2025-11-01" },
  { ...base, id: "audio-pad", name: "Audio Pad", summary: "Fictional controls for echo and audio.", tags: ["media"], downloads: snapshot(1200), githubStars: snapshot(42), addedAt: "2025-01-01", updatedAt: "2026-01-01" },
  { ...base, id: "media-bridge", name: "Media Bridge", tags: ["echo", "smart-home"] },
  { ...base, id: "unknown", name: "Unknown metrics", tags: ["utilities"] },
];
export const LONG_NAMES: PluginRecord[] = [
  { ...base, id: "long", name: "AnExtremelyLongUnbrokenPluginNameThatStillNeedsToFitInTheDirectoryWithoutOverflow", summary: "A fictional long summary with enough detail to wrap onto multiple lines at narrow widths.", tags: ["an-unusually-long-category-name"], downloads: snapshot(9007199254740991) },
  ...DIRECTORY_FIXTURES,
];
export const MAX_CATALOGUE: PluginRecord[] = Array.from({ length: 500 }, (_, index) => ({
  ...base, id: `fixture-${index}`, name: `Fictional plugin ${index.toString().padStart(3, "0")}`,
  summary: "Fictional 500-record catalogue for local interaction checks.", tags: [index % 2 ? "media" : "utilities"],
}));
