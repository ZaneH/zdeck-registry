import { parseThemeFiles } from "../lib/themes";

const records = import.meta.glob("../../registry/themes/*.json", { eager: true, import: "default" });

/** Local build-time input only; new theme entries need no handwritten import list. */
const inputs = import.meta.glob<string>("../../registry/theme-readmes/*.md", { eager: true, query: "?raw", import: "default" });
export const THEME_READMES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(inputs).map(([path, markdown]) => [path.slice(path.lastIndexOf("/") + 1), markdown]),
);

const images = import.meta.glob<string>("../../registry/previews/*/*.png", { eager: true, query: "?url", import: "default" });
/** Catalogue-relative path to the local Vite-built asset URL. Never a remote image. */
export const THEME_PREVIEW_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(images).map(([path, url]) => [path.slice(path.lastIndexOf("previews/")), url]),
);

export const THEMES = parseThemeFiles(Object.fromEntries(
  Object.entries(records).map(([path, record]) => [path.slice(path.lastIndexOf("/") + 1), record]),
), new Set(Object.keys(THEME_READMES)), new Set(Object.keys(THEME_PREVIEW_URLS)));
