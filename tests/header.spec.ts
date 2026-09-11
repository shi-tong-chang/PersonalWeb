import { test, expect, type Locator } from '@playwright/test';
import { profile } from '../src/data/profile';
import { observeStartupScrollSettled } from './helpers/navigation';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterLinks = [
  ['about', '個人介紹'],
  ['projects', '專案經歷'],
  ['skills', '擅長技能'],
  ['timeline', '特殊成就'],
  ['contact', '與我聯繫'],
] as const;

async function expectGitHubLink(link: Locator) {
  await expect(link).toBeVisible();
  await expect(link).toHaveAccessibleName(/GitHub/i);
  await expect(link).toHaveAttribute('href', profile.github);
  await expect(link).toHaveAttribute('target', '_blank');
  const rel = (await link.getAttribute('rel'))!.split(/\s+/);
  expect(rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
  const icon = link.locator('svg');
  await expect(icon).toHaveCount(1);
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('focusable', 'false');
}

async function expectCenteredNavigation(header: Locator) {
  const layout = await header.evaluate(element => {
    const header = element.getBoundingClientRect();
    const navigation = element.querySelector('.top-nav')!.getBoundingClientRect();
    const actions = element.querySelector('.header-actions')!.getBoundingClientRect();
    const brand = element.querySelector('.brand')!;
    const brandText: DOMRect[] = [];
    const textNodes = document.createTreeWalker(brand, NodeFilter.SHOW_TEXT);
    for (let node = textNodes.nextNode(); node; node = textNodes.nextNode()) {
      if (!node.textContent?.trim() || getComputedStyle(node.parentElement!).visibility === 'hidden') continue;
      // A text range reveals glyphs overflowing a shrunken anchor/wordmark box;
      // anchor rectangles alone could report a false non-overlap at 900px.
      const range = document.createRange();
      range.selectNodeContents(node);
      brandText.push(...Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0));
    }
    const overlaps = (first: DOMRect, second: DOMRect) => (
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
      && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1
    );
    const visibleFontSize = (selector: string) => {
      const target = element.querySelector(selector)!;
      const bounds = target.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 ? parseFloat(getComputedStyle(target).fontSize) : null;
    };
    return {
      width: innerWidth,
      centerDelta: Math.abs(navigation.left + navigation.width / 2 - innerWidth / 2),
      labelSizes: Array.from(element.querySelectorAll('.nav-label')).map(label => parseFloat(getComputedStyle(label).fontSize)),
      brandSize: visibleFontSize('.brand-wordmark'),
      githubLabelSize: visibleFontSize('.github-label'),
      contactSize: visibleFontSize('.header-contact'),
      brandTextCount: brandText.length,
      brandTextInside: brandText.every(rect => rect.left >= header.left - 1 && rect.right <= header.right + 1
        && rect.top >= header.top - 1 && rect.bottom <= header.bottom + 1),
      brandTextOverlap: brandText.some(rect => overlaps(rect, navigation) || overlaps(rect, actions)),
    };
  });
  expect(layout.centerDelta, 'The navigation must be centered on the viewport, not between unequal side contents.').toBeLessThanOrEqual(1);
  expect(layout.brandTextCount).toBeGreaterThan(0);
  expect(layout.brandTextInside, 'The visible identity text must remain inside the fixed header.').toBe(true);
  expect(layout.brandTextOverlap, 'Identity glyphs must not overflow into navigation or action controls.').toBe(false);
  const minimumLabelSize = layout.width <= 350 ? 11 : layout.width <= 899 ? 12 : layout.width <= 1100 ? 14 : 15;
  expect(Math.min(...layout.labelSizes), 'The enlarged chapter labels must not shrink back to their previous small sizes.')
    .toBeGreaterThanOrEqual(minimumLabelSize);
  expect(layout.brandSize).toBeGreaterThanOrEqual(layout.width <= 350 ? 9 : layout.width <= 1100 ? 10 : 11);
  if (layout.githubLabelSize !== null) expect(layout.githubLabelSize).toBeGreaterThanOrEqual(10);
  if (layout.contactSize !== null) expect(layout.contactSize).toBeGreaterThanOrEqual(9);
}

test('five distinct chapter glyphs preserve named links, keyboard access and synchronized active state', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await observeStartupScrollSettled(page);
  const navigation = page.getByRole('navigation', { name: '章節導覽' });
  await expect(navigation.getByRole('link')).toHaveCount(5);
  const projectLink = navigation.getByRole('link', { name: '專案經歷', exact: true });
  await projectLink.hover();
  await expect(projectLink.locator('.nav-emblem')).not.toHaveCSS('transform', 'none');
  await expect(navigation.getByRole('link', { name: '個人介紹', exact: true })).toHaveAttribute('aria-current', 'location');
  await page.mouse.move(10, 110);
  const glyphs = new Set<string>();
  for (const [index, [id, label]] of chapterLinks.entries()) {
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', `#${id}`);
    await expect(link).toHaveAttribute('data-chapter', String(index));
    const glyph = link.locator('svg');
    await expect(glyph).toHaveCount(1);
    await expect(glyph).toBeVisible();
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    await expect(glyph).toHaveAttribute('focusable', 'false');
    glyphs.add(await glyph.innerHTML());
    if (index % 2) {
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await link.click();
    }
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator('body')).toHaveAttribute('data-theme', id);
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect.poll(() => page.locator(`#${id}`).evaluate(section => Math.abs(section.getBoundingClientRect().top)))
      .toBeLessThanOrEqual(2);
    await expect(navigation.locator('[aria-current="location"]')).toHaveCount(1);
    await expect(link).toHaveAttribute('aria-current', 'location');
    await expect.poll(() => link.evaluate(element => Number(getComputedStyle(element, '::after').opacity)))
      .toBeGreaterThan(.7);
  }
  expect(glyphs.size, 'Every chapter must have its own recognizable decorative glyph.').toBe(5);
  await navigation.getByRole('link', { name: '個人介紹', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: '專案經歷', exact: true })).toBeFocused();
});

test('the chapter header and upper-right GitHub icon fit desktop and narrow mobile layouts', async ({ page }) => {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1351, height: 900 },
    { width: 1350, height: 900 },
    { width: 1101, height: 800 },
    { width: 1100, height: 800 },
    { width: 1024, height: 768 },
    { width: 900, height: 700 },
    { width: 899, height: 700 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.goto('about:blank');
      await page.setViewportSize(viewport);
      await page.goto(siteURL);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const header = page.locator('.site-header');
      const github = header.locator('.header-github');
      await expectGitHubLink(github);
      for (const [, label] of chapterLinks) {
        await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      const layout = await header.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const links = Array.from(element.querySelectorAll('a')).map(link => link.getBoundingClientRect())
          .filter(rect => rect.width > 0 && rect.height > 0);
        const github = element.querySelector('.header-github')!.getBoundingClientRect();
        return {
          height: bounds.height,
          githubWidth: github.width,
          githubTop: github.top,
          githubRight: github.right,
          allLinksInside: links.every(rect => rect.left >= bounds.left && rect.right <= bounds.right
            && rect.top >= bounds.top && rect.bottom <= bounds.bottom),
          overlap: links.some((first, index) => links.slice(index + 1).some(second => (
            Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
            && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1
          ))),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(layout.height).toBeCloseTo(viewport.width <= 899 ? 100 : 88, 0);
      expect(layout.allLinksInside, 'All visible header links must fit within its reserved height and width.').toBe(true);
      expect(layout.overlap, 'Navigation, identity and GitHub controls must not overlap.').toBe(false);
      await expectCenteredNavigation(header);
      expect(layout.overflow).toBe(false);
      expect(layout.githubRight).toBeGreaterThan(viewport.width * .75);
      expect(layout.githubTop).toBeLessThan(layout.height / 2);
      if (viewport.width <= 390) expect(layout.githubWidth, 'Mobile GitHub stays a compact icon control.').toBeLessThanOrEqual(48);
      if (viewport.width === 1440 || viewport.width === 390) {
        const screenshotPath = test.info().outputPath(`chapter-header-${viewport.width}.png`);
        await header.screenshot({ path: screenshotPath, animations: 'disabled' });
        await test.info().attach(`Chapter header at ${viewport.width}px`, { path: screenshotPath, contentType: 'image/png' });
      }
    });
  }
});

test('chapter links and GitHub remain usable with reduced motion and without JavaScript or web fonts', async ({ browser }) => {
  for (const mode of [
    { name: 'reduced motion', javaScriptEnabled: true, viewport: { width: 1440, height: 900 } },
    { name: '900px desktop with fallback fonts', javaScriptEnabled: true, viewport: { width: 900, height: 700 } },
    { name: 'no JavaScript', javaScriptEnabled: false, viewport: { width: 390, height: 844 } },
  ]) {
    const context = await browser.newContext({ javaScriptEnabled: mode.javaScriptEnabled, viewport: mode.viewport, reducedMotion: 'reduce' });
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const page = await context.newPage();
    try {
      await test.step(mode.name, async () => {
        await page.goto(siteURL);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const navigation = page.getByRole('navigation', { name: '章節導覽' });
        await expectGitHubLink(page.locator('.site-header .header-github'));
        await expectCenteredNavigation(page.locator('.site-header'));
        for (const [id, label] of chapterLinks) {
          const link = navigation.getByRole('link', { name: label, exact: true });
          await link.focus();
          await page.keyboard.press('Enter');
          await expect(page).toHaveURL(new RegExp(`#${id}$`));
          await expect(page.locator(`#${id}`)).toBeInViewport();
          await expect.poll(() => page.locator(`#${id}-heading`).evaluate(element => {
            const bounds = element.getBoundingClientRect();
            const header = document.querySelector('.site-header')!.getBoundingClientRect();
            return bounds.top >= header.bottom - 1 && bounds.top < innerHeight;
          }), { message: 'Native or reduced-motion navigation must not hide the chapter title behind the header.' }).toBe(true);
          if (mode.javaScriptEnabled) await expect(link).toHaveAttribute('aria-current', 'location');
        }
        expect(await page.locator('.site-header').evaluate(element => element.getAnimations({ subtree: true })
          .filter(animation => animation.playState === 'running').length)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    } finally {
      await context.close();
    }
  }
});
