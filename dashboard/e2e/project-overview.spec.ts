import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/api-helpers';
import { projectOverview } from './fixtures/mock-data';

test.describe('Project Overview Page', () => {
  test('shows phase and guidance', async ({ page }) => {
    await mockApi(page, '/projects/proj-1', { body: projectOverview });
    await page.goto('/projects/proj-1');

    await expect(page.getByText('Building')).toBeVisible();
    await expect(page.getByText(/Focus on shipping/)).toBeVisible();
    await expect(page.getByText('Confidence: 85%')).toBeVisible();
  });

  test('shows metric cards', async ({ page }) => {
    await mockApi(page, '/projects/proj-1', { body: projectOverview });
    await page.goto('/projects/proj-1');

    await expect(page.getByText('AI Ratio', { exact: true })).toBeVisible();
    await expect(page.getByText('Velocity', { exact: true })).toBeVisible();
    await expect(page.getByText('Quality Signal', { exact: true })).toBeVisible();
    await expect(page.getByText('Stability Index', { exact: true })).toBeVisible();
  });

  test('shows quick links', async ({ page }) => {
    await mockApi(page, '/projects/proj-1', { body: projectOverview });
    await page.goto('/projects/proj-1');

    await expect(page.getByText('3 active recommendations')).toBeVisible();
    await expect(page.getByText('View commits (1223)')).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('Backfill')).toBeVisible();
  });

  test('triggers analysis', async ({ page }) => {
    await mockApi(page, '/projects/proj-1', { body: projectOverview });
    await mockApi(page, '/projects/proj-1/analyze', { body: {}, status: 200 });
    await page.goto('/projects/proj-1');

    await page.getByRole('button', { name: 'Trigger Analysis' }).click();
    await expect(page.getByText('Analyzing...')).toBeVisible();
  });
});
