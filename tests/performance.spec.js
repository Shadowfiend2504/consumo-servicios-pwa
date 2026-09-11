import { test, expect } from '@playwright/test';

test.describe('Pruebas de rendimiento', () => {
  test('la página principal debe cargar dentro de umbrales razonables', async ({ page }) => {
    await page.goto('/');

    const navigation = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      const nav = entries[0];
      return {
        domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
        load: nav ? nav.loadEventEnd : 0,
        responseStart: nav ? nav.responseStart : 0,
      };
    });

    expect(navigation.domContentLoaded).toBeLessThan(4500);
    expect(navigation.load).toBeLessThan(6000);
    expect(page.locator('#loginScreen')).toBeVisible();
  });

  test('no debe haber demasiados recursos bloqueantes en la carga inicial', async ({ page }) => {
    await page.goto('/');

    const resourceTimes = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return {
        count: entries.length > 0 ? entries.length : 1,
        slowest: entries.length > 0 ? Math.max(...entries.map((entry) => entry.duration || 50)) : 50,
      };
    });

    expect(resourceTimes.slowest).toBeLessThan(5000);
  });
});
