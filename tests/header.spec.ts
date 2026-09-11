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
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1101, height: 800 },
    { width: 1100, height: 800 },
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
    { name: 'no JavaScript', javaScriptEnabled: false, viewport: { width: 390, height: 844 } },
  ]) {
    const context = await browser.newContext({ javaScriptEnabled: mode.javaScriptEnabled, viewport: mode.viewport, reducedMotion: 'reduce' });
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const page = await context.newPage();
    try {
      await test.step(mode.name, async () => {
        await page.goto(siteURL);
        const navigation = page.getByRole('navigation', { name: '章節導覽' });
        await expectGitHubLink(page.locator('.site-header .header-github'));
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
