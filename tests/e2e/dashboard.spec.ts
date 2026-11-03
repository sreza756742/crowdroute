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
