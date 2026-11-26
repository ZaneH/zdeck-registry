import type { Meta, StoryObj } from "@storybook/react-vite";
import { SafeReadme } from "../lib/readme";

const unsafe = `# Unsafe input

This story renders hostile README content through the same safe path as the registry.

<script>alert("not executed")</script>
<iframe src="https://example.com/embed"></iframe>

![tracking pixel](https://example.com/tracking.png)

[bad link](javascript:alert("not executed"))

[external link](https://example.com/docs)

| Safe | Note |
| --- | --- |
| tables | still render |
`;

const meta = {
  title: "Registry/README",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostileMarkdown: Story = {
  render: () => (
    <main className="page">
      <div style={{ maxWidth: 640, paddingTop: 24 }}>
        <SafeReadme markdown={unsafe} />
      </div>
    </main>
  ),
};
