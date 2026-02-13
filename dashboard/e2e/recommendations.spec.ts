import { test, expect } from '@playwright/test'
import { mockApi } from './fixtures/api-helpers'
import { activeRecommendations, emptyRecommendations } from './fixtures/mock-data'

test.describe('Recommendations Page', () => {
  test('shows active recommendations', async ({ page }) => {
    await mockApi(page, '/projects/proj-1/recommendations?status=active', {
      body: activeRecommendations,
    })
    await page.goto('/projects/proj-1/recommendations')

    await expect(page.getByText('Sprint-Drift Cycle', { exact: true })).toBeVisible();
    await expect(page.getByText(/Sprint-drift cycle detected/)).toBeVisible();
    await expect(page.getByText('high', { exact: true })).toBeVisible();
  })

  test('toggles evidence', async ({ page }) => {
    await mockApi(page, '/projects/proj-1/recommendations?status=active', {
      body: activeRecommendations,
    })
    await page.goto('/projects/proj-1/recommendations')

    await page.getByRole('button', { name: 'Show evidence' }).click()

    await expect(page.getByText('abc1234')).toBeVisible()
    await expect(page.getByText('src/services/webhook-processor.ts')).toBeVisible()

    await page.getByRole('button', { name: 'Hide evidence' }).click()

    await expect(page.getByText('abc1234')).not.toBeVisible()
  })

  test('acknowledges recommendation', async ({ page }) => {
    await mockApi(page, '/projects/proj-1/recommendations?status=active', {
      body: activeRecommendations,
    })
    await mockApi(page, '/projects/proj-1/recommendations/rec-1', {
      body: {},
    })
    await page.goto('/projects/proj-1/recommendations')

    await page.getByRole('button', { name: 'Acknowledge' }).click()

    await expect(page.getByText('Sprint-drift cycle detected')).not.toBeVisible()
  })

  test('shows empty state', async ({ page }) => {
    await mockApi(page, '/projects/proj-1/recommendations?status=active', {
      body: emptyRecommendations,
    })
    await page.goto('/projects/proj-1/recommendations')

    await expect(page.getByText('No active recommendations.')).toBeVisible()
    await expect(page.getByText('workflow is looking healthy')).toBeVisible()
  })
})
