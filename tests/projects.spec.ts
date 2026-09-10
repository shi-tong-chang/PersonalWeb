import { test, expect, type Locator, type Page } from '@playwright/test';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';

async function openProjects(page: Page) {
  await page.goto(`${siteURL}#projects`);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const archive = page.locator('details#project-archive');
  await expect(archive).not.toHaveAttribute('open');
  await archive.locator(':scope > summary').click();
  await expect(archive).toHaveAttribute('open');
  await expect(page.locator('[data-project-gallery]')).toHaveClass(/is-enhanced/);
  await page.locator('[data-project-track]').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
}

async function scrollLeft(track: Locator) {
  return track.evaluate(element => element.scrollLeft);
}

async function expectTabInsideTrack(tab: Locator) {
  await expect.poll(() => tab.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const track = element.closest('[data-project-track]')!.getBoundingClientRect();
    return bounds.left >= track.left - 1 && bounds.right <= track.right + 1;
  }), { message: 'The selected project must be fully visible in its horizontal selection rail.' }).toBe(true);
}

test('ten project slots expose one accessible panel and clearly mark nine reservations', async ({ page }) => {
  await openProjects(page);
  const gallery = page.locator('[data-project-gallery]');
  const tabs = gallery.getByRole('tab');
  await expect(gallery.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'archive-heading');
  await expect(tabs).toHaveCount(10);
  await expect(gallery.locator('[data-project-panel]')).toHaveCount(10);
  await expect(gallery.locator('.project-state.is-reserved')).toHaveCount(9);
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/PersonalWeb/);
  await expect(gallery.getByRole('tabpanel').getByRole('link', { name: /查看 GitHub 專案/ }))
    .toHaveAttribute('href', 'https://github.com/shi-tong-chang/PersonalWeb');

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/專案 02.*預留席位/);
  await expect(gallery.getByRole('tabpanel').getByRole('link')).toHaveCount(0);
  await expect(gallery.getByRole('status')).toContainText('第 2 件，共 10 件');
  await expect(page).toHaveURL(/#projects$/);
});

test('rapid project clicks finish on the latest selection without queued transitions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openProjects(page);
  await page.evaluate(() => {
    const tabs = document.querySelectorAll<HTMLAnchorElement>('[data-project-tab]');
    for (const index of [2, 8, 4, 9]) tabs[index].click();
  });
  const gallery = page.locator('[data-project-gallery]');
  const lastTab = gallery.getByRole('tab').last();
  await expect(lastTab).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/專案 10/);
  await page.waitForTimeout(650);
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/專案 10/);
  await expectTabInsideTrack(lastTab);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
  expect(errors).toEqual([]);
});

test('project panel deep links survive reload and later hash changes', async ({ page }) => {
  await page.goto(`${siteURL}#project-panel-project-10`);
  const gallery = page.locator('[data-project-gallery]');
  const archive = page.locator('details#project-archive');
  await expect(gallery).toHaveClass(/is-enhanced/);

  async function expectLinkedProject(id: string) {
    await expect(archive).toHaveAttribute('open');
    const tab = page.locator(`#project-tab-${id}`);
    const panel = page.locator(`#project-panel-${id}`);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expectTabInsideTrack(tab);
    await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
    await expect(gallery.getByRole('tabpanel')).toHaveAttribute('id', `project-panel-${id}`);
    await expect(panel).not.toHaveAttribute('inert');
    await expect(panel.locator('h4.project-name')).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`#project-panel-${id}$`));
  }

  await expectLinkedProject('project-10');
  await page.reload();
  await expectLinkedProject('project-10');
  await page.evaluate(() => { location.hash = '#project-panel-project-02'; });
  await expectLinkedProject('project-02');
});

test('project Home and End keys reveal their tabs without navigating chapters', async ({ page }) => {
  await openProjects(page);
  const tabs = page.locator('[data-project-gallery]').getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.last());
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);

  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.first());
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
});

test('edge hover scrolls smoothly, stops on leave, and respects both boundaries', async ({ page }) => {
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  const left = page.getByRole('button', { name: '向左瀏覽專案' });
  const right = page.getByRole('button', { name: '向右瀏覽專案' });
  await expect(left).toHaveAttribute('aria-disabled', 'true');
  await expect(right).toHaveAttribute('aria-disabled', 'false');
  const start = await scrollLeft(track);
  await right.hover();
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(start + 60);
  await page.locator('.gallery-heading').hover();
  await page.waitForTimeout(100);
  const stopped = await scrollLeft(track);
  await page.waitForTimeout(350);
  expect(Math.abs(await scrollLeft(track) - stopped)).toBeLessThanOrEqual(2);

  for (let attempt = 0; attempt < 5 && await right.getAttribute('aria-disabled') !== 'true'; attempt++) {
    await right.click();
    await page.locator('.gallery-heading').hover();
    await page.waitForTimeout(600);
  }
  await expect(right).toHaveAttribute('aria-disabled', 'true');
  await expect(left).toHaveAttribute('aria-disabled', 'false');
  expect(await track.evaluate(element => Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft)))
    .toBeLessThanOrEqual(2);
  const end = await scrollLeft(track);
  const rightBounds = await right.boundingBox();
  expect(rightBounds).not.toBeNull();
  await page.mouse.move(rightBounds!.x + rightBounds!.width / 2, rightBounds!.y + rightBounds!.height / 2);
  await page.waitForTimeout(300);
  expect(Math.abs(await scrollLeft(track) - end)).toBeLessThanOrEqual(2);

  for (let attempt = 0; attempt < 5 && await left.getAttribute('aria-disabled') !== 'true'; attempt++) {
    await left.click();
    await page.locator('.gallery-heading').hover();
    await page.waitForTimeout(600);
  }
  await expect(left).toHaveAttribute('aria-disabled', 'true');
  await expect(right).toHaveAttribute('aria-disabled', 'false');
  expect(await scrollLeft(track)).toBeLessThanOrEqual(2);
});

test('horizontal and shift wheel stay within the rail while vertical wheel scrolls the page naturally', async ({ page }) => {
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  await track.hover();
  const start = await scrollLeft(track);
  const pageStart = await page.evaluate(() => scrollY);
  await page.mouse.wheel(170, 0);
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(start + 50);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  const afterHorizontal = await scrollLeft(track);

  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 170);
  await page.keyboard.up('Shift');
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(afterHorizontal + 50);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
  expect(Math.abs(await page.evaluate(() => scrollY) - pageStart)).toBeLessThanOrEqual(2);

  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(pageStart + 100);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY) - pageStart).toBeLessThan(350);
  await expect(page.locator('#projects')).toBeInViewport();
});

test('a non-overflowing project rail never leaks shift wheel into chapter navigation', async ({ page }) => {
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  await track.evaluate(element => {
    // Model a collection small enough to fit, without changing its scroll handler.
    element.querySelectorAll('[data-project-tab]').forEach((tab, index) => { if (index > 0) tab.remove(); });
  });
  await expect(page.locator('[data-project-scroll="1"]')).toBeHidden();
  await track.hover();
  const pageStart = await page.evaluate(() => scrollY);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 180);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(750);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
  expect(Math.abs(await page.evaluate(() => scrollY) - pageStart)).toBeLessThanOrEqual(2);
});

test('mobile touch controls reach the tenth project without page overflow', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await openProjects(page);
    await expect(page.locator('body')).not.toHaveClass(/is-paged/);
    const track = page.locator('[data-project-track]');
    await track.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const right = page.getByRole('button', { name: '向右瀏覽專案' });
    const start = await scrollLeft(track);
    await right.tap();
    await expect.poll(() => scrollLeft(track)).toBeGreaterThan(start + 50);
    for (let attempt = 0; attempt < 12 && await right.getAttribute('aria-disabled') !== 'true'; attempt++) {
      await right.tap();
      await page.waitForTimeout(500);
    }
    await expect(right).toHaveAttribute('aria-disabled', 'true');
    const lastTab = page.locator('[data-project-gallery]').getByRole('tab').last();
    await expectTabInsideTrack(lastTab);
    await lastTab.tap();
    await expect(lastTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toHaveAccessibleName(/專案 10/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).tap();
    await expect(page.locator('#contact')).toBeInViewport();
  } finally {
    await context.close();
  }
});

test('reduced motion disables hover scrolling while preserving explicit controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  await track.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const right = page.getByRole('button', { name: '向右瀏覽專案' });
  const start = await scrollLeft(track);
  await right.hover();
  await page.waitForTimeout(500);
  expect(Math.abs(await scrollLeft(track) - start)).toBeLessThanOrEqual(2);
  await right.click();
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(start + 50);
  const tabs = page.locator('[data-project-gallery]').getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName(/專案 10/);
  await expectTabInsideTrack(tabs.last());
});

test('without JavaScript or web fonts all ten project articles remain readable in natural flow', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  // The offline fallback must not depend on Google Fonts availability or timing.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(`${siteURL}#projects`);
    // Native fragment scrolling can still be moving after the document loads.
    await expect.poll(() => page.locator('#projects').evaluate(element => Math.abs(
      element.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    ))).toBeLessThanOrEqual(1);
    const archive = page.locator('details#project-archive');
    await expect(archive).not.toHaveAttribute('open');
    await archive.locator(':scope > summary').click();
    await expect(archive).toHaveAttribute('open');
    const gallery = page.locator('[data-project-gallery]');
    await expect(gallery).not.toHaveClass(/is-enhanced/);
    const panels = gallery.getByRole('article');
    await expect(panels).toHaveCount(10);
    await expect(gallery.locator('[data-project-panel][inert]')).toHaveCount(0);
    for (const panel of await panels.all()) {
      await expect(panel).toBeVisible();
      await panel.locator('h4.project-name').scrollIntoViewIfNeeded();
      await expect(panel.locator('h4.project-name')).toBeInViewport();
    }
    await expect(panels.last()).toHaveAccessibleName('專案 10');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
    await expect(page.locator('#contact')).toBeInViewport();
  } finally {
    await context.close();
  }
});

test('resizing keeps the selected project visible and keyboard order reaches its content', async ({ page }) => {
  await openProjects(page);
  const gallery = page.locator('[data-project-gallery]');
  const tabs = gallery.getByRole('tab');
  await tabs.nth(3).click();
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.nth(3));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await tabs.first().click();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.first());
  await tabs.first().focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '向右瀏覽專案' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(gallery.getByRole('tabpanel')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(gallery.getByRole('tabpanel').getByRole('link', { name: /查看 GitHub 專案/ })).toBeFocused();
});
