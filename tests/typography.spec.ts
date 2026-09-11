import { test, expect, type Page } from '@playwright/test';
import { observeStartupScrollSettled } from './helpers/navigation';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterIds = ['about', 'projects', 'skills', 'timeline', 'contact'];
const removedWrappers = '.work-footnote, .visual-caption, .skills-note, .timeline-note, .contact-signature, .thought-orbit > span, .guide-art figcaption';
const removedPhrases = [
  '作品持續累積中，其餘位置留給下一次探索。',
  'DESIGN MEETS DEVELOPMENT',
  'A STAR YET TO BE NAMED',
  '這裡先放探索方向，具體技能與經歷會隨作品逐步補上。',
  'EVERY STEP, A NEW COORDINATE.',
  '以下為內容預留，日期與經歷將陸續補上。',
  'STAY CURIOUS. KEEP CREATING.',
  'CURIOUS BY NATURE.',
  'OPEN CHANNEL / 05',
  '我們下個章節見。',
];

async function expectRemovedCaptions(page: Page) {
  // Require removal, not merely empty text, display:none or reduced opacity.
  await expect(page.locator(removedWrappers)).toHaveCount(0);
  await expect(page.locator('.timeline-orbit > span')).toHaveCount(0);
  for (const phrase of removedPhrases) await expect(page.locator('body')).not.toContainText(phrase);
  // Keep useful controls, image coordinates and the original orbit illustration.
  await expect(page.locator('[data-project-current]')).toHaveCount(1);
  await expect(page.locator('.library-total')).toHaveText('/ 10');
  await expect(page.locator('[data-project-tab]')).toHaveCount(10);
  await expect(page.locator('.project-canvas .canvas-coordinate')).toHaveCount(20);
  await expect(page.locator('.timeline-orbit > svg')).toHaveCount(1);
  await expect(page.locator('.thought-orbit > svg')).toHaveCount(1);
  await expect(page.locator('.guide-art > .guide-window')).toHaveCount(1);
  await expect(page.locator('.guide-window > svg.signal-chart')).toHaveCount(1);
  await expect(page.locator('.guide-window > .signal-label')).toHaveText('A SIGNAL, A POSSIBILITY.');
  await expect(page.locator('.timeline-date')).toHaveText(['日期待填', '日期待填', '日期待填', '日期待填']);
}

async function expectReadableTypeScale(page: Page) {
  const rules = [
    { selector: '.hero-introduction', minimum: 16 },
    { selector: '.biography', minimum: 16, optional: true },
    { selector: '.project-description', minimum: 16 },
    { selector: '.section-subtitle', minimum: 16 },
    { selector: '.skill-description', minimum: 16 },
    { selector: '.timeline-introduction', minimum: 16 },
    { selector: '.timeline-description', minimum: 16 },
    { selector: '.contact-introduction', minimum: 16 },
    { selector: 'main .primary-button, main .text-link', minimum: 14 },
    { selector: '.skill-card h3', minimum: 22 },
    // Short desktop layouts may use 20px while retaining the larger body copy.
    { selector: '.timeline-event-title', minimum: 20 },
  ];
  const samples = await page.evaluate(rules => rules.map(rule => ({
    ...rule,
    sizes: [...document.querySelectorAll(rule.selector)].map(element => ({
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      label: element.textContent?.trim().slice(0, 50),
    })),
  })), rules);
  for (const sample of samples) {
    if (!sample.optional) expect(sample.sizes.length, `${sample.selector} must remain present`).toBeGreaterThan(0);
    for (const size of sample.sizes) {
      expect(size.fontSize, `${sample.selector}: ${size.label}`).toBeGreaterThanOrEqual(sample.minimum);
    }
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Larger typography must not widen the document beyond the viewport.').toBe(true);
}

async function visitChapter(page: Page, id: string) {
  await page.locator(`.top-nav a[href="#${id}"]`).click();
  await observeStartupScrollSettled(page);
  if (await page.locator('body').evaluate(element => element.classList.contains('is-paged'))) {
    await expect.poll(() => page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top)))
      .toBeLessThanOrEqual(2);
  }
  await expect(page.locator(`#${id}-heading`)).toBeInViewport();
  await expect.poll(() => page.locator(`#${id}-heading`).evaluate(element => {
    for (let node: Element | null = element; node && !node.matches('.chapter'); node = node.parentElement) {
      const style = getComputedStyle(node);
      if (Number(style.opacity) < .99 || style.visibility === 'hidden') return false;
    }
    return true;
  })).toBe(true);
  await expectNoHorizontalOverflow(page);
}

test('requested decorative captions are removed without empty wrappers or losing project controls', async ({ page }) => {
  await page.goto('./#projects');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await observeStartupScrollSettled(page);
  await expectRemovedCaptions(page);
  await expect(page.locator('[data-project-current]')).toHaveText('01');
  await page.locator('#project-tab-personal-web').click();
  await expect(page.locator('[data-project-current]')).toHaveText('02');
  await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'project-panel-personal-web');
  await expect(page.getByRole('tabpanel').getByRole('link', { name: /查看 GitHub 專案/ }))
    .toHaveAttribute('href', 'https://github.com/shi-tong-chang/PersonalWeb');
  await expect(page.locator('.visual-caption')).toHaveCount(0);
  // A click may cancel an entrance; the interactive footer must not move then.
  await expect(page.locator('.site-footer')).toHaveAttribute('data-reveal', 'fade');
});

test('larger main typography stays readable across desktop and narrow phones with reachable footer actions', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ]) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await observeStartupScrollSettled(page);
      await expectReadableTypeScale(page);
      for (const id of chapterIds) {
        await visitChapter(page, id);
        if (id === 'about' || id === 'skills') {
          const screenshot = testInfo.outputPath(`typography-${id}-${viewport.width}.png`);
          await page.screenshot({ path: screenshot, animations: 'disabled' });
          await testInfo.attach(`Typography ${id} ${viewport.width}px`, { path: screenshot, contentType: 'image/png' });
        }
      }
      const contactAction = page.locator('#contact .primary-button');
      await contactAction.scrollIntoViewIfNeeded();
      await expect(contactAction).toBeInViewport();
      // Trial clicks verify hit targets without following an external GitHub link.
      await contactAction.click({ trial: true });
      const backTop = page.locator('.site-footer .back-top');
      await backTop.scrollIntoViewIfNeeded();
      await expect(backTop).toBeInViewport();
      await backTop.click({ trial: true });
      await expectNoHorizontalOverflow(page);
      await backTop.click();
      await observeStartupScrollSettled(page);
      await expect(page).toHaveURL(/#about$/);
      await expect(page.locator('#about-heading')).toBeInViewport();
    });
  }
  expect(errors).toEqual([]);
});

test('larger copy and caption removal survive missing fonts, reduced motion and disabled JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 320, height: 640 } });
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto(siteURL);
    await expectRemovedCaptions(page);
    await expectReadableTypeScale(page);
    await expect(page.locator('[data-project-panel]')).toHaveCount(10);
    await expect(page.locator('[data-project-panel][inert]')).toHaveCount(0);
    for (const id of chapterIds) {
      await page.locator(`.top-nav a[href="#${id}"]`).click();
      // No page-side timers: native anchor scrolling is observed by the runner.
      await expect(page.locator(`#${id}-heading`)).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    }
    const contactAction = page.locator('#contact .primary-button');
    await contactAction.scrollIntoViewIfNeeded();
    await contactAction.click({ trial: true });
    const backTop = page.locator('.site-footer .back-top');
    await backTop.scrollIntoViewIfNeeded();
    await expect(backTop).toBeInViewport();
    await backTop.click();
    await expect(page).toHaveURL(/#about$/);
    await expect(page.locator('#about-heading')).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    const screenshot = testInfo.outputPath('typography-no-js-no-fonts-320.png');
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    await testInfo.attach('Typography without JavaScript or web fonts at 320px', { path: screenshot, contentType: 'image/png' });
  } finally {
    await context.close();
  }
});
