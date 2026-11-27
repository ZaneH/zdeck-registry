import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  // Storybook-only allowlist: never a production signature or activation of a seed entry.
  viteFinal: async (config) => ({ ...config, define: { ...config.define, __ZDECK_APP_READY_RELEASES__: JSON.stringify(["fixture-only@1.2.3"]) } }),
};

export default config;
