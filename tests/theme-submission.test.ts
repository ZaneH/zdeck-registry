import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { buildThemes } from "../scripts/themes";

it("accepts a generated community submission with the authentic standard previews", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "zdeck-theme-submission-")));
  try {
    const metadata = join(root, "metadata.json");
    const readme = join(root, "README.md");
    const output = join(root, "submission");
    writeFileSync(metadata, JSON.stringify({ id: "sample-theme", name: "Sample theme", summary: "Integration test only.", author: "Test", license: "MIT" }));
    writeFileSync(readme, "# Sample theme\nTest input, not a published theme.\n");
    execFileSync("python3", ["-B", "scripts/theme_submission.py", "--metadata", metadata, "--readme", readme,
      "--desktop-preview", "registry/previews/terminal/desktop.png", "--phone-preview", "registry/previews/terminal/phone.png",
      "--repo", "https://github.com/example/theme", "--commit", "a".repeat(40), "--output", output], { timeout: 10_000 });
    const [theme] = buildThemes(output);
    expect(theme).toMatchObject({ id: "sample-theme", kind: "source-preview", sourceCommit: "a".repeat(40),
      preview: { fixture: "zdeck-sample-deck-1", desktop: { src: "previews/sample-theme/desktop.png" } } });
    expect(theme).not.toHaveProperty("builtin");
    expect(theme).not.toHaveProperty("release");
    expect(readFileSync(join(output, "registry/previews/sample-theme/phone.png")))
      .toEqual(readFileSync("registry/previews/terminal/phone.png"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
