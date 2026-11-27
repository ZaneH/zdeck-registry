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
  });

  it("decodes a plugin id", () => {
    expect(parseRoute("#/plugin/home-assistant")).toEqual({ kind: "plugin", id: "home-assistant" });
    expect(parseRoute("#/plugin/%E2%9C%93")).toEqual({ kind: "plugin", id: "✓" });
  });

  it("rejects extra segments and malformed escapes", () => {
    expect(parseRoute("#/plugin/spotify/extra")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/plugin/%E0%A4%A")).toEqual({ kind: "not-found" });
    expect(parseRoute("#/elsewhere")).toEqual({ kind: "not-found" });
  });
});
