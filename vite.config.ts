import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildReleases } from "./scripts/releases";

export default defineConfig(() => {
  const { records, ready } = buildReleases(fileURLToPath(new URL(".", import.meta.url)));
  return {
    plugins: [react(), {
      name: "immutable-signed-releases",
      generateBundle() {
        for (const [fileName, source] of records) this.emitFile({ type: "asset", fileName, source });
      },
    }],
    define: { __ZDECK_APP_READY_RELEASES__: JSON.stringify(ready) },
    server: { port: 1430, strictPort: true },
  };
});
