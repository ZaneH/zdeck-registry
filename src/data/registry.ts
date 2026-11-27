import registryJson from "../../registry/plugins.json";
import { parseRegistry } from "../lib/registry";

/** Local build-time input only; new catalogue entries need no handwritten import list. */
const inputs = import.meta.glob<string>("../../registry/readmes/*.md", { eager: true, query: "?raw", import: "default" });
export const READMES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(inputs).map(([path, markdown]) => [path.slice(path.lastIndexOf("/") + 1), markdown]),
);
export const REGISTRY = parseRegistry(registryJson, new Set(Object.keys(READMES)));
