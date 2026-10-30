import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const routes = (process.env.GLOBALHOST_ROUTES ?? "/")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const screenshotDir = process.env.GLOBALHOST_SCREENSHOT_DIR ?? "screenshots";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

function slug(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-");
  return s || "home";
}

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

for (const route of routes) {
  for (const vp of viewports) {
    test(`smoke ${route} (${vp.name})`, async ({ page }) => {
      const pageErrors: Error[] = [];
      page.on("pageerror", (err) => pageErrors.push(err));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto(route, { waitUntil: "load" });

      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `status for ${route}`).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      await page.screenshot({
        path: path.join(screenshotDir, `${slug(route)}-${vp.name}.png`),
        fullPage: true,
      });

      expect(pageErrors.map((e) => e.message), `page errors on ${route}`).toEqual([]);
    });
  }
}
