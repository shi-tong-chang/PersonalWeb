import { test, expect, type Locator, type Page } from '@playwright/test';
import { observeStartupScrollSettled } from './helpers/navigation';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterIds = ['about', 'projects', 'skills', 'timeline', 'contact'] as const;
const illustratedChapters = chapterIds.slice(1);
const sceneImage = (page: Page, id: string) => page.locator(`#${id} [data-scene="${id}"] img`).first();
const sceneAsset = (id: string) => `/PersonalWeb/assets/${id === 'about' ? 'milky-way' : `scene-${id}`}-v1.webp`;

async function decoded(image: Locator) {
  await expect.poll(() => image.evaluate(element => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  })).toBe(true);
  await image.evaluate(element => (element as HTMLImageElement).decode());
}

async function chapterAtTop(page: Page, id: string) {
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top)))
    .toBeLessThanOrEqual(2);
  await expect(page.locator('body')).toHaveAttribute('data-theme', id);
}

async function runningSceneMotion(scene: Locator) {
  return scene.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running').length);
}

test('every chapter has its own decorative, successfully served WebP background', async ({ page }) => {
  await page.goto('./');
  const sources = new Set<string>();
  for (const id of chapterIds) {
    const scene = page.locator(`#${id} [data-scene="${id}"]`);
    await expect(scene).toHaveCount(1);
    await expect(scene).toHaveAttribute('aria-hidden', 'true');
    await expect(scene).toHaveCSS('pointer-events', 'none');
    const image = sceneImage(page, id);
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveAttribute('src', sceneAsset(id));
    await expect(image).toHaveCSS('object-fit', 'cover');
    sources.add((await image.getAttribute('src'))!);
    const response = await page.request.get(sceneAsset(id));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/webp/);
    const bytes = await response.body();
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
  }
  expect(sources.size).toBe(chapterIds.length);
});

test('each desktop wheel chapter change reveals a different decoded scene while keeping content usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await observeStartupScrollSettled(page);
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  const visibleSources = new Set<string>();
  // The gutter is outside the project rail's independent horizontal controls.
  await page.mouse.move(24, 450);
  for (const [index, id] of chapterIds.entries()) {
    if (index > 0) {
      // A separate gesture starts after the pager's trailing-wheel guard.
      await page.waitForTimeout(250);
      await page.mouse.wheel(0, 180);
    }
    await chapterAtTop(page, id);
    const scene = page.locator(`#${id} [data-scene="${id}"]`);
    await expect(scene).toBeInViewport();
    const image = sceneImage(page, id);
    await decoded(image);
    visibleSources.add(await image.evaluate(element => (element as HTMLImageElement).currentSrc));
    const heading = page.locator(`#${id}-heading`);
    await expect(heading).toBeInViewport();
    await expect.poll(() => heading.evaluate(element => {
      for (let node: Element | null = element; node && !node.matches('.chapter'); node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < .99) return false;
      }
      return true;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (id === 'projects') {
      await expect(page.getByRole('tab')).toHaveCount(10);
      await expect(page.getByRole('tabpanel')).toHaveCount(1);
      await expect(page.getByRole('tabpanel').locator('.project-name')).toBeInViewport();
    }
  }
  expect(visibleSources.size).toBe(chapterIds.length);
  await expect(page.locator('#contact .primary-button')).toBeVisible();
  await page.locator('#contact .primary-button').click({ trial: true });
  await page.locator('.back-top').click();
  await chapterAtTop(page, 'about');
  expect(errors).toEqual([]);
});

test('illustrated scene motion runs only in the active chapter and resumes after reentry or suspension', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('animationstart', event => {
      if (!(event instanceof AnimationEvent) || event.animationName !== 'chapter-scene-enter') return;
      const chapter = (event.target as Element).closest<HTMLElement>('.chapter');
      if (chapter) chapter.dataset.testSceneEntrances = String(Number(chapter.dataset.testSceneEntrances ?? 0) + 1);
    });
  });
  await page.goto('./#projects');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await observeStartupScrollSettled(page);
  await chapterAtTop(page, 'projects');
  const projects = page.locator('#projects');
  const scene = projects.locator('.chapter-scene');
  const drift = scene.locator('[data-scene-drift]');
  await expect(projects).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(async () => Number(await projects.getAttribute('data-test-scene-entrances'))).toBeGreaterThan(0);
  const firstEntrances = Number(await projects.getAttribute('data-test-scene-entrances'));
  await expect.poll(() => drift.evaluate(element => element.getAnimations().some(animation => (
    animation.playState === 'running' && animation.effect?.getComputedTiming().iterations === Infinity
  )))).toBe(true);
  for (const id of illustratedChapters.filter(id => id !== 'projects')) {
    await expect.poll(() => runningSceneMotion(page.locator(`#${id} .chapter-scene`))).toBe(0);
  }
  await page.locator('.top-nav a[href="#skills"]').click();
  await chapterAtTop(page, 'skills');
  await expect(projects).toHaveAttribute('data-motion-active', 'false');
  await expect.poll(() => runningSceneMotion(scene)).toBe(0);
  await page.locator('.top-nav a[href="#projects"]').click();
  await chapterAtTop(page, 'projects');
  await expect(projects).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(async () => Number(await projects.getAttribute('data-test-scene-entrances'))).toBeGreaterThan(firstEntrances);
  await expect.poll(() => runningSceneMotion(scene)).toBeGreaterThan(0);
  expect(await page.evaluate(() => Object.hasOwn(document, 'hidden'))).toBe(false);
  try {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(projects).toHaveAttribute('data-motion-active', 'false');
    await expect.poll(() => runningSceneMotion(scene)).toBe(0);
    await expect(sceneImage(page, 'projects')).toBeVisible();
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await expect(projects).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(() => runningSceneMotion(scene)).toBeGreaterThan(0);
});

test('reduced motion retains each scene without entrance or ambient animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  for (const id of illustratedChapters) {
    await page.locator(`.top-nav a[href="#${id}"]`).click();
    const scene = page.locator(`#${id} .chapter-scene`);
    await expect(scene).toBeInViewport();
    await decoded(sceneImage(page, id));
    await expect(sceneImage(page, id)).toBeVisible();
    await expect.poll(() => runningSceneMotion(scene)).toBe(0);
    await expect(scene.locator('[data-scene-drift]')).toHaveCSS('animation-name', 'none');
    await expect(page.locator(`#${id}-heading`)).toBeVisible();
  }
  await expect(page.locator('.chapter[data-motion-active="true"]')).toHaveCount(0);
});

test('without JavaScript every distinct scene remains visible and project articles stay in natural flow', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(siteURL);
    for (const id of chapterIds) {
      await page.locator(`.top-nav a[href="#${id}"]`).click();
      // Disabled page scripts cannot run the helper's window.setTimeout.
      // Poll the native fragment destination from the test runner instead.
      const destination = await page.locator(`#${id}`).evaluate(section => {
        const top = section.getBoundingClientRect().top + scrollY;
        const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
        return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, top - padding - margin));
      });
      await expect.poll(() => page.evaluate(target => Math.abs(scrollY - target), destination)).toBeLessThanOrEqual(1);
      const scene = page.locator(`#${id} [data-scene="${id}"]`);
      await expect(scene).toBeInViewport();
      const image = sceneImage(page, id);
      await decoded(image);
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate(element => {
        for (let node: Element | null = element; node && !node.matches('.chapter'); node = node.parentElement) {
          if (Number(getComputedStyle(node).opacity) <= 0) return false;
        }
        return true;
      })).toBe(true);
      await expect.poll(() => runningSceneMotion(scene)).toBe(0);
    }
    await expect(page.locator('.chapter[data-motion-active]')).toHaveCount(0);
    await expect(page.locator('[data-project-gallery]')).not.toHaveClass(/is-enhanced/);
    await expect(page.locator('[data-project-gallery]').getByRole('article')).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});

test('mobile scene backgrounds do not stretch content, clip long milestones or intercept navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#timeline');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await observeStartupScrollSettled(page);
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  const timeline = page.locator('#timeline');
  const previousHeight = await timeline.evaluate(element => element.getBoundingClientRect().height);
  await timeline.locator('.timeline-description').last().evaluate(element => {
    element.append(document.createTextNode('記錄學習、實作與每個重要轉折，長篇大事記也應完整保留。'.repeat(80)));
  });
  await expect.poll(() => timeline.evaluate(element => element.getBoundingClientRect().height))
    .toBeGreaterThan(previousHeight + 500);
  const scene = timeline.locator('.chapter-scene');
  await expect(scene).toHaveCSS('position', 'absolute');
  await expect(scene).toHaveCSS('pointer-events', 'none');
  await expect(sceneImage(page, 'timeline')).toHaveCSS('object-fit', 'cover');
  const lastTitle = timeline.locator('.timeline-event-title').last();
  await lastTitle.scrollIntoViewIfNeeded();
  await expect(lastTitle).toBeInViewport();
  await expect.poll(() => timeline.evaluate(element => {
    const chapter = element.getBoundingClientRect();
    const events = element.querySelector('.timeline-events')!.getBoundingClientRect();
    return events.bottom <= chapter.bottom && events.left >= 0 && events.right <= innerWidth;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.top-nav a[href="#projects"]').click();
  await observeStartupScrollSettled(page);
  const firstTab = page.getByRole('tab').first();
  await firstTab.scrollIntoViewIfNeeded();
  await firstTab.click();
  await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  await page.locator('.top-nav a[href="#contact"]').click();
  await observeStartupScrollSettled(page);
  await expect(page.locator('#contact')).toBeInViewport();
  await expect(page.locator('#contact .primary-button')).toBeVisible();
  await page.locator('#contact .primary-button').click({ trial: true });
});
