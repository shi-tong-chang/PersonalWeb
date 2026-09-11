import { test, expect, type Locator, type Page } from '@playwright/test';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterIds = ['about', 'projects', 'skills', 'timeline', 'contact'];
const portraitFixture = '/PersonalWeb/assets/orbital-atlas-v1.svg';

async function fontsSettled(page: Page) {
  await expect.poll(() => page.evaluate(() => document.fonts.status),
    { message: 'Font loading must finish within the bounded assertion timeout.' }).toBe('loaded');
}

async function chapterAtTop(page: Page, id: string) {
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top)))
    .toBeLessThanOrEqual(2);
  await expect(page.locator('body')).toHaveAttribute('data-theme', id);
}

async function betweenHeaderAndDock(element: Locator) {
  await expect.poll(() => element.evaluate(target => {
    const bounds = target.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
    return bounds.height > 0 && bounds.top >= header.bottom && bounds.bottom <= dock.top
      && bounds.left >= 0 && bounds.right <= innerWidth;
  })).toBe(true);
}

async function injectPortrait(page: Page, source: string) {
  // Model the HTML emitted when the optional profile photo is filled in,
  // before normal bootstrap. The local artwork is only a loading-test fixture.
  await page.route('**/PersonalWeb/', async route => {
    const response = await route.fetch();
    const html = await response.text();
    const marker = '<span class="portrait-corner corner-top"';
    expect(html).toContain(marker);
    expect(html).toContain('data-portrait-state="empty"');
    const photo = `<img data-portrait-image src="${source}" alt="個人照片載入測試" width="640" height="800" style="object-position:70% 40%">`;
    await route.fulfill({ response, body: html
      .replace('data-portrait-state="empty"', 'data-portrait-state="loading"')
      .replace('aria-label="個人照片預留區"', 'aria-label="個人照片預留區" aria-hidden="true"')
      .replace(marker, photo + marker) });
  });
}

async function runningAmbient(chapter: Locator) {
  return chapter.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => (
    animation.effect?.getComputedTiming().iterations === Infinity && animation.playState === 'running'
  )).length);
}

async function revealContentIsReadable(page: Page) {
  const targets = page.locator('[data-reveal]');
  expect(await targets.count()).toBeGreaterThan(0);
  await expect.poll(() => targets.evaluateAll(elements => elements.every(element => {
    const style = getComputedStyle(element);
    return style.opacity === '1' && style.visibility === 'visible'
      && style.display !== 'none' && element.getBoundingClientRect().height > 0;
  }))).toBe(true);
}

test('the empty portrait reserves a responsive four-by-five frame without a broken image', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 700 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await fontsSettled(page);
    const portrait = page.locator('[data-portrait]');
    await expect(portrait).toHaveAttribute('data-portrait-state', 'empty');
    await expect(portrait.locator('[data-portrait-image]')).toHaveCount(0);
    await expect(portrait.getByRole('img', { name: '個人照片預留區' })).toBeVisible();
    await expect.poll(() => portrait.locator('.portrait-window').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width / bounds.height;
    })).toBeCloseTo(4 / 5, 2);
    if (viewport.width >= 900) {
      await betweenHeaderAndDock(portrait);
      await expect.poll(() => portrait.evaluate(element => (
        element.getBoundingClientRect().left >= document.querySelector('.hero-copy')!.getBoundingClientRect().right
      ))).toBe(true);
    } else {
      await portrait.scrollIntoViewIfNeeded();
      await expect(portrait).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('a supplied portrait loads with its alt and crop settings, including a cached reload', async ({ page }) => {
  await injectPortrait(page, portraitFixture);
  await page.goto('./');
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    const portrait = page.locator('[data-portrait]');
    const photo = portrait.locator('[data-portrait-image]');
    await expect(portrait).toHaveAttribute('data-portrait-state', 'ready');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('alt', '個人照片載入測試');
    await expect(photo).toHaveCSS('object-fit', 'cover');
    await expect(photo).toHaveCSS('object-position', '70% 40%');
    await expect.poll(() => photo.evaluate(element => {
      const image = element as HTMLImageElement;
      return image.complete && image.naturalWidth > 0;
    })).toBe(true);
    await expect(portrait.locator('.portrait-placeholder')).toHaveAttribute('aria-hidden', 'true');
    await expect(portrait.locator('.portrait-placeholder')).toBeHidden();
  }
});

test('a failed portrait request restores the accessible placeholder instead of a broken image', async ({ page }) => {
  const missing = '/PersonalWeb/assets/portrait-missing-test.webp';
  await page.route(`**${missing}`, route => route.fulfill({ status: 404, body: '' }));
  await injectPortrait(page, missing);
  await page.goto('./');
  const portrait = page.locator('[data-portrait]');
  await expect(portrait).toHaveAttribute('data-portrait-state', 'error');
  await expect(portrait.locator('[data-portrait-image]')).toBeHidden();
  await expect(portrait.getByRole('img', { name: '個人照片預留區' })).toBeVisible();
  await expect(portrait.locator('.portrait-placeholder')).not.toHaveAttribute('aria-hidden', 'true');
});

test('the fourth chapter is an ordered timeline with honest undated placeholders and full keyboard navigation', async ({ page }) => {
  await page.goto('./#skills');
  await fontsSettled(page);
  await chapterAtTop(page, 'skills');
  expect(await page.locator('.chapter').evaluateAll(elements => elements.map(element => element.id))).toEqual(chapterIds);
  await page.keyboard.press('PageDown');
  await chapterAtTop(page, 'timeline');
  await expect(page.locator('#timeline')).toBeFocused();
  await expect(page.locator('#current-chapter')).toHaveText('04');
  await expect(page.locator('#next-chapter')).toHaveAttribute('href', '#contact');
  const list = page.locator('ol.timeline-events');
  await expect(list).toHaveAccessibleName('大事記，依顯示順序排列');
  const events = list.getByRole('listitem');
  await expect(events).toHaveCount(4);
  await expect(events.locator('h3.timeline-event-title')).toHaveText(['事件待填 01', '事件待填 02', '事件待填 03', '事件待填 04']);
  await expect(events.locator('.timeline-date')).toHaveText(['日期待填', '日期待填', '日期待填', '日期待填']);
  // Unknown dates must not be represented by invented machine-readable dates.
  await expect(events.locator('time[datetime]')).toHaveCount(0);
  await expect(page.locator('.timeline-note')).toContainText('內容預留');
  for (const event of await events.all()) await betweenHeaderAndDock(event);
  await page.keyboard.press('PageDown');
  await chapterAtTop(page, 'contact');
  await expect(page.locator('#current-chapter')).toHaveText('05');
  await page.keyboard.press('PageUp');
  await chapterAtTop(page, 'timeline');
  await page.reload();
  await chapterAtTop(page, 'timeline');
  await expect(page).toHaveURL(/#timeline$/);
});

test('long timeline descriptions and additional milestones remain readable before a fresh boundary gesture leaves', async ({ page }) => {
  await page.goto('./#timeline');
  await fontsSettled(page);
  await chapterAtTop(page, 'timeline');
  const timeline = page.locator('#timeline');
  await timeline.evaluate(section => {
    section.querySelector('.timeline-description')!.append(document.createTextNode('補上事件背景、學習過程與改變，長篇經歷也必須完整保留。'.repeat(80)));
    const list = section.querySelector('.timeline-events')!;
    for (let index = 5; index <= 8; index++) {
      const event = list.lastElementChild!.cloneNode(true) as HTMLElement;
      event.id = `test-milestone-${index}`;
      event.querySelector('.timeline-event-title')!.textContent = `測試用追加事件 ${index}`;
      list.append(event);
    }
    list.lastElementChild!.querySelector('.timeline-description')!.setAttribute('data-testid', 'timeline-last-line');
    (section as HTMLElement).focus({ preventScroll: true });
  });
  await expect(timeline.locator('.timeline-event')).toHaveCount(8);
  await expect.poll(() => timeline.evaluate(element => element.getBoundingClientRect().height - innerHeight)).toBeGreaterThan(400);
  const start = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
  const afterPage = await page.evaluate(() => scrollY);
  expect(afterPage - start).toBeLessThanOrEqual(900);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(afterPage);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'timeline');
  const lastLine = page.getByTestId('timeline-last-line');
  await lastLine.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await betweenHeaderAndDock(lastLine);

  const end = await timeline.evaluate(section => {
    const bounds = section.getBoundingClientRect();
    const end = bounds.top + scrollY + bounds.height - innerHeight;
    window.scrollTo({ top: end - 100, behavior: 'instant' });
    return end;
  });
  await page.waitForTimeout(250);
  await page.mouse.move(24, 450);
  await page.mouse.wheel(0, 800);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(end, 0);
  await page.waitForTimeout(850);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'timeline');
  expect(Math.abs(await page.evaluate(() => scrollY) - end)).toBeLessThanOrEqual(2);
  await page.mouse.wheel(0, 180);
  await chapterAtTop(page, 'contact');
  await expect(page.locator('#current-chapter')).toHaveText('05');
});

test('chapter reveals actually run without changing document layout or leaving hidden copy', async ({ page }) => {
  await page.goto('./');
  await fontsSettled(page);
  const targets = page.locator('#timeline [data-reveal]');
  const layout = () => targets.evaluateAll(elements => elements.map(element => {
    const target = element as HTMLElement;
    return [target.offsetTop, target.offsetLeft, target.offsetWidth, target.offsetHeight];
  }));
  const before = await layout();
  expect(before.length).toBeGreaterThan(0);
  await page.locator('.top-nav a[href="#timeline"]').click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'chapter-reveal' && animation.playState === 'running').length))
    .toBeGreaterThan(0);
  expect(await layout()).toEqual(before);
  await chapterAtTop(page, 'timeline');
  await expect.poll(() => targets.evaluateAll(elements => elements.every(element => element.getAttribute('data-reveal-state') === 'visible'))).toBe(true);
  expect(await layout()).toEqual(before);
  await revealContentIsReadable(page);
});

test('ambient motion stops offscreen or suspended and resumes only in the visible chapter', async ({ page }) => {
  await page.goto('./#timeline');
  await chapterAtTop(page, 'timeline');
  const timeline = page.locator('#timeline');
  await expect(timeline).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(() => runningAmbient(timeline)).toBeGreaterThan(0);
  await page.locator('.top-nav a[href="#about"]').click();
  await chapterAtTop(page, 'about');
  await expect(timeline).toHaveAttribute('data-motion-active', 'false');
  await expect.poll(() => runningAmbient(timeline)).toBe(0);
  const about = page.locator('#about');
  await expect(about).toHaveAttribute('data-motion-active', 'true');
  expect(await page.evaluate(() => Object.hasOwn(document, 'hidden'))).toBe(false);
  try {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.chapter[data-motion-active="true"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'chapter-reveal').length)).toBe(0);
    await expect.poll(() => runningAmbient(about)).toBe(0);
    await revealContentIsReadable(page);
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await expect(about).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(() => runningAmbient(about)).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('.chapter[data-motion-active="true"]')).toHaveCount(0);
  await expect.poll(() => runningAmbient(about)).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(about).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(() => runningAmbient(about)).toBeGreaterThan(0);
});

test('toggling reduced motion cancels reveals, keeps all copy readable and restores ambient without replay', async ({ page }) => {
  await page.goto('./');
  await page.locator('.top-nav a[href="#timeline"]').click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'chapter-reveal' && animation.playState === 'running').length))
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('.chapter[data-motion-active="true"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'chapter-reveal').length)).toBe(0);
  await revealContentIsReadable(page);
  await expect.poll(() => runningAmbient(page.locator('#timeline'))).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await chapterAtTop(page, 'timeline');
  await expect(page.locator('#timeline')).toHaveAttribute('data-motion-active', 'true');
  await expect.poll(() => runningAmbient(page.locator('#timeline'))).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'chapter-reveal').length)).toBe(0);
  await revealContentIsReadable(page);
});

test('without JavaScript every chapter and timeline event stays readable and supplied portraits still display', async ({ browser }) => {
  for (const supplied of [false, true]) {
    const label = supplied ? 'supplied portrait' : 'empty portrait';
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const page = await context.newPage();
    let failure: unknown;
    try {
      if (supplied) await injectPortrait(page, portraitFixture);
      await test.step(`${label}: load the document`, () => page.goto(siteURL, { timeout: 5000 }), { timeout: 6000 });
      await test.step(`${label}: inspect progressive content`, async () => {
        await expect(page.locator('.chapter')).toHaveCount(5);
        await expect(page.locator('.chapter[data-motion-active]')).toHaveCount(0);
        await revealContentIsReadable(page);
      }, { timeout: 6000 });
      await test.step(`${label}: inspect the portrait`, async () => {
        if (supplied) {
          const photo = page.locator('[data-portrait-image]');
          await photo.scrollIntoViewIfNeeded({ timeout: 4000 });
          await expect(photo).toBeVisible();
          await expect(photo).toHaveCSS('opacity', '1');
          await expect.poll(() => photo.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        } else await expect(page.getByRole('img', { name: '個人照片預留區' })).toBeVisible();
      }, { timeout: 6000 });
      for (const id of chapterIds) {
        await test.step(`${label}: navigate to ${id}`, async () => {
          await page.locator(`.top-nav a[href="#${id}"]`).click({ timeout: 4000 });
          await expect(page.locator(`#${id}`)).toBeInViewport();
          // A large chapter can enter the viewport while native fragment
          // scrolling is still moving. Finish that navigation before the next
          // actionability check; this observes CSS offsets without changing them.
          const destination = await page.locator(`#${id}`).evaluate(section => {
            const top = section.getBoundingClientRect().top + scrollY;
            const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
            const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
            return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, top - padding - margin));
          });
          await expect.poll(() => page.evaluate(target => Math.abs(scrollY - target), destination)).toBeLessThanOrEqual(1);
        }, { timeout: 6000 });
      }
      for (const [index, title] of (await page.locator('.timeline-event-title').all()).entries()) {
        await test.step(`${label}: read timeline event ${index + 1}`, async () => {
          await title.scrollIntoViewIfNeeded({ timeout: 4000 });
          await expect(title).toBeInViewport();
        }, { timeout: 6000 });
      }
      await expect(page.locator('.timeline-event')).toHaveCount(4);
      await expect.poll(() => runningAmbient(page.locator('#timeline'))).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      // Preserve the failed step if closing an already-failed context also errors.
      await context.close().catch(error => { if (failure === undefined) throw error; });
    }
  }
});
