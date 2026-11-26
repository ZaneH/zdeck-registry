import { useEffect } from "react";
import type { ReactNode } from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";

function Theme({ theme, children }: { theme: unknown; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }, [theme]);
  return <div style={{ padding: 16 }}>{children}</div>;
}

const preview: Preview = {
  initialGlobals: { theme: "dark" },
  globalTypes: {
    theme: {
      description: "Registry theme",
      toolbar: {
        icon: "paintbrush",
        dynamicTitle: true,
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <Theme theme={context.globals.theme}>
        <Story />
      </Theme>
    ),
  ],
};

export default preview;
