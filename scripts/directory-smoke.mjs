// Requires npm run build && npm run storybook:build. Local Brave only; no plugin code runs.
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const executablePath = process.env.CHROME_BIN ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const servers = [1432, 1433].map((port, index) => spawn(process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--outDir", index ? "storybook-static" : "dist"],
  { stdio: "ignore" }));
const base = "http://127.0.0.1:1432";
const story = "http://127.0.0.1:1433/iframe.html?id=registry-directory--";
function assert(ok, message) { if (!ok) throw new Error(message); }
async function ready(port) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return; } catch { /* preview starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview ${port} failed to start`);
}
async function noOverflow(page, label) {
  const measurement = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
    results: document.querySelector(".directory-results")?.getBoundingClientRect().toJSON(),
    rail: document.querySelector(".filter-rail")?.getBoundingClientRect().toJSON() }));
  assert(measurement.width <= measurement.viewport + 1, `${label} overflows: ${JSON.stringify(measurement)}`);
  return measurement;
}
async function choose(page, label, value) {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole("menuitemradio", { name: value, exact: true }).click();
}

let browser;
try {
  await Promise.all([ready(1432), ready(1433)]);
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const external = [], errors = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith("http") && !["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.href); return route.abort();
    }
    return route.continue();
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/#/`, { waitUntil: "networkidle" });
  const search = page.getByRole("searchbox", { name: "Search plugins" });
  await search.fill("spotify");
  await page.getByRole("checkbox", { name: "Official", exact: true }).check();
  await page.getByRole("checkbox", { name: "media", exact: true }).check();
  await choose(page, "Sort", "Downloads");
  await choose(page, "Order", "Lowest first");
  const directoryUrl = page.url();
  await page.getByRole("link", { name: /Spotify/ }).click();
  await page.getByRole("heading", { name: "Spotify", exact: true }).first().waitFor();
  assert(await page.getByRole("link", { name: "Install in zDeck" }).getAttribute("href") === "zdeck://plugins/install?id=spotify&version=0.1.0", "Spotify must offer only its exact identity");
  await page.getByRole("link", { name: "All plugins" }).click();
  assert(page.url() === directoryUrl, "Detail back link lost criteria");
  assert(await search.inputValue() === "spotify", "Back link lost search");
  assert(await page.getByRole("checkbox", { name: "media", exact: true }).isChecked(), "Back link lost category");
  await page.getByRole("button", { name: "Order: Lowest first" }).waitFor();
  await page.getByRole("link", { name: /Spotify/ }).click();
  await page.goBack();
  await search.waitFor();
  assert(await search.inputValue() === "spotify", "Browser Back lost search");
  await page.reload({ waitUntil: "networkidle" });
  assert(await search.inputValue() === "spotify", "Reload lost search");
  await page.getByRole("button", { name: "Sort: Downloads" }).waitFor();
  await search.fill("printer");
  await page.getByText("No plugins match.").waitFor();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("link", { name: /Home Assistant/ }).waitFor();
  await choose(page, "Sort", "Relevance");
  await search.fill("spotify");
  await page.locator("a.brand").click();
  await page.waitForFunction(() => document.querySelector('input[type="search"]')?.value === "");
  assert(await search.inputValue() === "", "Root navigation must reset even when the last React route was already root");
  const measurements = { desktop: await noOverflow(page, "desktop") };
  assert(measurements.desktop.rail.right < measurements.desktop.results.left, "Desktop filter rail is not on the left");
  await page.screenshot({ path: "/tmp/zdeck-directory-desktop.png", fullPage: true });

  // Menu keyboard navigation, Escape restoration, and a real keyboard checkbox toggle.
  const sortTrigger = page.getByRole("button", { name: "Sort: Relevance" });
  await sortTrigger.focus(); await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  assert(await page.getByRole("menuitemradio", { name: "Date added" }).evaluate((el) => el === document.activeElement), "End did not focus last sort");
  await page.keyboard.press("Escape");
  assert(await sortTrigger.evaluate((el) => el === document.activeElement), "Escape did not restore menu trigger");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const filters = page.getByRole("button", { name: /^Filters/ });
    assert(await filters.isVisible(), "Narrow filters trigger missing");
    assert(!(await page.getByRole("checkbox", { name: "Official", exact: true }).isVisible()), "Narrow filters should start collapsed");
    await filters.click();
    const official = page.getByRole("checkbox", { name: "Official", exact: true });
    await official.focus(); await page.keyboard.press("Space");
    assert(await official.isChecked(), "Checkbox Space failed");
    assert((await filters.textContent()).includes("(1)"), "Selection count missing");
    measurements[`narrow${width}Open`] = await noOverflow(page, `${width} open filters`);
    await page.screenshot({ path: `/tmp/zdeck-directory-${width}-filters.png`, fullPage: true });
    await page.keyboard.press("Escape");
    assert(await filters.getAttribute("aria-expanded") === "false", "Escape did not close filters");
    assert(await filters.evaluate((el) => el === document.activeElement), "Escape did not restore filter focus");
    measurements[`narrow${width}`] = await noOverflow(page, `${width} collapsed`);
    await page.screenshot({ path: `/tmp/zdeck-directory-${width}.png`, fullPage: true });
    await filters.click(); await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.keyboard.press("Escape");
  }

  // Fictional states are exercised in the built Storybook, never injected into production data.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${story}search-relevance&viewMode=story`, { waitUntil: "networkidle" });
  await page.getByRole("searchbox").waitFor();
  assert(JSON.stringify(await page.locator(".plugin-name").allTextContents()) === JSON.stringify(["Echo", "Echo Tools", "Deck Echo", "Media Bridge", "Audio Pad"]), "Relevance order wrong");
  await choose(page, "Sort", "GitHub stars");
  assert((await page.locator(".plugin-name").allTextContents())[0] === "Echo Tools", "Explicit sort must override query relevance");
  await choose(page, "Order", "Lowest first");
  assert((await page.locator(".plugin-name").allTextContents()).at(-1) === "Media Bridge", "Unknown metrics must be last ascending");
  await page.screenshot({ path: "/tmp/zdeck-directory-fictional-stars.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${story}long-names&viewMode=story`, { waitUntil: "networkidle" });
    await page.getByRole("searchbox").waitFor();
    measurements[`long${width}`] = await noOverflow(page, `${width} long names`);
    await page.screenshot({ path: `/tmp/zdeck-directory-fictional-long-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${story}maximum-catalogue&viewMode=story`, { waitUntil: "networkidle" });
  await page.locator(".plugin-item").nth(499).waitFor({ state: "attached" });
  const samples = await page.evaluate(async () => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    async function measure(query, expected) {
      const start = performance.now();
      setter.call(input, query); input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve, reject) => {
        const frame = () => {
          if (document.querySelectorAll(".plugin-item").length === expected) resolve();
          else if (performance.now() - start > 3000) reject(new Error(`Search render timed out for ${JSON.stringify(query)}: expected ${expected}, got ${document.querySelectorAll(".plugin-item").length}`));
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      return performance.now() - start;
    }
    const queries = [], resets = [];
    const cases = [["Fictional plugin 499", 1], ["fictional plugin 04", 15], ["fictional plugin 4", 176], ["missing", 0]];
    for (let i = 0; i < 20; i++) {
      const [query, count] = cases[i % cases.length];
      queries.push(await measure(query, count));
      resets.push(await measure("", 500));
    }
    return { queries: queries.sort((a, b) => a - b), resets: resets.sort((a, b) => a - b) };
  });
  const stats = (values) => ({ samples: values.length, minMs: values[0], medianMs: values[10], p95Ms: values[18], maxMs: values.at(-1) });
  const latency = { records: 500, queries: stats(samples.queries), clearTo500Rows: stats(samples.resets), measurement: "input event to matching rendered DOM at animation-frame check; query cases yield 0, 1, 15 and 176 rows; local headless Brave, not a universal benchmark" };
  assert(external.length === 0, `External requests: ${external.join(", ")}`);
  assert(errors.length === 0, `Browser errors: ${errors.join(", ")}`);
  console.log(JSON.stringify({ measurements, latency, externalRequests: external.length, browserErrors: errors }, null, 2));
  console.log("directory smoke passed: ranking, explicit metric sorts, state/back/reload, keyboard menus and filters, unknown data, 320/390 layout and long names; screenshots /tmp/zdeck-directory-*.png");
} finally {
  await browser?.close();
  servers.forEach((server) => server.kill("SIGTERM"));
}
