// Screenshots each route of a preview at desktop and mobile sizes (globalhost-preview.yml, deploy job).
// Env: HOST (the preview host), ROUTES (comma-separated paths), CF_ID / CF_SECRET (Access service token).
// Prints [{ vp, route, status, file }] as JSON; images go to ./shots.
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const host = process.env.HOST;
const routes = process.env.ROUTES.split(",");
const viewports = [
  ["desktop", { viewport: { width: 1440, height: 900 } }],
  ["mobile", devices["iPhone 13"]],
];

mkdirSync("shots", { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const [vp, opts] of viewports) {
  const context = await browser.newContext(opts);
  // The service token goes only to the preview host, never to third-party requests the page makes.
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== host) return route.continue();
    return route.continue({
      headers: { ...route.request().headers(), "cf-access-client-id": process.env.CF_ID, "cf-access-client-secret": process.env.CF_SECRET },
    });
  });
  const page = await context.newPage();
  for (const r of routes) {
    const file = `${vp}${r === "/" ? "-home" : r.replace(/[^A-Za-z0-9]+/g, "-")}.png`;
    let status = 0;
    try {
      const res = await page.goto(`https://${host}${r}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      status = res?.status() ?? 0;
      // Embeds can stall `load`, and polling pages (e.g. /learn's YouTube list) never go network-idle: wait for each
      // as long as is reasonable, then shoot whatever rendered.
      await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await page.screenshot({ path: `shots/${file}`, fullPage: true });
    } catch (e) {
      console.error(`${vp} ${r}: ${e.message}`);
    }
    results.push({ vp, route: r, status, file });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results));
