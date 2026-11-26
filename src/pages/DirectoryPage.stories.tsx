import type { Meta, StoryObj } from "@storybook/react-vite";
import { DirectoryPage } from "./DirectoryPage";
import { PLUGINS } from "../stories/fixtures";

const meta = {
  title: "Registry/Directory",
  component: DirectoryPage,
  parameters: { layout: "fullscreen" },
  args: { plugins: PLUGINS },
} satisfies Meta<typeof DirectoryPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: { initialQuery: "spotify" },
};

export const NoMatches: Story = {
  args: { initialQuery: "printer" },
};

export const EmptyRegistry: Story = {
  args: { plugins: [] },
};

export const Narrow: Story = {
  render: (args) => (
    <div style={{ maxWidth: 390, margin: "0 auto", border: "1px solid var(--border)" }}>
      <DirectoryPage {...args} />
    </div>
  ),
};
