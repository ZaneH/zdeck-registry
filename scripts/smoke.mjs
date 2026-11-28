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
  assert(await page.getByText("2 installable").isVisible(), "Exactly the two macOS pilots should be installable.");

  const search = page.getByLabel("Search plugins");
  await search.fill("printer");
  await page.getByText("No plugins match.").waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByText("Home Assistant", { exact: true }).first().waitFor();

  await page.getByRole("link", { name: /Home Assistant/ }).click();
  await page.getByRole("heading", { name: "Home Assistant", exact: true }).waitFor();
  const homeInstall = page.getByRole("link", { name: "Install in zDeck" });
  assert(await homeInstall.getAttribute("href") === "zdeck://plugins/install?id=home-assistant&version=0.2.0", "Pilot must offer only its exact identity.");
  await page.getByText("Desktop request").click();
  await page.getByText("zdeck://plugins/install?id=home-assistant&version=0.2.0", { exact: true }).waitFor();
  assert(await page.locator('a[href^="zdeck://"]').count() === 1, "Exactly one active install link may be rendered.");
  assert(await page.locator('dl.facts dt:text-is("Platform") + dd').textContent() === "macOS", "HA must claim macOS only.");
  await page.screenshot({ path: "/tmp/zdeck-registry-ha-pilot.png", fullPage: true });

  await page.getByRole("link", { name: "All plugins" }).click();
  await page.getByRole("link", { name: /Spotify/ }).click();
  await page.getByRole("heading", { name: "Spotify", exact: true }).first().waitFor();
  const spotifyInstall = page.getByRole("link", { name: "Install in zDeck" });
  assert(await spotifyInstall.getAttribute("href") === "zdeck://plugins/install?id=spotify&version=0.1.0", "Spotify must offer only its exact identity.");
  await page.getByText("Desktop request").click();
  await page.getByText("zdeck://plugins/install?id=spotify&version=0.1.0", { exact: true }).waitFor();
  assert(await page.locator('a[href^="zdeck://"]').count() === 1, "Exactly one active install link may be rendered.");
  assert(await page.locator('dl.facts dt:text-is("Platform") + dd').textContent() === "macOS", "Spotify must claim macOS only.");
  assert(await page.locator('dl.facts dd').filter({ hasText: /Windows|Linux/ }).count() === 0, "Spotify must not claim unverified platforms.");
  assert(await page.locator("img").count() === 0, "README images should not render.");

  // Themes are a separate category with the same directory chrome, local previews and no install action.
  await page.getByRole("link", { name: "Themes", exact: true }).click();
  await page.getByRole("heading", { name: "Themes for zDeck." }).waitFor();
  assert(await page.getByRole("link", { name: "Themes", exact: true }).getAttribute("aria-current") === "page", "Themes nav must expose aria-current.");
  assert(await page.getByRole("link", { name: "Plugins", exact: true }).getAttribute("aria-current") === null, "Inactive plugin nav must not be current.");
  await page.getByText("Glass", { exact: true }).first().waitFor();
  await page.getByText("Wasteland Terminal", { exact: true }).first().waitFor();
  assert(await page.getByText("2 included in zDeck").isVisible(), "Both built-in themes must say they are included.");
  const thumbs = page.locator("img.theme-thumb");
  assert(await thumbs.count() === 2, "The theme directory must show two local desktop previews.");
  await page.waitForFunction(() => [...document.querySelectorAll("img.theme-thumb")].every((image) => image.complete && image.naturalWidth > 0));
  const thumbSizes = await thumbs.evaluateAll((images) => images.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight })));
  assert(thumbSizes.every(({ width, height }) => width === 1200 && height === 800), `Theme thumbnails did not load 1200x800: ${JSON.stringify(thumbSizes)}`);
  assert(await page.locator('a[href^="zdeck://"]').count() === 0, "Themes must not render a theme deep link.");
  assert(await page.getByRole("button", { name: /Install/ }).count() === 0, "Themes must not render an install button.");

  const themeSearch = page.getByLabel("Search themes");
  await themeSearch.fill("glass");
  await page.getByText("1 of 2 entries").waitFor();
  await page.getByRole("link", { name: /Glass/ }).click();
  await page.getByRole("heading", { name: "Glass" }).first().waitFor();
  const themePreviews = page.locator(".theme-previews img");
  assert(await themePreviews.count() === 2, "Theme detail must show desktop and phone previews.");
  const previewSizes = await themePreviews.evaluateAll((images) => images.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight, alt: image.alt })));
  assert(previewSizes[0].width === 1200 && previewSizes[0].height === 800, `Desktop preview must be 1200x800: ${JSON.stringify(previewSizes)}`);
  assert(previewSizes[1].width === 390 && previewSizes[1].height === 844, `Phone preview must be 390x844: ${JSON.stringify(previewSizes)}`);
  assert(previewSizes.every((image) => image.alt.trim().length > 0), "Every theme preview needs plain-text alt text.");
  assert(await page.locator('a[href^="zdeck://"]').count() === 0, "Theme detail must not render a theme deep link.");
  assert(await page.getByRole("button", { name: /Install/ }).count() === 0, "Theme detail must not render an install button.");
  const guidance = await page.locator(".theme-guidance").textContent();
  assert(guidance.includes("Settings → Appearance") && guidance.includes("choose Glass"), "Built-in theme guidance must name the exact Appearance selection.");
  await page.getByRole("link", { name: "All themes" }).click();
  await page.getByRole("heading", { name: "Themes for zDeck." }).waitFor();
  assert(await themeSearch.inputValue() === "glass", "Theme detail back link lost search");
  assert(page.url().endsWith("#/themes?q=glass"), `Theme back link lost criteria: ${page.url()}`);
  await page.getByRole("link", { name: "Plugins", exact: true }).click();
  await page.getByRole("heading", { name: "Plugins for zDeck." }).waitFor();
  assert(await page.getByLabel("Search plugins").inputValue() === "", "Category switch should start the plugin directory clean.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Themes", exact: true }).click();
  await page.getByRole("heading", { name: "Themes for zDeck." }).waitFor();
  const themeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(themeOverflow <= 1, `Narrow theme directory overflows horizontally by ${themeOverflow}px.`);
  await page.screenshot({ path: "/tmp/zdeck-registry-themes-narrow.png", fullPage: true });
  await page.getByRole("link", { name: /Glass/ }).click();
  await page.getByRole("heading", { name: "Glass" }).first().waitFor();
  const themeDetailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(themeDetailOverflow <= 1, `Narrow theme detail overflows horizontally by ${themeDetailOverflow}px.`);
  await page.screenshot({ path: "/tmp/zdeck-registry-theme-detail-narrow.png", fullPage: true });
  await page.goto(`${base}/#/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Plugins for zDeck." }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `Narrow layout overflows horizontally by ${overflow}px.`);
  assert(externalRequests.length === 0, `Unexpected external requests: ${externalRequests.join(", ")}`);

  await page.screenshot({ path: "/tmp/zdeck-registry-smoke-narrow.png", fullPage: true });
  console.log("smoke passed: plugin and theme categories, search, empty, detail, exact two macOS pilot install gates, no theme install/deep link, local preview sizes/alt, back criteria, safe README, narrow layout");
  console.log("screenshot: /tmp/zdeck-registry-smoke-narrow.png");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
