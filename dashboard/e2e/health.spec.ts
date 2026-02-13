import { test, expect } from '@playwright/test';
import { mockApi, mockApiError } from './fixtures/api-helpers';
import { healthOk, healthDegraded } from './fixtures/mock-data';

test.describe('Health Page', () => {
  test('shows healthy state', async ({ page }) => {
    await mockApi(page, '/health', { body: healthOk });
    await page.goto('/health');

    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible();
    await expect(page.getByText('OK')).toBeVisible();
    await expect(page.getByText('0.1.0')).toBeVisible();
    await expect(page.getByText('connected')).toBeVisible();
  });

  test('shows degraded state', async ({ page }) => {
    await mockApi(page, '/health', { body: healthDegraded });
    await page.goto('/health');

    await expect(page.getByText('DEGRADED')).toBeVisible();
    await expect(page.getByText('disconnected')).toBeVisible();
  });

  test('shows error when API unreachable', async ({ page }) => {
    await mockApiError(page, '/health', 500, 'Internal Server Error');
    await page.goto('/health');

    await expect(page.getByRole('heading', { name: 'API Unreachable' })).toBeVisible();
  });

  test('root redirects to /health', async ({ page }) => {
    await mockApi(page, '/health', { body: healthOk });
    await page.goto('/');

    await expect(page).toHaveURL(/\/health$/);
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible();
  });
});
