import { READMES, REGISTRY } from "../data/registry";
import type { PluginRecord } from "../lib/registry";

if (!REGISTRY.ok) throw new Error(`Storybook fixtures need a valid registry: ${REGISTRY.error}`);

export const PLUGINS = REGISTRY.registry.plugins;
export const READMES_FIXTURE = READMES;

export const spotify = PLUGINS.find((plugin) => plugin.id === "spotify") as PluginRecord;
export const homeAssistant = PLUGINS.find((plugin) => plugin.id === "home-assistant") as PluginRecord;
