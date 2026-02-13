import { Page } from '@playwright/test';

export async function mockApi(
  page: Page,
  path: string,
  { body, status = 200 }: { body: unknown; status?: number },
): Promise<void> {
  await page.route(`**/api${path}`, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  );
}

export async function mockApiError(
  page: Page,
  path: string,
  status: number,
  title: string,
): Promise<void> {
  await page.route(`**/api${path}`, (route) =>
    route.fulfill({
      status,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: `https://watchmysaas.dev/errors/${status}`,
        title,
        status,
      }),
    }),
  );
}
