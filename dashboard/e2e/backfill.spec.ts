import { test, expect } from '@playwright/test';
import { mockApi, mockApiError } from './fixtures/api-helpers';
import { backfillIdle, backfillInProgress } from './fixtures/mock-data';

test.describe('Backfill Page', () => {
  test('renders backfill form', async ({ page }) => {
    await mockApiError(page, '/projects/proj-1/backfill/status', 404, 'Not found');
    await page.goto('/projects/proj-1/backfill');

    await expect(page.getByText('Fetch Historical Commits')).toBeVisible();
    await expect(page.getByText(/Enrich with file data/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Backfill' })).toBeVisible();
  });

  test('starts backfill and shows progress', async ({ page }) => {
    // First call returns 404 (no previous backfill), subsequent calls return in-progress
    let statusCallCount = 0;
    await page.route('**/api/projects/proj-1/backfill/status', (route) => {
      statusCallCount++;
      if (statusCallCount <= 1) {
        return route.fulfill({
          status: 404,
          contentType: 'application/problem+json',
          body: JSON.stringify({ type: 'about:blank', title: 'Not found', status: 404 }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(backfillInProgress),
      });
    });
    await mockApi(page, '/projects/proj-1/backfill', { body: {}, status: 202 });

    await page.goto('/projects/proj-1/backfill');
    await page.getByRole('button', { name: 'Start Backfill' }).click();

    await expect(page.getByText('50%')).toBeVisible();
    await expect(page.getByText('Fetching page 3...')).toBeVisible();
  });

  test('shows completed state', async ({ page }) => {
    await mockApi(page, '/projects/proj-1/backfill/status', { body: backfillIdle });
    await page.goto('/projects/proj-1/backfill');

    await expect(page.getByText('Backfill complete')).toBeVisible();
    await expect(page.getByText('completed', { exact: true })).toBeVisible();
  });
});
