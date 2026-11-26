import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotFoundPage, RegistryErrorPage } from "../App";

const meta = {
  title: "Registry/States",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const RegistryError: Story = {
  render: () => <RegistryErrorPage error="A plugin record is malformed or references an unknown README." />,
};

export const NotFound: Story = {
  render: () => <NotFoundPage />,
};
