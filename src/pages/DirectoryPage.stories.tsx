import type { Meta, StoryObj } from "@storybook/react-vite";
import { DirectoryPage } from "./DirectoryPage";
import { PLUGINS } from "../stories/fixtures";
import { DIRECTORY_FIXTURES, LONG_NAMES, MAX_CATALOGUE } from "../stories/directoryFixtures";

const meta = {
  title: "Registry/Directory",
  component: DirectoryPage,
  parameters: { layout: "fullscreen" },
  args: { plugins: PLUGINS },
  decorators: [(Story, context) => <>{context.args.plugins !== PLUGINS ? <p style={{ padding: "8px 28px", color: "var(--warning)" }}>Fictional Storybook fixtures. Counts, dates and publisher labels are not production data.</p> : null}<Story /></>],
} satisfies Meta<typeof DirectoryPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filtered: Story = { args: { initialState: { query: "spotify" } } };
export const NoMatches: Story = { args: { initialState: { query: "printer" } } };
export const EmptyRegistry: Story = { args: { plugins: [] } };
export const SearchRelevance: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { query: "echo" } } };
export const Downloads: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { sort: "downloads" } } };
export const StarsAscending: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { sort: "githubStars", order: "asc" } } };
export const RecentlyUpdated: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { sort: "updatedAt" } } };
export const DateAdded: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { sort: "addedAt", order: "asc" } } };
export const Official: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { origins: ["official"] } } };
export const Community: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { origins: ["community"] } } };
export const MixedCategories: Story = { args: { plugins: DIRECTORY_FIXTURES, initialState: { categories: ["media", "smart-home"], origins: ["community"] } } };
export const UnknownMetrics: Story = { args: { initialState: { sort: "downloads" } } };
export const Narrow: Story = {
  render: (args) => <div style={{ maxWidth: 390, margin: "0 auto" }}><DirectoryPage {...args} /></div>,
};
export const LongNames: Story = { args: { plugins: LONG_NAMES } };
export const MaximumCatalogue: Story = { args: { plugins: MAX_CATALOGUE } };
