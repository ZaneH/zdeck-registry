import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemePage } from "./ThemePage";
import { THEME_PREVIEW_URLS, THEME_READMES } from "../data/themes";
import { SOURCE_PREVIEW_FIXTURE, THEME_ENTRIES } from "../stories/themeFixtures";

const meta = {
  title: "Registry/Theme detail",
  component: ThemePage,
  parameters: { layout: "fullscreen" },
  args: { theme: THEME_ENTRIES[0], readmes: THEME_READMES, previews: THEME_PREVIEW_URLS },
} satisfies Meta<typeof ThemePage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GlassIncluded: Story = {};

export const WastelandTerminalIncluded: Story = {
  args: { theme: THEME_ENTRIES[1] },
};

export const SourcePreview: Story = {
  args: { theme: SOURCE_PREVIEW_FIXTURE },
  decorators: [(Story) => <><p style={{ padding: "8px 28px", color: "var(--warning)" }}>Fictional Storybook fixture. The preview image belongs to Wasteland Terminal, not this record's theme.</p><Story /></>],
};

export const MissingReadme: Story = {
  args: { readmes: {} },
};

export const Narrow: Story = {
  render: (args) => (
    <div style={{ maxWidth: 390, margin: "0 auto", border: "1px solid var(--border)" }}>
      <ThemePage {...args} />
    </div>
  ),
};
