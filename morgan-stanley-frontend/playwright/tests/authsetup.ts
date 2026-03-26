import { test as setup } from '@playwright/test';

setup('login and save session', async ({ page }) => {
  await page.goto(process.env.HOMEPAGE||"");

  await page.getByRole('textbox', { name: 'Email address' })
    .fill(process.env.USERNAME || '');

  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('textbox', { name: 'Password' })
    .fill(process.env.PASSWORD || '');

  await Promise.all([
    page.waitForURL('**/trades', { timeout: 20000 }),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);

  // Save session
  await page.context().storageState({ path: 'auth.json' });
});
