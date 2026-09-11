import { test, expect, type Locator, type Page } from '@playwright/test';
import { observeStartupScrollSettled } from './helpers/navigation';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';

async function openProjects(page: Page) {
  await page.goto(`${siteURL}#projects`);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('div#project-archive.project-atlas')).toBeVisible();
  await expect(page.locator('#projects details, #projects summary, [data-project-open]')).toHaveCount(0);
  await expect(page.locator('[data-project-gallery]')).toHaveClass(/is-enhanced/);
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  // DOM visibility does not mean the browser's initial fragment navigation
  // has finished. Establish its final position before keyboard/wheel baselines.
  await observeStartupScrollSettled(page);
  if (await page.locator('body').evaluate(body => body.classList.contains('is-paged'))) {
    await expect.poll(() => page.locator('#projects').evaluate(section => Math.abs(section.getBoundingClientRect().top)),
      { message: 'Initial desktop navigation must finish at the projects chapter before interacting.' }).toBeLessThanOrEqual(2);
  }
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

async function expectFocusedTabBetweenHeaderAndDock(tab: Locator) {
  await expect.poll(() => tab.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const dock = document.querySelector('.chapter-dock')!.getBoundingClientRect();
    return bounds.height > 0 && bounds.top >= header.bottom && bounds.bottom <= dock.top;
  }), { message: 'The selected control must not be obscured by the header or fixed chapter dock.' }).toBe(true);
}

test('the expanded project stage removes its old slogan while preserving its chapter name and ten slots', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
  ]) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await openProjects(page);
      const section = page.locator('#projects');
      const gallery = section.locator('[data-project-gallery]');
      const heading = section.locator('h2#projects-heading');
      const panel = gallery.getByRole('tabpanel');
      const story = panel.locator('.project-story');
      const visual = panel.locator('.project-visual');
      const image = visual.locator('.project-canvas > img');
      await expect(section).not.toContainText(/讓想像\s*[，,]?\s*成為作品[。.]?/);
      await expect(heading).toHaveAccessibleName(/專案經歷/);
      await expect(heading).toContainText('02 / PROJECT ATLAS');
      await expect(section).toHaveAccessibleName(/專案經歷/);
      await expect(gallery).toHaveAccessibleName(/專案經歷/);
      await expect(gallery.getByRole('tab')).toHaveCount(10);
      await expect(gallery.locator('[data-project-panel]')).toHaveCount(10);
      await expect(panel).toHaveCount(1);
      await image.evaluate(element => (element as HTMLImageElement).decode());
      for (const surface of [heading, story, visual]) {
        await expect(surface).toBeVisible();
        await expect.poll(() => surface.evaluate(element => {
          for (let node: Element | null = element; node && !node.matches('.chapter'); node = node.parentElement) {
            if (Number(getComputedStyle(node).opacity) < .99) return false;
          }
          return true;
        })).toBe(true);
      }
      if (viewport.width >= 900) {
        await expect(page.locator('body')).toHaveClass(/is-paged/);
        for (const surface of [heading, story, visual, gallery.locator('[data-project-track]')]) {
          await expectFocusedTabBetweenHeaderAndDock(surface);
        }
        await expect.poll(() => panel.evaluate(element => {
          const story = element.querySelector('.project-story')!.getBoundingClientRect();
          const visual = element.querySelector('.project-visual')!.getBoundingClientRect();
          return story.right < visual.left && Math.min(story.bottom, visual.bottom) > Math.max(story.top, visual.top);
        }), { message: 'Project text must remain to the left of the artwork on desktop.' }).toBe(true);
      }
      if (viewport.width === 1440) {
        const [artBounds, storyBounds, headerBounds] = await Promise.all([
          image.boundingBox(), story.boundingBox(), page.locator('.site-header').boundingBox(),
        ]);
        // Guard the requested larger, higher composition without fixing exact
        // font metrics: the previous artwork was 742 × 360 and copy began at y262.
        expect(artBounds!.width).toBeGreaterThanOrEqual(780);
        expect(artBounds!.height).toBeGreaterThanOrEqual(400);
        expect(storyBounds!.y).toBeLessThanOrEqual(headerBounds!.y + headerBounds!.height + 80);
        expect(await panel.locator('.project-name').evaluate(element => parseFloat(getComputedStyle(element).fontSize)))
          .toBeGreaterThanOrEqual(60);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.width === 1440 || viewport.width === 390) {
        const screenshotPath = test.info().outputPath(`expanded-projects-${viewport.width}.png`);
        await section.screenshot({ path: screenshotPath, animations: 'disabled' });
        await test.info().attach(`Expanded project stage at ${viewport.width}px`, {
          path: screenshotPath,
          contentType: 'image/png',
        });
      }
    });
  }
});

test('project actions stay at the lower left above the library through selection and growing content', async ({ page }) => {
  const gallery = page.locator('[data-project-gallery]');
  const panel = gallery.getByRole('tabpanel');
  const metrics = () => gallery.evaluate(element => {
    const panel = element.querySelector('[data-project-panel][aria-hidden="false"]')!;
    const stage = element.querySelector('.project-stage')!.getBoundingClientRect();
    const story = panel.querySelector('.project-story')!.getBoundingClientRect();
    const actions = panel.querySelector('.project-actions')!.getBoundingClientRect();
    const visual = panel.querySelector('.project-visual')!.getBoundingClientRect();
    const caption = element.querySelector('.library-caption')!.getBoundingClientRect();
    const contentBottom = Math.max(...Array.from(panel.querySelectorAll('.project-description, .project-role, .tags'))
      .map(content => content.getBoundingClientRect().bottom));
    return {
      leftDelta: actions.left - caption.left,
      captionGap: caption.top - actions.bottom,
      contentGap: actions.top - contentBottom,
      storyLeftDelta: actions.left - story.left,
      stageBottomGap: stage.bottom - actions.bottom,
      visualBottomDelta: actions.bottom - visual.bottom,
      actionBottomFromStage: actions.bottom - stage.top,
      captionTopFromStage: caption.top - stage.top,
      stageHeight: stage.height,
    };
  });
  async function expectLowerLeftAction(desktop: boolean, extended = false) {
    await expect(panel.locator('.project-actions')).toBeVisible();
    await expect.poll(async () => {
      const layout = await metrics();
      return Math.abs(layout.leftDelta) <= 1 && Math.abs(layout.storyLeftDelta) <= 1
        && layout.captionGap >= 8 && layout.captionGap <= 64 && layout.contentGap >= -1
        && layout.stageBottomGap >= -1 && layout.stageBottomGap <= 16
        && (!desktop || extended || Math.abs(layout.visualBottomDelta) <= 16);
    }, { message: 'The project action must sit at the left edge above the library without covering its copy.' }).toBe(true);
  }
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      // The previous step changes the fragment and injects long copy. Ensure
      // goto is a document load, not same-document navigation retaining it.
      await page.goto('about:blank');
      await page.setViewportSize(viewport);
      await openProjects(page);
      const desktop = viewport.width >= 900;
      const githubAction = panel.getByRole('link', { name: /查看 GitHub 專案/ });
      await expect(githubAction).toHaveAttribute('href', 'https://github.com/shi-tong-chang/PersonalWeb');
      await expectLowerLeftAction(desktop);
      const baseline = await metrics();
      const originalChapterHeight = await page.locator('#projects').evaluate(element => element.getBoundingClientRect().height);

      for (const [tabIndex, id] of [[1, 'project-02'], [0, 'personal-web']] as const) {
        await gallery.getByRole('tab').nth(tabIndex).click();
        await expect(panel).toHaveAttribute('id', `project-panel-${id}`);
        await expect(page).toHaveURL(new RegExp(`#project-panel-${id}$`));
        await expectLowerLeftAction(desktop);
        await expect.poll(async () => {
          const layout = await metrics();
          return Math.abs(layout.actionBottomFromStage - baseline.actionBottomFromStage) <= 2
            && Math.abs(layout.captionTopFromStage - baseline.captionTopFromStage) <= 2;
        }, { message: 'Switching projects must retain the shared action and library positions.' }).toBe(true);
        if (id === 'project-02') {
          await expect(panel.getByRole('link')).toHaveCount(0);
          await expect(panel.locator('.project-waiting')).toBeVisible();
        } else {
          await expect(githubAction).toHaveAttribute('href', 'https://github.com/shi-tong-chang/PersonalWeb');
        }
      }

      // New copy is test-only. The footer must move with intrinsic content,
      // never cover it or become fixed to the original short stage height.
      await panel.locator('.project-description').evaluate(element => {
        element.append(document.createTextNode('補充專案背景、實作取捨與成果，長篇內容也必須能自然展開閱讀。'.repeat(70)));
      });
      await expect.poll(() => page.locator('#projects').evaluate(element => element.getBoundingClientRect().height))
        .toBeGreaterThan(originalChapterHeight + 200);
      await expect.poll(async () => (await metrics()).stageHeight).toBeGreaterThan(baseline.stageHeight + 200);
      await expectLowerLeftAction(desktop, true);
      expect(await panel.locator('.project-description').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      await githubAction.scrollIntoViewIfNeeded();
      await expect(githubAction).toBeInViewport();
      await expectFocusedTabBetweenHeaderAndDock(githubAction);
      await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});

test('ten project slots expose one accessible panel and clearly mark nine reservations', async ({ page }) => {
  await openProjects(page);
  const gallery = page.locator('[data-project-gallery]');
  const tabs = gallery.getByRole('tab');
  await expect(gallery).toHaveAttribute('aria-labelledby', 'projects-heading');
  await expect(gallery.getByRole('heading', { level: 3 })).toHaveClass('project-name');
  await expect(tabs).toHaveCount(10);
  await expect(gallery.locator('[data-project-panel]')).toHaveCount(10);
  await expect(gallery.locator('.project-state.is-reserved')).toHaveCount(9);
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/PersonalWeb/);
  await expect(gallery.getByRole('tabpanel').locator('.project-canvas > img'))
    .toHaveAttribute('src', '/PersonalWeb/assets/orbital-atlas-v1.svg');
  await expect(gallery.getByRole('tabpanel').getByRole('link', { name: /查看 GitHub 專案/ }))
    .toHaveAttribute('href', 'https://github.com/shi-tong-chang/PersonalWeb');

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
  await expect(gallery.getByRole('tabpanel')).toHaveAccessibleName(/專案 02.*預留席位/);
  await expect(gallery.getByRole('tabpanel').getByRole('link')).toHaveCount(0);
  await expect(gallery.getByRole('status')).toContainText('第 2 件，共 10 件');
  await expect(page).toHaveURL(/#project-panel-project-02$/);
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
  await expect(page).toHaveURL(/#project-panel-project-10$/);
  expect(errors).toEqual([]);
});

test('project panel deep links survive reload and later hash changes', async ({ page }) => {
  await page.goto(`${siteURL}#project-panel-project-10`);
  const gallery = page.locator('[data-project-gallery]');
  const archive = page.locator('div#project-archive');
  await expect(gallery).toHaveClass(/is-enhanced/);

  async function expectLinkedProject(id: string) {
    await expect(archive).toBeVisible();
    const tab = page.locator(`#project-tab-${id}`);
    const panel = page.locator(`#project-panel-${id}`);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expectTabInsideTrack(tab);
    await expect(gallery.getByRole('tabpanel')).toHaveCount(1);
    await expect(gallery.getByRole('tabpanel')).toHaveAttribute('id', `project-panel-${id}`);
    await expect(panel).not.toHaveAttribute('inert');
    await expect(panel.locator('h3.project-name')).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`#project-panel-${id}$`));
  }

  await expectLinkedProject('project-10');
  await page.reload();
  await expectLinkedProject('project-10');
  await page.evaluate(() => { location.hash = '#project-panel-project-02'; });
  await expectLinkedProject('project-02');
  const historyLength = await page.evaluate(() => history.length);
  await page.locator('#project-tab-project-02').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#project-tab-project-03')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#project-panel-project-03$/);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.reload();
  await expectLinkedProject('project-03');
});

test('project Home and End keys reveal their tabs without navigating chapters', async ({ page }) => {
  await openProjects(page);
  const tabs = page.locator('[data-project-gallery]').getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.last());
  await expectFocusedTabBetweenHeaderAndDock(tabs.last());
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#project-panel-project-10$/);

  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expectTabInsideTrack(tabs.first());
  await expectFocusedTabBetweenHeaderAndDock(tabs.first());
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page).toHaveURL(/#project-panel-personal-web$/);
});

test('edge hover stops on leave or chapter navigation, respects boundaries, and resets safely on return', async ({ page }) => {
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  const left = page.getByRole('button', { name: '向左瀏覽專案' });
  const right = page.getByRole('button', { name: '向右瀏覽專案' });
  await expect(left).toHaveAttribute('aria-disabled', 'true');
  await expect(right).toHaveAttribute('aria-disabled', 'false');
  const start = await scrollLeft(track);
  await right.hover();
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(start + 60);
  await page.locator('#projects-heading').hover();
  await page.waitForTimeout(100);
  const stopped = await scrollLeft(track);
  await page.waitForTimeout(350);
  expect(Math.abs(await scrollLeft(track) - stopped)).toBeLessThanOrEqual(2);

  for (let attempt = 0; attempt < 5 && await right.getAttribute('aria-disabled') !== 'true'; attempt++) {
    await right.click();
    await page.locator('#projects-heading').hover();
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
    await page.locator('#projects-heading').hover();
    await page.waitForTimeout(600);
  }
  await expect(left).toHaveAttribute('aria-disabled', 'true');
  await expect(right).toHaveAttribute('aria-disabled', 'false');
  expect(await scrollLeft(track)).toBeLessThanOrEqual(2);

  await right.hover();
  await expect.poll(() => scrollLeft(track)).toBeGreaterThan(60);
  // Trigger navigation without moving the pointer first: chapter departure,
  // rather than pointerleave, must cancel the active hover animation.
  await page.locator('.top-nav a[href="#contact"]').evaluate(link => (link as HTMLAnchorElement).click());
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'contact');
  const awayPosition = await scrollLeft(track);
  await page.waitForTimeout(400);
  expect(Math.abs(await scrollLeft(track) - awayPosition)).toBeLessThanOrEqual(2);
  await page.mouse.move(700, 400);
  await page.locator('.top-nav a[href="#projects"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  const selectedTab = page.locator('[data-project-tab][aria-selected="true"]');
  await expect(selectedTab).toHaveAttribute('id', 'project-tab-personal-web');
  await expectTabInsideTrack(selectedTab);
  const returnedPosition = await scrollLeft(track);
  await page.waitForTimeout(500);
  expect(Math.abs(await scrollLeft(track) - returnedPosition)).toBeLessThanOrEqual(2);
});

test('horizontal and shift wheel stay within the rail while vertical wheel reads long project content', async ({ page }) => {
  await openProjects(page);
  const track = page.locator('[data-project-track]');
  // A realistic future long description must extend the chapter naturally.
  await page.getByRole('tabpanel').locator('.project-description').evaluate(element => {
    element.append(document.createTextNode('補上專案背景、設計選擇與實作心得，所有內容都應能自然閱讀。'.repeat(90)));
  });
  await expect.poll(() => page.locator('#projects').evaluate(section => section.getBoundingClientRect().height - innerHeight))
    .toBeGreaterThan(200);
  await page.locator('#projects').evaluate(section => {
    const bounds = section.getBoundingClientRect();
    window.scrollTo({ top: bounds.top + scrollY + bounds.height - innerHeight, behavior: 'instant' });
  });
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

  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(pageStart - 100);
  await page.waitForTimeout(300);
  expect(pageStart - await page.evaluate(() => scrollY)).toBeLessThan(350);
  await expect(page.locator('#projects')).toBeInViewport();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
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
    await expectFocusedTabBetweenHeaderAndDock(lastTab);
    await lastTab.tap();
    await expect(lastTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toHaveAccessibleName(/專案 10/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /與我聯繫/ }).tap();
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
  await expectFocusedTabBetweenHeaderAndDock(tabs.last());
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
    const gallery = page.locator('[data-project-gallery]');
    await expect(gallery).not.toHaveClass(/is-enhanced/);
    await expect(page.locator('#projects details, #projects summary')).toHaveCount(0);
    const panels = gallery.getByRole('article');
    await expect(panels).toHaveCount(10);
    await expect(gallery.locator('[data-project-panel][inert]')).toHaveCount(0);
    for (const panel of await panels.all()) {
      await expect(panel).toBeVisible();
      await panel.locator('h3.project-name').scrollIntoViewIfNeeded();
      await expect(panel.locator('h3.project-name')).toBeInViewport();
    }
    await expect(panels.last()).toHaveAccessibleName('專案 10');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('navigation', { name: '章節導覽' }).getByRole('link', { name: /與我聯繫/ }).click();
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
