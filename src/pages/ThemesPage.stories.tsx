import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemesPage } from "./ThemesPage";
import { THEME_PREVIEW_URLS } from "../data/themes";
import { LONG_THEME_NAMES, SOURCE_PREVIEW_FIXTURE, THEME_ENTRIES } from "../stories/themeFixtures";

const meta = {
  title: "Registry/Themes",
  component: ThemesPage,
  parameters: { layout: "fullscreen" },
  args: { themes: THEME_ENTRIES, previews: THEME_PREVIEW_URLS },
  decorators: [(Story, context) => <>{context.args.themes !== THEME_ENTRIES ? <p style={{ padding: "8px 28px", color: "var(--warning)" }}>Fictional Storybook fixtures. They are not production catalogue entries.</p> : null}<Story /></>],
} satisfies Meta<typeof ThemesPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filtered: Story = { args: { initialState: { query: "phosphor" } } };
export const NoMatches: Story = { args: { initialState: { query: "printer" } } };
export const EmptyCatalogue: Story = { args: { themes: [] } };
export const IncludedOnly: Story = { args: { initialState: { origins: ["built-in"] } } };
export const SourcePreview: Story = { args: { themes: [SOURCE_PREVIEW_FIXTURE] } };
export const LongNames: Story = { args: { themes: LONG_THEME_NAMES } };
export const Narrow: Story = {
  render: (args) => <div style={{ maxWidth: 390, margin: "0 auto" }}><ThemesPage {...args} /></div>,
};
