import { test, expect } from '@playwright/test';

test('desktop wheel, keyboard, chapter links and deep links work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page.locator('#projects')).toBeInViewport();
  await page.waitForTimeout(850);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await page.waitForTimeout(850);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'contact');
  await expect(page.locator('#contact')).toBeInViewport();
  await expect(page.getByRole('link', { name: /到 GitHub 找我/ })).toHaveAttribute('href', 'https://github.com/shi-tong-chang');
  await page.waitForTimeout(850);
  await page.locator('#next-chapter').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'about');
  await page.goto('./#skills');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await page.reload();
  await expect(page.locator('#skills')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('trackpad wheel burst advances only one chapter', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 80);
  await page.waitForTimeout(850);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
});

test('mobile keeps all content reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  for (const id of ['about', 'projects', 'skills', 'contact']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeInViewport();
    expect(await page.locator(`#${id}`).evaluate(element => element.hasAttribute('inert'))).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: /個人介紹/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'about');
});

test('reduced motion and short viewports use readable native scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#contact');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('#contact')).toBeInViewport();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('#contact')).toBeInViewport();
});

test('without JavaScript all chapters and navigation remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/PersonalWeb/');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('#contact')).toBeInViewport();
  await context.close();
});
