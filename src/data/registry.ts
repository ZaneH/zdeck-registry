import registryJson from "../../registry/plugins.json";
import homeAssistantReadme from "../../registry/readmes/home-assistant.md?raw";
import spotifyReadme from "../../registry/readmes/spotify.md?raw";
import { parseRegistry } from "../lib/registry";

/** READMEs are imported at build time; the site never fetches an arbitrary README URL. */
export const READMES: Readonly<Record<string, string>> = {
  "home-assistant.md": homeAssistantReadme,
  "spotify.md": spotifyReadme,
};

export const REGISTRY = parseRegistry(registryJson, new Set(Object.keys(READMES)));
