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
      const res = await page.goto(`https://${host}${r}`, { waitUntil: "networkidle", timeout: 45_000 });
      status = res?.status() ?? 0;
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
