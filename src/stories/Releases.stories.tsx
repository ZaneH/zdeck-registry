import type { Meta, StoryObj } from "@storybook/react-vite";
import { PluginPage } from "../pages/PluginPage";
import type { PluginRecord } from "../lib/registry";

const plugin: PluginRecord = { id: "fixture-only", version: "1.2.3", name: "Fixture only", summary: "Storybook simulation, not a published plugin.", author: "", license: "MIT", repo: "https://source.example.test/fixture-only", platforms: ["macOS", "Windows", "Linux"], runtime: { language: "node", minimum: "22.18.0" }, readme: "fixture-only.md", status: "published", release: { record: "releases/fixture-only/1.2.3.json" } };
const meta = { title: "Registry/Release handoff", component: PluginPage, parameters: { layout: "fullscreen" }, args: { plugin, readmes: { "fixture-only.md": "# Fixture only\n\nNo artifact exists. This is a Storybook-only app-ready rendering fixture, not a registry release or install test. Do not follow the OS link." } } } satisfies Meta<typeof PluginPage>;
export default meta;
type Story = StoryObj<typeof meta>;
// Only .storybook/main.ts allows this exact fictional identity for rendering; production stays closed.
export const AppReady: Story = {};
export const PublishedUnready: Story = { args: { plugin: { ...plugin, version: "1.2.4", release: { record: "releases/fixture-only/1.2.4.json" } } } };
export const Preview: Story = { args: { plugin: { ...plugin, status: "preview", release: null } } };
