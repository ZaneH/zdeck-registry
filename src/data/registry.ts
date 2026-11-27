import { parsePluginFiles } from "../lib/registry";

const records = import.meta.glob("../../registry/plugins/*.json", { eager: true, import: "default" });

/** Local build-time input only; new catalogue entries need no handwritten import list. */
const inputs = import.meta.glob<string>("../../registry/readmes/*.md", { eager: true, query: "?raw", import: "default" });
export const READMES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(inputs).map(([path, markdown]) => [path.slice(path.lastIndexOf("/") + 1), markdown]),
);
export const REGISTRY = parsePluginFiles(Object.fromEntries(
  Object.entries(records).map(([path, record]) => [path.slice(path.lastIndexOf("/") + 1), record]),
), new Set(Object.keys(READMES)));
