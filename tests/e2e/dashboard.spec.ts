import { expect, test } from '@playwright/test';

test('driver can inspect tomorrow’s event and return', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Drive the busy hours.' })).toBeVisible();
  await page.getByRole('button', { name: /Tomorrow/ }).click();
  await expect(page.getByRole('button', { name: /BLACKCAPS v India/ })).toBeVisible();
  await page.getByRole('button', { name: /BLACKCAPS v India/ }).click();
  await expect(page.getByText('ESTIMATED FINISH')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open in Maps/ })).toHaveAttribute('href', /google\.com\/maps/);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Drive the busy hours.' })).toBeVisible();
});

test('filter sheet applies a category filter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(page.getByRole('dialog', { name: 'Filter events' })).toBeVisible();
  await page.getByRole('button', { name: 'Concerts' }).click();
  await page.getByRole('button', { name: 'Show events' }).click();
  await expect(page.getByRole('button', { name: /Filters 1/ })).toBeVisible();
});

test('last loaded dashboard opens offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Drive the busy hours.' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Drive the busy hours.' })).toBeVisible();
});

test('warns when the published data is over 24 hours old', async ({ page }) => {
  await page.route('**/data/meta.json', async (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ last_successful_run_at: '2026-10-01T00:00:00.000Z', source_counts: {}, run_id: 'stale-test', schema_version: 1 })
  }));
  await page.goto('/');
  await expect(page.getByText('Data may be out of date')).toBeVisible();
});

test('persists dark, light and system theme choices', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /Theme:/ });
  await expect(button).toHaveAttribute('aria-label', /Theme: dark/);
  await button.click();
  await expect(button).toHaveAttribute('aria-label', /Theme: light/);
  await button.click();
  await expect(button).toHaveAttribute('aria-label', /Theme: system/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('system');
});
