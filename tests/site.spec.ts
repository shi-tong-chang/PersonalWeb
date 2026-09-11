import { test, expect, type Page } from '@playwright/test';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';

async function expectChapterAtTop(page: Page, id: string) {
  // Let the same late-font alignment used by the page settle before measuring.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top)),
    { message: `Desktop navigation must finish at the start of the ${id} chapter.` }).toBeLessThanOrEqual(2);
  await expect(page.locator('body')).toHaveAttribute('data-theme', id);
}

test('the owner is the hero and the star-sea artwork loads without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://shi-tong-chang.github.io/PersonalWeb/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/PersonalWeb/favicon.svg');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/SHI-TONG\s*CHANG/);
  const landscape = page.locator('.hero-scene img.hero-landscape');
  await expect(landscape).toHaveAttribute('src', '/PersonalWeb/assets/star-sea-v1.webp');
  await expect.poll(() => landscape.evaluate(element => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }), { message: 'The star-sea hero artwork must load successfully.' }).toBe(true);
  await expect(page.locator('.chapter')).toHaveCount(4);
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
  await page.locator('nav a[href="#about"]').click();
  await expectChapterAtTop(page, 'about');
  await expect(page.locator('.scene-stars i').first()).toHaveCSS('animation-play-state', 'running');
});

test('chapter navigation, accessible focus, deep links and reload work', async ({ page }) => {
  await page.goto('./');
  const navigation = page.getByRole('navigation', { name: '章節導覽' });
  await expect(navigation.getByRole('link')).toHaveCount(4);
  for (const [id, label] of [
    ['about', '個人介紹'],
    ['projects', '專案經歷'],
    ['skills', '擅長技能'],
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

test('rapid chapter selection finishes at the latest destination without hiding other sections', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    for (const id of ['projects', 'skills', 'contact']) {
      document.querySelector<HTMLAnchorElement>(`nav a[href="#${id}"]`)!.click();
    }
  });
  await expect(page.locator('#contact')).toBeFocused();
  await expectChapterAtTop(page, 'contact');
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  await page.waitForTimeout(850);
  await expectChapterAtTop(page, 'contact');
});

test('closed chapters fit common desktop viewports without clipping their content', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(page.locator('body')).toHaveClass(/is-paged/);
    for (const id of ['about', 'projects', 'skills', 'contact']) {
      await page.locator(`nav a[href="#${id}"]`).click();
      await expectChapterAtTop(page, id);
      const bounds = await page.locator(`#${id}`).evaluate(section => {
        const chapter = section.getBoundingClientRect();
        const content = section.querySelector(':scope > .section-inner')!.getBoundingClientRect();
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        return {
          height: chapter.height,
          contentVisible: content.top >= header.bottom - 1 && content.bottom <= innerHeight + 1,
          noOverflow: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(Math.abs(bounds.height - viewport.height), `${id} should occupy one ${viewport.height}px viewport.`).toBeLessThanOrEqual(2);
      expect(bounds.contentVisible, `${id} content must fit below the header at ${viewport.width}×${viewport.height}.`).toBe(true);
      expect(bounds.noOverflow).toBe(true);
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

test('three featured projects clearly separate the real website from two reserved slots', async ({ page }) => {
  await page.goto('./#projects');
  const archive = page.locator('details#project-archive');
  await expect(archive).not.toHaveAttribute('open');
  const cards = page.locator('.featured-grid a.featured-card[data-project-open]');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute('data-project-open', 'personal-web');
  await expect(cards.first()).toContainText('PersonalWeb');
  await expect(cards.first()).not.toContainText('預留');
  for (const card of await cards.all()) await expect(card).toHaveAttribute('href', '#project-archive');
  for (const card of [cards.nth(1), cards.nth(2)]) await expect(card).toContainText('預留');
});

for (const height of [900, 600]) {
  test(`each featured card opens its matching panel with visible keyboard focus at ${height}px height`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height });
    await page.goto('./#projects');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const archive = page.locator('details#project-archive');
    const cards = page.locator('.featured-grid a.featured-card[data-project-open]');
    for (const card of await cards.all()) {
      const id = await card.getAttribute('data-project-open');
      await card.click();
      await expect(archive).toHaveAttribute('open');
      const tab = page.locator(`#project-tab-${id}`);
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab).toBeFocused();
      await expect(tab).toBeInViewport();
      await expect.poll(() => tab.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        return bounds.height > 0 && bounds.top >= header.bottom && bounds.bottom <= innerHeight
          && bounds.left >= 0 && bounds.right <= innerWidth;
      }), { message: `The focused ${id} tab must be fully visible below the header at 1440×${height}.` }).toBe(true);
      await expect(page.locator(`#project-panel-${id}`)).toHaveAttribute('aria-hidden', 'false');
      await expect(archive.getByRole('tabpanel')).toHaveCount(1);
      await archive.locator(':scope > summary').click();
      await expect(archive).not.toHaveAttribute('open');
    }
  });
}

test('an expanded archive reads within its chapter and only a fresh boundary gesture changes pages', async ({ page }) => {
  await page.goto('./#projects');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expectChapterAtTop(page, 'projects');
  const projects = page.locator('#projects');
  await page.locator('#project-archive > summary').click();
  await expect(page.locator('#project-archive')).toHaveAttribute('open');
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
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(chapterEnd, 0);
  await page.waitForTimeout(850);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  expect(Math.abs(await page.evaluate(() => scrollY) - chapterEnd)).toBeLessThanOrEqual(2);
  await page.mouse.wheel(0, 180);
  await expectChapterAtTop(page, 'skills');
});

test('featured navigation cancels a running chapter transition without losing visible focus', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(10);
  await page.locator('[data-project-open="project-02"]').evaluate(link => (link as HTMLAnchorElement).click());
  const tab = page.locator('#project-tab-project-02');
  await expect(page.locator('#project-archive')).toHaveAttribute('open');
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#project-panel-project-02$/);
  await expect(tab).toBeInViewport();
  await page.waitForTimeout(900);
  await expect(tab).toBeFocused();
  await expect(tab).toBeInViewport();
  await page.reload();
  await expect(page.locator('#project-archive')).toHaveAttribute('open');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'project-panel-project-02');
  await expect(page.getByRole('tabpanel').locator('h4.project-name')).toBeInViewport();
  await expect(page).toHaveURL(/#project-panel-project-02$/);
});

test('PageDown and ArrowDown read long chapter content before leaving it', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  await page.locator('#project-archive > summary').click();
  await expect(page.locator('#project-archive')).toHaveAttribute('open');
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

test('a later chapter link wins over a featured card in the same frame', async ({ page }) => {
  await page.goto('./#projects');
  await expectChapterAtTop(page, 'projects');
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('[data-project-open="project-02"]')!.click();
    document.querySelector<HTMLAnchorElement>('nav a[href="#contact"]')!.click();
  });
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('#contact')).toBeFocused();
  await expect(page).toHaveURL(/#contact$/);
  await page.waitForTimeout(900);
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('#contact')).toBeFocused();
});

test('long project copy remains reachable after the archive expands', async ({ page }) => {
  await page.goto('./#projects');
  const archive = page.locator('details#project-archive');
  await archive.locator(':scope > summary').click();
  await expect(archive).toHaveAttribute('open');
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
    return bounds.height > 0
      && bounds.top >= Math.max(header.bottom, section.top)
      && bounds.bottom <= Math.min(innerHeight, section.bottom)
      && bounds.left >= Math.max(0, section.left)
      && bounds.right <= Math.min(innerWidth, section.right);
  }), { message: 'The final line must be fully visible inside its section below the fixed header.' }).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expectChapterAtTop(page, 'contact');
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
});

test('all sections and the archive fit phone, narrow tablet and desktop widths', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 601, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const archive = page.locator('details#project-archive');
    if ((await archive.getAttribute('open')) === null) await archive.locator(':scope > summary').click();
    for (const id of ['about', 'projects', 'skills', 'contact']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      { message: `No page-level horizontal overflow at ${viewport.width}px, including the expanded project archive.` }).toBe(true);
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
    await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).tap();
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
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('#contact')).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await page.getByRole('navigation').getByRole('link', { name: /個人介紹/ }).click();
  await expect(page.locator('#about')).toBeInViewport();
});

test('without JavaScript or web fonts native chapter navigation and details remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(siteURL);
    await expect(page.locator('.chapter')).toHaveCount(4);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/SHI-TONG\s*CHANG/);
    await page.getByRole('navigation').getByRole('link', { name: /專案經歷/ }).click();
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
    const archive = page.locator('details#project-archive');
    await expect(archive).not.toHaveAttribute('open');
    await archive.locator(':scope > summary').click();
    await expect(archive).toHaveAttribute('open');
    await expect(archive.locator('[data-project-panel]')).toHaveCount(10);
    await expect(archive.locator('[data-project-panel][inert]')).toHaveCount(0);
    await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
    await expect(page.locator('#contact')).toBeInViewport();
  } finally {
    await context.close();
  }
});
