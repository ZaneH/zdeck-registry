import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const port = 1431;
const base = `http://127.0.0.1:${port}`;
const executablePath = process.env.CHROME_BIN ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

if (!existsSync(executablePath)) {
  console.error(`Browser not found at ${executablePath}. Set CHROME_BIN to a Chromium-based browser.`);
  process.exit(1);
}

const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let serverError = "";
server.stderr.on("data", (chunk) => { serverError += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Vite preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not start.\n${serverError}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  const externalRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      externalRequests.push(request.url());
    }
  });

  await page.goto(`${base}/#/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Plugins for zDeck." }).waitFor();
  await page.getByText("Spotify", { exact: true }).first().waitFor();
  await page.getByText("Home Assistant", { exact: true }).first().waitFor();
  assert(await page.getByText("0 installable").isVisible(), "Directory should state that nothing is installable.");

  const search = page.getByLabel("Search plugins");
  await search.fill("printer");
  await page.getByText("No plugins match.").waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByText("Home Assistant", { exact: true }).first().waitFor();

  await page.getByRole("link", { name: /Home Assistant/ }).click();
  await page.getByRole("heading", { name: "Home Assistant", exact: true }).waitFor();
  const homeInstall = page.getByRole("button", { name: "Install unavailable" });
  assert(await homeInstall.isDisabled(), "Unavailable install must be disabled.");
  await page.getByText("Desktop request").click();
  await page.getByText("zdeck://plugins/install?id=home-assistant&version=0.2.0", { exact: true }).waitFor();
  assert(await page.locator('a[href^="zdeck://"]').count() === 0, "Staged pilot must not expose an active install link.");
  await page.screenshot({ path: "/tmp/zdeck-registry-ha-pilot.png", fullPage: true });

  await page.getByRole("link", { name: "All plugins" }).click();
  await page.getByRole("link", { name: /Spotify/ }).click();
  await page.getByRole("heading", { name: "Spotify", exact: true }).waitFor();
  assert(await page.getByRole("button", { name: "Install unavailable" }).isDisabled(), "Spotify install must be disabled.");
  assert(await page.locator('a[href^="zdeck://"]').count() === 0, "No active zdeck:// link may be rendered.");
  assert(await page.locator("img").count() === 0, "README images should not render.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Plugins for zDeck." }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `Narrow layout overflows horizontally by ${overflow}px.`);
  assert(externalRequests.length === 0, `Unexpected external requests: ${externalRequests.join(", ")}`);

  await page.screenshot({ path: "/tmp/zdeck-registry-smoke-narrow.png", fullPage: true });
  console.log("smoke passed: directory, search, empty, detail, disabled install, safe README, narrow layout");
  console.log("screenshot: /tmp/zdeck-registry-smoke-narrow.png");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
