import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const routes = (process.env.GLOBALHOST_ROUTES ?? '/')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const screenshotDir = process.env.GLOBALHOST_SCREENSHOT_DIR ?? 'screenshots';

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

function slug(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-');
  return s || 'home';
}

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${route} loads (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const pageErrors: Error[] = [];
      page.on('pageerror', (err) => pageErrors.push(err));

      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `HTTP status for ${route}`).toBeLessThan(400);

      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

      fs.mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, `${slug(route)}-${viewport.name}.png`),
        fullPage: true,
      });

      expect(pageErrors, `uncaught page errors on ${route}`).toEqual([]);
    });
  }
}
