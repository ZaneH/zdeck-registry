import { THEMES } from "../data/themes";
import type { ThemeRecord } from "../lib/themes";

if (!THEMES.ok) throw new Error(`Storybook theme fixtures need a valid catalogue: ${THEMES.error}`);

export const THEME_ENTRIES = THEMES.themes.themes;

/** Clearly fictional source-preview state; it reuses a real local built-in preview image. */
export const SOURCE_PREVIEW_FIXTURE: ThemeRecord = {
  ...THEME_ENTRIES[1],
  id: "community-preview",
  name: "Community preview (fixture)",
  summary: "Fictional Storybook entry for a source-preview layout. The image is Wasteland Terminal, not this record's theme.",
  kind: "source-preview",
  provenance: { kind: "community" },
  builtin: undefined,
  tags: ["appearance", "fixture"],
};

export const LONG_THEME_NAMES: ThemeRecord[] = [
  { ...THEME_ENTRIES[0], id: "long", name: "AnExtremelyLongUnbrokenThemeNameThatStillNeedsToFitInTheDirectoryWithoutOverflow" },
  ...THEME_ENTRIES,
];
