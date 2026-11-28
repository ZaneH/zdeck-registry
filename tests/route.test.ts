import { describe, expect, it } from "vitest";
import { parseRoute } from "../src/App";

describe("hash routes", () => {
  it("treats empty and root hashes as the directory", () => {
    expect(parseRoute("")).toEqual({ kind: "directory" });
    expect(parseRoute("#/")).toEqual({ kind: "directory" });
  });

  it("keeps route identity independent of directory query state", () => {
    expect(parseRoute("#/?q=spotify&sort=downloads")).toEqual({ kind: "directory" });
    expect(parseRoute("#/plugin/spotify?q=spotify&category=media")).toEqual({ kind: "plugin", id: "spotify" });
    expect(parseRoute("#/themes?q=glass&origin=built-in")).toEqual({ kind: "themes" });
    expect(parseRoute("#/theme/glass?q=glass")).toEqual({ kind: "theme", id: "glass" });
  });

  it("decodes a plugin or theme id", () => {
    expect(parseRoute("#/plugin/home-assistant")).toEqual({ kind: "plugin", id: "home-assistant" });
    expect(parseRoute("#/plugin/%E2%9C%93")).toEqual({ kind: "plugin", id: "✓" });
    expect(parseRoute("#/theme/terminal")).toEqual({ kind: "theme", id: "terminal" });
  });

  it("rejects extra segments and malformed escapes", () => {
    expect(parseRoute("#/plugin/spotify/extra")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/theme/glass/extra")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/plugin/%E0%A4%A")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/themes/extra")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/elsewhere")).toEqual({ kind: "not-found" });
  });
});
