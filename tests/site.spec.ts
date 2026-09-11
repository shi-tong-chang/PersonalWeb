import { test, expect, type Locator, type Page } from '@playwright/test';
import { observeStartupScrollSettled } from './helpers/navigation';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterIds = ['about', 'projects', 'skills', 'timeline', 'contact'];

async function expectChapterAtTop(page: Page, id: string) {
  // Let the same late-font alignment used by the page settle before measuring.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top)),
    { message: `Desktop navigation must finish at the start of the ${id} chapter.` }).toBeLessThanOrEqual(2);
  await expect(page.locator('body')).toHaveAttribute('data-theme', id);
}

async function expectBetweenHeaderAndDock(element: Locator) {
  await expect.poll(() => element.evaluate(target => {
    const bounds = target.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
    return bounds.height > 0 && bounds.top >= header.bottom && bounds.bottom <= dock.top
      && bounds.left >= 0 && bounds.right <= innerWidth;
  }), { message: 'The target must be fully visible between the fixed header and chapter dock.' }).toBe(true);
}

test('the owner is the hero and the Milky Way artwork loads without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://shi-tong-chang.github.io/PersonalWeb/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/PersonalWeb/favicon.svg');
  await expect(page.getByRole('heading', { level: 1 }).locator('.hero-name-en')).toHaveText('SHI-TONG CHANG');
  const landscape = page.locator('.hero-scene img.hero-landscape');
  await expect(landscape).toHaveAttribute('src', '/PersonalWeb/assets/milky-way-v1.webp');
  await expect.poll(() => landscape.evaluate(element => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }), { message: 'The Milky Way hero artwork must load successfully.' }).toBe(true);
  const background = await page.request.get('/PersonalWeb/assets/milky-way-v1.webp');
  expect(background.ok()).toBe(true);
  expect(background.headers()['content-type']).toMatch(/^image\/webp/);
  expect((await background.body()).subarray(0, 4).toString()).toBe('RIFF');
  await expect(page.locator('.chapter')).toHaveCount(5);
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  expect(errors).toEqual([]);
});

test('desktop wheel and keyboard navigate whole chapters in both directions', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'about');
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await expectChapterAtTop(page, 'projects');
  await expect(page).toHaveURL(/#projects$/);
  // A new gesture begins after the transition's short trailing-wheel guard.
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -180);
  await expectChapterAtTop(page, 'about');
  await page.keyboard.press('PageDown');
  await expectChapterAtTop(page, 'projects');
  await page.keyboard.press('End');
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
});

test('one trackpad wheel burst advances only one chapter', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  for (let index = 0; index < 10; index++) await page.mouse.wheel(0, 80);
  await expectChapterAtTop(page, 'projects');
  await page.waitForTimeout(900);
  await expectChapterAtTop(page, 'projects');
  await expect(page).toHaveURL(/#projects$/);
});

test('wheel input during a chapter transition never queues a later jump', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(10);
  await page.mouse.wheel(0, 240);
  await page.mouse.wheel(0, -240);
  await expectChapterAtTop(page, 'projects');
  await page.waitForTimeout(900);
  await expectChapterAtTop(page, 'projects');
});

test('visibility and page lifecycle pauses settle an in-flight chapter instead of leaving half a page', async ({ page }) => {
  await page.goto('./');
  await expectChapterAtTop(page, 'about');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => Object.hasOwn(document, 'hidden'))).toBe(false);
  try {
    // Simulate visibility suspension deterministically in headless Chromium.
    // The temporary own getter is removed in finally, restoring the native one.
    const pausedAt = await page.evaluate(() => {
      const position = scrollY;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      return position;
    });
    expect(pausedAt).toBeGreaterThan(0);
    expect(pausedAt).toBeLessThan(900);
    await page.waitForTimeout(700);
    await expect(page.locator('.scene-stars i').first()).toHaveCSS('animation-play-state', 'paused');
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await expectChapterAtTop(page, 'projects');
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#projects')).toBeFocused();
  await expect(page.locator('.scene-stars i').first()).toHaveCSS('animation-play-state', 'paused');

  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(120);
  const suspendedAt = await page.evaluate(() => {
    const position = scrollY;
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    return position;
  });
  expect(suspendedAt).toBeGreaterThan(900);
  expect(suspendedAt).toBeLessThan(1800);
  await page.waitForTimeout(700);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expectChapterAtTop(page, 'skills');
  await expect(page).toHaveURL(/#skills$/);
  await expect(page.locator('#skills')).toBeFocused();
  await expect(page.locator('.scene-stars i').first()).toHaveCSS('animation-play-state', 'paused');
  await page.locator('.top-nav a[href="#about"]').click();
  await expectChapterAtTop(page, 'about');
  await expect(page.locator('.scene-stars i').first()).toHaveCSS('animation-play-state', 'running');
});

test('chapter navigation, accessible focus, deep links and reload work', async ({ page }) => {
  await page.goto('./');
  const navigation = page.getByRole('navigation', { name: '章節導覽' });
  await expect(navigation.getByRole('link')).toHaveCount(5);
  for (const [id, label] of [
    ['about', '個人介紹'],
    ['projects', '專案經歷'],
    ['skills', '擅長技能'],
    ['timeline', '大事記'],
    ['contact', '聯繫方式'],
  ]) {
    const link = navigation.getByRole('link', { name: label });
    await expect(link).toHaveAttribute('href', `#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await expect(link).toHaveAttribute('aria-current', 'location');
    await expectChapterAtTop(page, id);
  }
  await expect(page.locator('#contact a[href="https://github.com/shi-tong-chang"]')).toBeVisible();
  await page.goto('./#skills');
  await expectChapterAtTop(page, 'skills');
  await page.reload();
  await expectChapterAtTop(page, 'skills');
  await expect(page).toHaveURL(/#skills$/);
});

test('initial chapter hashes align after delayed stylesheet loading and reload', async ({ page }) => {
  let delayedStylesheets = 0;
  // Delay a real render-blocking local asset, rather than adjusting the scroll
  // position under test. Unavailable web fonts keep this scenario deterministic.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.route('**/PersonalWeb/_astro/*.css', async route => {
    delayedStylesheets++;
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  for (const id of ['projects', 'skills']) {
    await page.goto(`./#${id}`);
    await expect(page.locator('body')).toHaveClass(/is-paged/);
    await observeStartupScrollSettled(page);
    await expectChapterAtTop(page, id);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.reload();
    await observeStartupScrollSettled(page);
    await expectChapterAtTop(page, id);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
  }
  expect(delayedStylesheets).toBeGreaterThanOrEqual(3);
});

test('a same-document chapter hash stays aligned after mobile-to-desktop layout startup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#projects');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page.locator('#projects')).toBeInViewport();
  await page.evaluate(() => { document.body.dataset.testDocumentMarker = 'same-document'; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'projects');
  // Navigating to the identical hash can invoke a native fragment jump without
  // another load or hashchange. The marker proves this is not a fresh document.
  await page.goto('./#projects');
  await expect(page.locator('body')).toHaveAttribute('data-test-document-marker', 'same-document');
  await observeStartupScrollSettled(page);
  await expectChapterAtTop(page, 'projects');
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('#current-chapter')).toHaveText('02');
});

test('rapid chapter selection finishes at the latest destination without hiding other sections', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    for (const id of ['projects', 'skills', 'timeline', 'contact']) {
      document.querySelector<HTMLAnchorElement>(`.top-nav a[href="#${id}"]`)!.click();
    }
  });
  await expect(page.locator('#contact')).toBeFocused();
  await expectChapterAtTop(page, 'contact');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  await page.waitForTimeout(850);
  await expectChapterAtTop(page, 'contact');
});

test('the chapter rail, counter, progress and dock action track every chapter and cycle on request', async ({ page }) => {
  await page.goto('./');
  const ids = chapterIds;
  const rail = page.locator('.chapter-rail');
  const next = page.locator('.chapter-dock #next-chapter');
  await expect(rail).toBeVisible();
  await expect(rail.locator('a[data-chapter]')).toHaveCount(5);
  await expect(page.locator('.chapter-dock')).toBeVisible();
  for (const [index, id] of ids.entries()) {
    await expectChapterAtTop(page, id);
    await expect(rail.locator('[aria-current="location"]')).toHaveCount(1);
    await expect(rail.locator(`[data-chapter="${index}"]`)).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('#current-chapter')).toHaveText(String(index + 1).padStart(2, '0'));
    await expect.poll(() => page.locator('#progress-fill').evaluate(fill => (
      fill.getBoundingClientRect().width / fill.parentElement!.getBoundingClientRect().width
    ))).toBeCloseTo((index + 1) / ids.length, 2);
    await expect(next).toHaveAttribute('href', `#${ids[(index + 1) % ids.length]}`);
    await expect(page.locator('#next-label')).toHaveText(index === ids.length - 1 ? '回到開場' : '下一章');
    await expect(page.locator('#next-arrow')).toHaveText(index === ids.length - 1 ? '↑' : '↓');
    if (index < ids.length - 1) await next.click();
  }
  // The final chapter does not wrap from accidental trailing wheel input.
  await page.waitForTimeout(250);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(850);
  await expectChapterAtTop(page, 'contact');
  await expect(page).toHaveURL(/#contact$/);
  await next.click();
  await expectChapterAtTop(page, 'about');
  await expect(page.locator('#current-chapter')).toHaveText('01');
  await rail.locator('[data-chapter="2"]').click();
  await expectChapterAtTop(page, 'skills');
  await expect(page.locator('#skills')).toBeFocused();
  await expect(page.locator('#current-chapter')).toHaveText('03');
});

test('the mobile dock follows native reading without adding history or overwriting project deep links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#about');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  const dock = page.locator('.chapter-dock');
  await expect(dock).toBeVisible();
  const dockBounds = await dock.boundingBox();
  expect(dockBounds).not.toBeNull();
  expect(dockBounds!.y + dockBounds!.height).toBeCloseTo(844, 0);
  expect(dockBounds!.x).toBeGreaterThanOrEqual(0);
  expect(dockBounds!.x + dockBounds!.width).toBeLessThanOrEqual(390);
  const navigation = page.getByRole('navigation', { name: '章節導覽' });
  await navigation.getByRole('link', { name: '聯繫方式' }).click();
  await expect(page.locator('#current-chapter')).toHaveText('05');
  await expect(page.locator('#next-chapter')).toHaveAttribute('href', '#about');
  // Observe completion before clicking: scrollY <= 2 can still be the last
  // frames of a native smooth scroll and is not yet a fresh-wheel boundary.
  await Promise.all([
    page.evaluate(() => new Promise<void>((resolve, reject) => {
      const onScrollEnd = () => {
        if (scrollY > 2) return;
        clearTimeout(timeout);
        window.removeEventListener('scrollend', onScrollEnd);
        resolve();
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener('scrollend', onScrollEnd);
        reject(new Error('Native return-to-about scrolling did not finish within five seconds.'));
      }, 5000);
      window.addEventListener('scrollend', onScrollEnd);
    })),
    page.locator('#next-chapter').click(),
  ]);
  await expect(page.locator('#current-chapter')).toHaveText('01');
  await expect(page).toHaveURL(/#about$/);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
  const historyLength = await page.evaluate(() => history.length);
  const toProjects = await page.locator('#projects').evaluate(section => section.getBoundingClientRect().top);
  await page.mouse.move(190, 400);
  await page.mouse.wheel(0, toProjects);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page.locator('#current-chapter')).toHaveText('02');
  await expect(page).toHaveURL(/#projects$/);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  await page.goto('./#project-panel-project-02');
  await expect(page.locator('#project-tab-project-02')).toHaveAttribute('aria-selected', 'true');
  // Position the reader inside the linked article before exercising native wheel.
  await page.locator('#project-panel-project-02').evaluate(panel => panel.scrollIntoView({ behavior: 'instant', block: 'start' }));
  const deepLinkHistoryLength = await page.evaluate(() => history.length);
  const toSkills = await page.locator('#skills').evaluate(section => section.getBoundingClientRect().top);
  await page.mouse.wheel(0, toSkills);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await expect(page.locator('#current-chapter')).toHaveText('03');
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/#project-panel-project-02$/);
  expect(await page.evaluate(() => history.length)).toBe(deepLinkHistoryLength);
});

test('all five chapters and the complete project stage fit common desktop viewports without clipping', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 700 },
    { width: 900, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(page.locator('body')).toHaveClass(/is-paged/);
    for (const id of chapterIds) {
      await page.locator(`.top-nav a[href="#${id}"]`).click();
      await expectChapterAtTop(page, id);
      const bounds = await page.locator(`#${id}`).evaluate(section => {
        const chapter = section.getBoundingClientRect();
        const content = section.querySelector(':scope > .section-inner')!.getBoundingClientRect();
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
        return {
          height: chapter.height,
          contentVisible: content.top >= header.bottom - 1 && content.bottom <= dock.top + 1,
          noOverflow: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(Math.abs(bounds.height - viewport.height), `${id} should occupy one ${viewport.height}px viewport.`).toBeLessThanOrEqual(2);
      expect(bounds.contentVisible, `${id} content must fit between header and dock at ${viewport.width}×${viewport.height}.`).toBe(true);
      expect(bounds.noOverflow).toBe(true);
      if (id === 'projects') {
        await expectBetweenHeaderAndDock(page.locator('#projects-heading'));
        await expectBetweenHeaderAndDock(page.locator('[data-project-track]'));
        await expectBetweenHeaderAndDock(page.locator('.library-caption'));
        const panel = page.getByRole('tabpanel');
        for (const selector of ['h3.project-name', '.project-description', '.tags', '.project-actions', '.project-visual']) {
          await expectBetweenHeaderAndDock(panel.locator(selector));
        }
        // Role copy is optional and currently empty in the real project data.
        if (await panel.locator('.project-role').count()) await expectBetweenHeaderAndDock(panel.locator('.project-role'));
      }
    }
  }
});

test('switching desktop, mobile, short-screen and reduced-motion modes preserves the current chapter', async ({ page }) => {
  await page.goto('./#skills');
  await expectChapterAtTop(page, 'skills');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await expect(page.locator('#skills')).toBeInViewport();
  await expect.poll(() => page.locator('#skills-heading').evaluate(heading => {
    const bounds = heading.getBoundingClientRect();
    return bounds.top >= document.querySelector('.site-header')!.getBoundingClientRect().bottom
      && bounds.top < innerHeight;
  }), { message: 'The preserved mobile chapter heading must not be hidden by the fixed header.' }).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'skills');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await expect(page.locator('#skills')).toBeInViewport();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'skills');
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'skills');
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
});

test('entering projects directly reveals ten equal-priority slots with honest reservations and a usable legacy fragment', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  const gallery = page.locator('[data-project-gallery]');
  const tabs = gallery.getByRole('tab');
  await expect(page.locator('div#project-archive.project-atlas')).toBeVisible();
  await expect(page.locator('.featured-card, [data-project-open], #projects details, #projects summary')).toHaveCount(0);
  await expect(gallery).toBeInViewport();
  await expect(gallery).toHaveAccessibleName(/專案經歷/);
  await expect(tabs).toHaveCount(10);
  await expect(tabs.first()).toContainText('PersonalWeb');
  await expect(tabs.first()).not.toContainText('預留');
  for (const tab of await tabs.all()) await expect(tab).toHaveClass('project-tab');
  for (const tab of (await tabs.all()).slice(1)) await expect(tab).toContainText('預留');
  const tabWidths = await tabs.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(Math.max(...tabWidths) - Math.min(...tabWidths)).toBeLessThanOrEqual(1);
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(gallery.locator('.project-state.is-reserved')).toHaveCount(9);
  await page.goto('./#project-archive');
  await expect(gallery).toBeInViewport();
  await expect(page.getByRole('tabpanel').locator('h3.project-name')).toBeInViewport();
  await expect(page).toHaveURL(/#project-archive$/);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
});

for (const height of [900, 600]) {
  test(`direct project selection keeps keyboard focus visible at ${height}px height`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height });
    await page.goto('./#projects');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const gallery = page.locator('[data-project-gallery]');
    const track = page.locator('[data-project-track]');
    if (height === 900) await expectChapterAtTop(page, 'projects');
    if (height === 600) {
      // Native fragment scrolling may still be finishing after load/fonts.ready.
      // Set up a fresh keyboard interaction only once that navigation settles.
      await observeStartupScrollSettled(page);
      await track.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expectBetweenHeaderAndDock(gallery.getByRole('tab').first());
    }
    // Establish focus without starting the browser's separate smooth focus
    // scroll, so the assertion below measures only project selection behavior.
    await gallery.getByRole('tab').first().evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
    const initialScroll = await page.evaluate(() => scrollY);
    for (const [key, id] of [['ArrowRight', 'project-02'], ['End', 'project-10'], ['Home', 'personal-web']]) {
      await page.keyboard.press(key);
      const tab = page.locator(`#project-tab-${id}`);
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab).toBeFocused();
      await expect(tab).toBeInViewport();
      await expectBetweenHeaderAndDock(tab);
      if (height === 900) await expectBetweenHeaderAndDock(page.locator('#projects-heading'));
      await expect(page.locator(`#project-panel-${id}`)).toHaveAttribute('aria-hidden', 'false');
      await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
      await expect(page).toHaveURL(new RegExp(`#project-panel-${id}$`));
      expect(Math.abs(await page.evaluate(() => scrollY) - initialScroll)).toBeLessThanOrEqual(2);
    }
  });
}

test('native Tab focus does not shift a fully visible project rail out of its desktop chapter', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  const firstTab = page.getByRole('tab').first();
  await expectBetweenHeaderAndDock(firstTab);
  await page.locator('#projects').evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press('Tab');
  await expect(firstTab).toBeFocused();
  // Include any browser-owned smooth focus scrolling, not just the immediate
  // keydown result. Existing fixed-dock padding should not be counted twice.
  await page.waitForTimeout(650);
  await expectChapterAtTop(page, 'projects');
  await expectBetweenHeaderAndDock(firstTab);
});

test('long project content reads within its chapter and only a fresh boundary gesture changes pages', async ({ page }) => {
  await page.goto('./#projects');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expectChapterAtTop(page, 'projects');
  const projects = page.locator('#projects');
  await page.getByRole('tabpanel').locator('.project-description').evaluate(element => {
    element.append(document.createTextNode('補上背景、技術選擇與實作心得，長內容也必須能完整閱讀。'.repeat(90)));
  });
  await expect.poll(() => projects.evaluate(section => section.getBoundingClientRect().height - innerHeight)).toBeGreaterThan(200);
  await projects.evaluate(section => window.scrollTo({ top: section.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
  await page.waitForTimeout(250);
  await page.mouse.move(24, 450);
  const start = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
  expect(await page.evaluate(() => scrollY) - start).toBeLessThan(350);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');

  const chapterEnd = await projects.evaluate(section => {
    const bounds = section.getBoundingClientRect();
    const end = bounds.top + scrollY + bounds.height - innerHeight;
    window.scrollTo({ top: end - 100, behavior: 'instant' });
    return end;
  });
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 800);
  await page.mouse.wheel(0, 800);
  // Intrinsic text height can put the boundary on a half pixel; Chromium may
  // quantize scrollY to a whole pixel. Still require settling within one pixel.
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - chapterEnd)).toBeLessThanOrEqual(1);
  await page.waitForTimeout(850);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  expect(Math.abs(await page.evaluate(() => scrollY) - chapterEnd)).toBeLessThanOrEqual(2);
  await page.mouse.wheel(0, 180);
  await expectChapterAtTop(page, 'skills');
});

test('direct project selection cancels an older chapter transition and remains reloadable', async ({ page }) => {
  await page.goto('./#projects');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await expectChapterAtTop(page, 'projects');
  await page.locator('.top-nav a[href="#skills"]').click();
  await page.waitForTimeout(120);
  const tab = page.locator('#project-tab-project-02');
  const selectedAt = await tab.evaluate(element => {
    const tab = element as HTMLAnchorElement;
    tab.focus({ preventScroll: true });
    tab.click();
    return scrollY;
  });
  expect(selectedAt).toBeGreaterThan(900);
  expect(selectedAt).toBeLessThan(1800);
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#project-panel-project-02$/);
  await expect(tab).toBeInViewport();
  await page.waitForTimeout(900);
  await expect(tab).toBeFocused();
  await expect(tab).toBeInViewport();
  await expectBetweenHeaderAndDock(tab);
  expect(Math.abs(await page.evaluate(() => scrollY) - selectedAt)).toBeLessThanOrEqual(2);
  await page.reload();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'project-panel-project-02');
  await expect(page.getByRole('tabpanel').locator('h3.project-name')).toBeInViewport();
  await expect(page).toHaveURL(/#project-panel-project-02$/);
});

test('PageDown and ArrowDown read long chapter content before leaving it', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  await page.getByRole('tabpanel').locator('.project-description').evaluate(element => {
    element.append(document.createTextNode('補上背景、技術選擇與實作心得，長內容也必須能完整閱讀。'.repeat(90)));
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.locator('#projects').evaluate(section => {
    window.scrollTo({ top: section.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    (section as HTMLElement).focus({ preventScroll: true });
  });
  const start = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
  const afterPageDown = await page.evaluate(() => scrollY);
  expect(afterPageDown - start).toBeLessThanOrEqual(900);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(afterPageDown);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#projects$/);
});

test('a later chapter link wins over direct project selection in the same frame', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('#project-tab-project-02')!.click();
    document.querySelector<HTMLAnchorElement>('.top-nav a[href="#contact"]')!.click();
  });
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('#contact')).toBeFocused();
  await expect(page).toHaveURL(/#contact$/);
  await page.waitForTimeout(900);
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('#contact')).toBeFocused();
});

test('long project copy remains reachable without clipping the always-visible stage', async ({ page }) => {
  await page.goto('./#projects');
  const archive = page.locator('div#project-archive');
  await archive.getByRole('tabpanel').locator('.project-description').evaluate(element => {
    element.append(document.createTextNode('這是延長的專案介紹，補上背景、過程與實作心得。'.repeat(90)));
    const lastLine = document.createElement('span');
    lastLine.dataset.testid = 'extended-copy-end';
    lastLine.style.display = 'block';
    lastLine.textContent = '完整內容的最後一行';
    element.append(lastLine);
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const lastLine = page.getByTestId('extended-copy-end');
  await lastLine.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect.poll(() => lastLine.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const section = element.closest('.chapter')!.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
    return bounds.height > 0
      && bounds.top >= Math.max(header.bottom, section.top)
      && bounds.bottom <= Math.min(dock.top, section.bottom)
      && bounds.left >= Math.max(0, section.left)
      && bounds.right <= Math.min(innerWidth, section.right);
  }), { message: 'The final line must be fully visible inside its section between the header and dock.' }).toBe(true);
  await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /聯繫方式/ }).click();
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
});

test('all sections and the direct project gallery fit phone, narrow tablet and desktop widths', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 601, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of chapterIds) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      { message: `No page-level horizontal overflow at ${viewport.width}px, including the direct project gallery.` }).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      const brand = document.querySelector('.brand')!.getBoundingClientRect();
      const navigation = document.querySelector('.top-nav')!.getBoundingClientRect();
      const separated = brand.right <= navigation.left + 1 || brand.bottom <= navigation.top + 1
        || navigation.right <= brand.left + 1 || navigation.bottom <= brand.top + 1;
      return separated
        && brand.left >= header.left
        && navigation.right <= header.right
        && brand.top >= header.top
        && brand.bottom <= header.bottom
        && navigation.top >= header.top
        && navigation.bottom <= header.bottom;
    }), { message: `The brand and navigation must not collide at ${viewport.width}px.` }).toBe(true);
  }
});

test('large touch screens retain native scrolling and accessible navigation', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 1366 } });
  const page = await context.newPage();
  try {
    await page.goto(siteURL);
    await expect(page.locator('body')).not.toHaveClass(/is-paged/);
    await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /聯繫方式/ }).tap();
    await expect(page.locator('#contact')).toBeInViewport();
    await expect(page.locator('#contact')).toBeFocused();
    await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('reduced motion disables hero animation and parallax without changing access to content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const landscape = page.locator('.hero-landscape');
  const scene = page.locator('.hero-scene');
  await expect(landscape).toHaveCSS('transform', 'none');
  await expect(landscape).toHaveCSS('animation-name', 'none');
  await expect(scene).toHaveCSS('transform', 'none');
  await page.mouse.move(1050, 300);
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(150);
  await expect(landscape).toHaveCSS('transform', 'none');
  await expect(landscape).toHaveCSS('animation-name', 'none');
  await expect(scene).toHaveCSS('transform', 'none');
  await expect(page.locator('#about')).toHaveCSS('--scene-shift', '0px');
  await expect(page.locator('#about')).toHaveCSS('--scene-scale', '1');
  await expect(page.locator('#about')).toHaveCSS('--scene-opacity', '1');
  await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('#contact')).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /個人介紹/ }).click();
  await expect(page.locator('#about')).toBeInViewport();
});

test('optional email copy reports success and preserves a usable fallback when clipboard access fails', async ({ page }) => {
  const email = 'hello@example.test';
  // Inject the optional data-driven controls in the HTML response, before the
  // normal module bootstrap binds listeners. No real profile data is changed.
  await page.route('**/PersonalWeb/', async route => {
    const response = await route.fetch();
    const html = await response.text();
    const marker = '<div class="contact-actions">';
    expect(html).toContain(marker);
    const controls = `<div class="email-actions"><a href="mailto:${email}">${email}</a><button type="button" id="copy-email" data-email="${email}">複製 Email</button><span id="copy-status" role="status"></span></div>`;
    await route.fulfill({ response, body: html.replace(marker, marker + controls) });
  });
  await page.addInitScript(() => {
    const state = { copied: '', reject: false };
    Object.defineProperty(window, '__clipboardTest', { value: state });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value: string) => {
        if (state.reject) throw new Error('Clipboard access denied for this test');
        state.copied = value;
      } },
    });
  });
  await page.goto('./#contact');
  const button = page.locator('#copy-email');
  const status = page.locator('#copy-status');
  await button.click();
  await expect(status).toHaveText('Email 已複製');
  expect(await page.evaluate(() => (window as unknown as { __clipboardTest: { copied: string } }).__clipboardTest.copied)).toBe(email);
  await page.evaluate(() => { (window as unknown as { __clipboardTest: { reject: boolean } }).__clipboardTest.reject = true; });
  await button.click();
  await expect(status).toHaveText('無法自動複製，請選取上方 Email 複製。');
  await expect(page.getByRole('link', { name: email, exact: true })).toHaveAttribute('href', `mailto:${email}`);
  await expect(page.getByRole('link', { name: email, exact: true })).toBeVisible();
});

test('without JavaScript or web fonts native navigation and the full project gallery remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(siteURL);
    await expect(page.locator('.chapter')).toHaveCount(5);
    await expect(page.getByRole('heading', { level: 1 }).locator('.hero-name-en')).toHaveText('SHI-TONG CHANG');
    await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /專案經歷/ }).click();
    // Wait for native smooth fragment scrolling before a no-JS actionability check.
    await expect.poll(() => page.locator('#projects').evaluate(element => Math.abs(
      element.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    ))).toBeLessThanOrEqual(1);
    const headerContrast = await page.locator('.site-header').evaluate(header => {
      const values = (color: string) => color.match(/[\d.]+/g)!.map(Number);
      const background = values(getComputedStyle(header).backgroundColor);
      const underlay = values(getComputedStyle(document.querySelector('#projects')!).backgroundColor);
      const alpha = background[3] ?? 1;
      const backdrop = background.slice(0, 3).map((channel, index) => channel * alpha + underlay[index] * (1 - alpha));
      const navigationLink = getComputedStyle(header.querySelector('nav a[href="#projects"]')!);
      const opacity = parseFloat(navigationLink.opacity);
      const foreground = values(navigationLink.color).slice(0, 3)
        .map((channel, index) => channel * opacity + backdrop[index] * (1 - opacity));
      const luminance = (channels: number[]) => channels.reduce((sum, channel, index) => {
        const linear = channel / 255;
        return sum + (linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4)
          * [0.2126, 0.7152, 0.0722][index];
      }, 0);
      const [lighter, darker] = [luminance(foreground), luminance(backdrop)].sort((a, b) => b - a);
      return { alpha, ratio: (lighter + 0.05) / (darker + 0.05) };
    });
    expect(headerContrast.alpha, 'Without JS, the header still needs an opaque backdrop over light sections.').toBeGreaterThanOrEqual(0.9);
    expect(headerContrast.ratio, 'The unfocused navigation label must retain readable contrast without JS.').toBeGreaterThanOrEqual(4.5);
    const archive = page.locator('div#project-archive');
    await expect(archive).toBeVisible();
    await expect(page.locator('#projects details, #projects summary')).toHaveCount(0);
    await expect(archive.locator('[data-project-panel]')).toHaveCount(10);
    await expect(archive.locator('[data-project-panel][inert]')).toHaveCount(0);
    await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /聯繫方式/ }).click();
    await expect(page.locator('#contact')).toBeInViewport();
  } finally {
    await context.close();
  }
});
