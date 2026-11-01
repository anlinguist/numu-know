import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const routes = (process.env.GLOBALHOST_ROUTES || '/,/dictionary,/learn,/store')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const screenshotDir = process.env.GLOBALHOST_SCREENSHOT_DIR || 'screenshots';

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

function slugFor(route: string): string {
  const slug = route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-');
  return slug || 'home';
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

for (const route of routes) {
  for (const viewport of viewports) {
    test(`smoke ${route} (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const pageErrors: Error[] = [];
      page.on('pageerror', (err) => pageErrors.push(err));

      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `status for ${route}`).toBeLessThan(400);

      await expect(page.locator('body')).toBeVisible();
      // Give client components a moment to hydrate and surface runtime errors.
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(screenshotDir, `${slugFor(route)}-${viewport.name}.png`),
        fullPage: true,
      });

      expect(pageErrors.map((e) => e.message), `uncaught page errors on ${route}`).toEqual([]);
    });
  }
}
