import { test, expect, type Locator, type Page } from '@playwright/test';
import { profile } from '../src/data/profile';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const englishName = profile.displayName.join(' ');
const chineseName = ('chineseName' in profile ? String(profile.chineseName) : '').trim();
const viewports = [
  { width: 1440, height: 900 },
  { width: 900, height: 700 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
];

async function expectReadable(element: Locator) {
  await expect(element).toBeVisible();
  await expect.poll(() => element.evaluate(target => {
    for (let node: Element | null = target; node && !node.matches('.chapter'); node = node.parentElement) {
      const style = getComputedStyle(node);
      if (Number(style.opacity) < .99 || style.visibility === 'hidden') return false;
    }
    return true;
  }), { message: 'The name must stay readable after its entrance or when motion is unavailable.' }).toBe(true);
}

async function expectNameLayout(page: Page, expectedChinese: string) {
  const heading = page.locator('h1#about-heading');
  const english = heading.locator('.hero-name-en');
  const chinese = heading.locator('.hero-name-zh');
  await expect(english).toHaveText(englishName);
  await expect(english).toHaveAttribute('lang', 'en');
  await expectReadable(english);
  if (expectedChinese) {
    await expect(chinese).toHaveText(expectedChinese);
    await expect(chinese).toHaveAttribute('lang', 'zh-Hant');
    await expectReadable(chinese);
    expect(await heading.locator('.hero-name-zh, .hero-name-en').evaluateAll(elements => (
      elements.map(element => element.classList.contains('hero-name-zh') ? 'zh' : 'en')
    ))).toEqual(['zh', 'en']);
    const [upper, lower] = await Promise.all([chinese.boundingBox(), english.boundingBox()]);
    expect(upper!.y + upper!.height).toBeLessThanOrEqual(lower!.y + 1);
  } else {
    // Do not invent an owner's Chinese name when none has been supplied.
    await expect(chinese).toHaveCount(0);
  }
  const bounds = await heading.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const portrait = document.querySelector('[data-portrait]')!.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      headerBottom: header.bottom,
      dockTop: dock.top,
      width: innerWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      fitsOwnBox: element.scrollWidth <= element.clientWidth + 1,
      overlapsPortrait: Math.min(rect.right, portrait.right) > Math.max(rect.left, portrait.left)
        && Math.min(rect.bottom, portrait.bottom) > Math.max(rect.top, portrait.top),
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom);
  expect(bounds.hasHorizontalOverflow).toBe(false);
  expect(bounds.fitsOwnBox, 'Neither name line may overflow its heading column.').toBe(true);
  expect(bounds.overlapsPortrait, 'The title must not collide with the crystal portrait.').toBe(false);
  if (await page.locator('body').evaluate(element => element.classList.contains('is-paged'))) {
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.dockTop);
  }
}

async function supplyTestNameWhenUnset(page: Page) {
  if (chineseName) return chineseName;
  // Synthetic fixture only: exercise the two-line layout without publishing a
  // guessed personal detail. The real page must omit the unconfigured line.
  const fixtureName = '測試姓名';
  await page.route(/^http:\/\/127\.0\.0\.1:4321\/PersonalWeb\/$/, async route => {
    const response = await route.fetch();
    const html = await response.text();
    const heading = /(<h1\b[^>]*\bid="about-heading"[^>]*>)([\s\S]*?)(<\/h1>)/;
    expect(html).toMatch(heading);
    await route.fulfill({
      response,
      body: html.replace(heading, (_match, opening: string, content: string, closing: string) => (
        `${opening}<span class="hero-name-zh" lang="zh-Hant">${fixtureName}</span> ${content}${closing}`
      )),
    });
  });
  return fixtureName;
}

test('the homepage presents the configured owner name without old captions while keeping its navigation', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expectNameLayout(page, chineseName);
  await expect(page.locator('body')).not.toContainText(/A\s+PERSONAL\s+UNIVERSE/i);
  await expect(page).not.toHaveTitle(/A\s+PERSONAL\s+UNIVERSE/i);
  await expect(page.locator('#about .hero-copy > .eyebrow')).toHaveCount(0);
  await expect(page.locator('.hero-colophon, .scroll-cue, .scroll-cue-line, #about .scene-label')).toHaveCount(0);
  for (const caption of [
    /每一次探索/,
    /都在點亮自己的星圖/,
    /EST\.?\s*2026/i,
    /ALWAYS\s+EXPLORING/i,
    /SCROLL\s+TO\s+EXPLORE/i,
  ]) {
    await expect(page.locator('#about')).not.toContainText(caption);
  }
  const primaryAction = page.locator('#about .hero-actions .primary-button');
  await expect(primaryAction).toBeVisible();
  await expect(primaryAction).toHaveAttribute('href', '#projects');
  const nextChapter = page.locator('.chapter-dock #next-chapter');
  await expect(nextChapter).toBeVisible();
  await expect(nextChapter).toHaveAttribute('href', '#projects');
  await expect(nextChapter.locator('#next-label')).toHaveText('下一章');
  await expect(nextChapter.locator('#next-arrow')).toHaveText('↓');
});

test('Chinese over English name lines fit desktop and mobile without colliding with the portrait', async ({ page }) => {
  const expectedChinese = await supplyTestNameWhenUnset(page);
  for (const viewport of viewports) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expectNameLayout(page, expectedChinese);
      if (viewport.width === 1440 || viewport.width === 360) {
        await page.locator('#about img').evaluateAll(images => Promise.all(images.map(image => (
          (image as HTMLImageElement).decode()
        ))));
        await expect(page.locator('[data-portrait]')).toHaveAttribute('data-portrait-state', 'ready');
        const screenshotPath = test.info().outputPath(`hero-name-${chineseName ? 'configured' : 'synthetic'}-${viewport.width}.png`);
        await page.locator('#about').screenshot({ path: screenshotPath, animations: 'disabled' });
        await test.info().attach(`Homepage name at ${viewport.width}px${chineseName ? '' : ' (synthetic name fixture)'}`, {
          path: screenshotPath,
          contentType: 'image/png',
        });
      }
    });
  }
});

test('the two name lines remain readable with blocked web fonts, reduced motion and no JavaScript', async ({ browser }) => {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled, reducedMotion: 'reduce' });
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const page = await context.newPage();
    try {
      const expectedChinese = await supplyTestNameWhenUnset(page);
      for (const viewport of [viewports[0], viewports[3]]) {
        await test.step(`${javaScriptEnabled ? 'reduced motion' : 'no JavaScript'} at ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          await page.goto(siteURL);
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          await expectNameLayout(page, expectedChinese);
          const heading = page.locator('#about-heading');
          expect(await heading.evaluate(element => element.getAnimations({ subtree: true })
            .filter(animation => animation.playState === 'running').length)).toBe(0);
        });
      }
    } finally {
      await context.close();
    }
  }
});
