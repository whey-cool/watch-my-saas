import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures/api-helpers';
import { projectsList, emptyProjectsList } from './fixtures/mock-data';

test.describe('Projects Page', () => {
  test('renders project list', async ({ page }) => {
    await mockApi(page, '/projects', { body: projectsList });
    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: 'Connected Projects' })).toBeVisible();
    await expect(page.getByText('whey-cool/herdmate')).toBeVisible();
    await expect(page.getByText('1223')).toBeVisible();
  });

  test('navigates to project on click', async ({ page }) => {
    await mockApi(page, '/projects', { body: projectsList });
    await page.goto('/projects');

    await page.getByText('whey-cool/herdmate').click();
    await expect(page).toHaveURL(/\/projects\/proj-1/);
  });

  test('shows empty state', async ({ page }) => {
    await mockApi(page, '/projects', { body: emptyProjectsList });
    await page.goto('/projects');

    await expect(page.getByText('No projects connected yet.')).toBeVisible();
  });
});
