import type { Meta, StoryObj } from "@storybook/react-vite";
import { PluginPage } from "./PluginPage";
import { homeAssistant, READMES_FIXTURE, spotify } from "../stories/fixtures";

const meta = {
  title: "Registry/Detail",
  component: PluginPage,
  parameters: { layout: "fullscreen" },
  args: { plugin: spotify, readmes: READMES_FIXTURE },
} satisfies Meta<typeof PluginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpotifyPublished: Story = {};

export const PendingRelease: Story = {
  args: { plugin: homeAssistant },
};

export const MissingReadme: Story = {
  args: { readmes: {} },
};

export const Narrow: Story = {
  render: (args) => (
    <div style={{ maxWidth: 390, margin: "0 auto", border: "1px solid var(--border)" }}>
      <PluginPage {...args} />
    </div>
  ),
};
