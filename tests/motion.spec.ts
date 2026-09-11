import { test, expect, type Locator, type Page } from '@playwright/test';

const siteURL = 'http://127.0.0.1:4321/PersonalWeb/';
const chapterIds = ['about', 'projects', 'skills', 'timeline', 'contact'];
const portraitFixture = '/PersonalWeb/assets/orbital-atlas-v1.svg';
const defaultPortrait = '/PersonalWeb/assets/portrait-crystal-v1.webp';
const defaultPortraitMask = '/PersonalWeb/assets/portrait-mask-v1.webp';
type ProjectMotionWindow = Window & {
  projectEntranceAnimations: Animation[];
  projectEntranceOverflow: number;
  projectEntranceFrames: number;
};

async function recordProjectEntrances(page: Page) {
  await page.addInitScript(() => {
    const observed = window as unknown as ProjectMotionWindow;
    observed.projectEntranceAnimations = [];
    observed.projectEntranceOverflow = 0;
    observed.projectEntranceFrames = 0;
    function sampleEntranceOverflow() {
      if (observed.projectEntranceAnimations.some(animation => animation.id === 'chapter-reveal' && animation.playState === 'running')) {
        observed.projectEntranceFrames++;
        observed.projectEntranceOverflow = Math.max(observed.projectEntranceOverflow, document.documentElement.scrollWidth - innerWidth);
      }
      requestAnimationFrame(sampleEntranceOverflow);
    }
    requestAnimationFrame(sampleEntranceOverflow);
    const animate = Element.prototype.animate;
    // Keep the native animations running normally, but retain them so an
    // assertion cannot miss their keyframes on a fast or busy test machine.
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.matches('#projects .project-story, #projects .project-visual')) {
        observed.projectEntranceAnimations.push(animation);
      }
      return animation;
    };
  });
}

async function projectEntrances(page: Page) {
  return page.evaluate(() => (window as unknown as ProjectMotionWindow).projectEntranceAnimations
    .filter(animation => animation.id === 'chapter-reveal')
    .map(animation => {
      const effect = animation.effect as KeyframeEffect;
      const element = effect.target!;
      const keyframes = effect.getKeyframes();
      return {
        side: element.classList.contains('project-story') ? 'left' : 'right',
        panel: element.closest('[data-project-panel]')!.id,
        start: String(keyframes[0].translate),
        end: String(keyframes.at(-1)!.translate),
      };
    }));
}

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

async function injectPortrait(page: Page, source: string | null) {
  // Model the HTML emitted for a different optional profile photo before
  // normal bootstrap. Do not depend on the decorative crystal's markup.
  await page.route('**/PersonalWeb/', async route => {
    const response = await route.fetch();
    const html = await response.text();
    const imageTag = /<img\b(?=[^>]*\bdata-portrait-image)[^>]*>/;
    expect(html).toMatch(imageTag);
    expect(html).toContain('data-portrait-state="loading"');
    const photo = source === null ? '' : `<img data-portrait-image src="${source}" alt="個人照片載入測試" width="1024" height="1536" style="object-position:70% 40%">`;
    await route.fulfill({ response, body: html
      .replace('data-portrait-state="loading"', `data-portrait-state="${source === null ? 'empty' : 'loading'}"`)
      .replace(/<div\b(?=[^>]*class="portrait-placeholder")[^>]*>/, tag => source === null ? tag.replace(/\saria-hidden="true"/, '') : tag)
      .replace(imageTag, photo) });
  });
}

async function runningAmbient(chapter: Locator) {
  return chapter.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => (
    animation.effect?.getComputedTiming().iterations === Infinity && animation.playState === 'running'
  )).length);
}

async function revealContentIsReadable(page: Page) {
  // Enhanced galleries intentionally hide nine inactive panels; without JS,
  // none have aria-hidden and every panel must still pass this readability check.
  const targets = page.locator('[data-reveal]:not([aria-hidden="true"] *)');
  expect(await targets.count()).toBeGreaterThan(0);
  await expect.poll(() => targets.evaluateAll(elements => elements.every(element => {
    const style = getComputedStyle(element);
    return style.opacity === '1' && style.visibility === 'visible'
      && style.display !== 'none' && element.getBoundingClientRect().height > 0;
  }))).toBe(true);
}

test('the real portrait fills a responsive circular crystal without clipping the face or overflowing the viewport', async ({ page }) => {
  const mask = await page.request.get(defaultPortraitMask);
  expect(mask.ok()).toBe(true);
  expect(mask.headers()['content-type']).toMatch(/^image\/webp/);
  expect((await mask.body()).subarray(0, 4).toString()).toBe('RIFF');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 700 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await fontsSettled(page);
    const portrait = page.locator('[data-portrait]');
    const photo = portrait.locator('[data-portrait-image]');
    const crystal = portrait.locator('.portrait-window');
    await expect(portrait).toHaveAttribute('data-portrait-state', 'ready');
    await expect(portrait.locator('.portrait-frame-label, figcaption')).toHaveCount(0);
    for (const label of ['THE PERSON BEHIND THE IDEAS', '01 / STC', 'PORTRAIT / 01', '讓故事，有一個真實的模樣。']) {
      await expect(portrait.getByText(label, { exact: true })).toHaveCount(0);
    }
    await expect(photo).toHaveAttribute('src', defaultPortrait);
    await expect(photo).toHaveAttribute('alt', /\S+/);
    await expect(photo).toHaveCSS('opacity', '1');
    await expect(photo).toHaveCSS('mix-blend-mode', 'normal');
    await expect(photo).toHaveCSS('object-fit', 'contain');
    await expect(photo).toHaveCSS('mask-image', /\/PersonalWeb\/assets\/portrait-mask-v1\.webp/);
    await expect(photo).toHaveCSS('mask-mode', 'luminance');
    await expect(portrait.locator('.portrait-placeholder')).toBeHidden();
    await expect.poll(() => crystal.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.width / bounds.height;
    })).toBeCloseTo(1, 2);
    await expect(crystal).toHaveCSS('border-top-left-radius', '50%');
    await expect(crystal).toHaveCSS('border-bottom-right-radius', '50%');
    if (viewport.width >= 900) {
      await betweenHeaderAndDock(portrait);
      await expect.poll(() => portrait.evaluate(element => (
        element.getBoundingClientRect().left >= document.querySelector('.hero-copy')!.getBoundingClientRect().right
      ))).toBe(true);
    } else {
      // The crystal deliberately floats forever. Scroll its stable outer
      // figure instead of waiting for the animated surface to stop moving.
      await portrait.scrollIntoViewIfNeeded();
      await expect(portrait).toBeInViewport();
      await betweenHeaderAndDock(crystal);
    }
    // Background mist and glass highlights must not fade the person itself.
    await expect.poll(() => photo.evaluate(element => {
      for (let ancestor: Element | null = element; ancestor && ancestor.id !== 'about'; ancestor = ancestor.parentElement) {
        if (getComputedStyle(ancestor).opacity !== '1') return false;
      }
      return true;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('an empty portrait source retains an accessible circular placeholder without a broken image', async ({ page }) => {
  await injectPortrait(page, null);
  await page.goto('./');
  const portrait = page.locator('[data-portrait]');
  await expect(portrait).toHaveAttribute('data-portrait-state', 'empty');
  await expect(portrait.locator('[data-portrait-image]')).toHaveCount(0);
  await expect(portrait.getByRole('img', { name: '個人照片預留區' })).toBeVisible();
  await expect(portrait.locator('.portrait-window')).toHaveCSS('aspect-ratio', '1 / 1');
});

test('the luminance mask preserves an opaque face while exposing the animated abyss outside the person', async ({ page }) => {
  await page.goto('./');
  const samples = await page.evaluate(async source => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const sample = ([x, y]: number[]) => Array.from(context.getImageData(
      Math.round(x * (canvas.width - 1)), Math.round(y * (canvas.height - 1)), 1, 1,
    ).data).slice(0, 3);
    return {
      face: [[.5, .35], [.5, .45], [.5, .55], [.38, .45], [.62, .45]].flatMap(sample),
      background: [[.03, .03], [.97, .03], [.03, .4], [.97, .4]].flatMap(sample),
    };
  }, defaultPortraitMask);
  expect(Math.min(...samples.face)).toBeGreaterThanOrEqual(248);
  expect(Math.max(...samples.background)).toBeLessThanOrEqual(8);
});

test('a delayed real portrait reserves its final crystal size before the image loads', async ({ page }) => {
  let releaseImage!: () => void;
  const imageReleased = new Promise<void>(resolve => { releaseImage = resolve; });
  await page.route(`**${defaultPortrait}`, async route => {
    await imageReleased;
    await route.continue();
  });
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await fontsSettled(page);
    const portrait = page.locator('[data-portrait]');
    const crystal = portrait.locator('.portrait-window');
    await expect(portrait).toHaveAttribute('data-portrait-state', 'loading');
    const before = await crystal.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }));
    expect(before.width).toBeGreaterThan(0);
    expect(before.width).toBe(before.height);
    releaseImage();
    await expect(portrait).toHaveAttribute('data-portrait-state', 'ready');
    const after = await crystal.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }));
    expect(after).toEqual(before);
  } finally {
    releaseImage();
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
    await expect(photo).toHaveCSS('object-fit', 'contain');
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

test('the crystal animates only while its chapter is active and respects reduced motion and page suspension', async ({ page }) => {
  await page.goto('./');
  await fontsSettled(page);
  await chapterAtTop(page, 'about');
  const portrait = page.locator('[data-portrait]');
  await expect(portrait).toHaveAttribute('data-portrait-state', 'ready');
  await expect.poll(() => runningAmbient(portrait)).toBeGreaterThan(0);
  const times = () => portrait.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().iterations === Infinity)
    .map(animation => Number(animation.currentTime)));
  const started = await times();
  await expect.poll(async () => (await times()).some((time, index) => time > started[index] + 50)).toBe(true);

  await page.locator('.top-nav a[href="#projects"]').click();
  await chapterAtTop(page, 'projects');
  await expect.poll(() => runningAmbient(portrait)).toBe(0);
  await page.locator('.top-nav a[href="#about"]').click();
  await chapterAtTop(page, 'about');
  await expect.poll(() => runningAmbient(portrait)).toBeGreaterThan(0);

  expect(await page.evaluate(() => Object.hasOwn(document, 'hidden'))).toBe(false);
  try {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => runningAmbient(portrait)).toBe(0);
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await expect.poll(() => runningAmbient(portrait)).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect.poll(() => runningAmbient(portrait)).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(() => runningAmbient(portrait)).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => runningAmbient(portrait)).toBe(0);
  await expect(portrait.locator('[data-portrait-image]')).toHaveCSS('opacity', '1');
  await expect(portrait.locator('[data-portrait-image]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await chapterAtTop(page, 'about');
  await expect.poll(() => runningAmbient(portrait)).toBeGreaterThan(0);
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

test('wheel navigation slides project copy from the left and artwork from the right on each chapter visit', async ({ page }) => {
  await recordProjectEntrances(page);
  await page.goto('./');
  await fontsSettled(page);
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await chapterAtTop(page, 'about');
  const panel = page.locator('#project-panel-personal-web');
  const story = panel.locator('.project-story');
  const visual = panel.locator('.project-visual');
  const layout = () => panel.locator('.project-story, .project-visual').evaluateAll(elements => elements.map(element => {
    const target = element as HTMLElement;
    return [target.offsetLeft, target.offsetTop, target.offsetWidth, target.offsetHeight];
  }));
  const initialLayout = await layout();
  await page.mouse.move(700, 450);

  for (const visit of [1, 2]) {
    await page.mouse.wheel(0, visit === 1 ? 180 : -180);
    await expect.poll(async () => (await projectEntrances(page)).length).toBe(visit * 2);
    const entrances = (await projectEntrances(page)).slice(-2);
    expect(entrances.map(entrance => entrance.side).sort()).toEqual(['left', 'right']);
    for (const entrance of entrances) {
      expect(entrance.panel).toBe('project-panel-personal-web');
      const [startX, startY = 0] = entrance.start.split(/\s+/).map(Number.parseFloat);
      if (entrance.side === 'left') expect(startX).toBeLessThan(0);
      else expect(startX).toBeGreaterThan(0);
      expect(startY).toBe(0);
      expect(entrance.end.split(/\s+/).map(Number.parseFloat).every(value => value === 0)).toBe(true);
    }
    await chapterAtTop(page, 'projects');
    for (const surface of [story, visual]) {
      await expect(surface).toHaveAttribute('data-reveal-state', 'visible');
      await expect(surface).toHaveCSS('translate', 'none');
      await expect(surface).toHaveCSS('opacity', '1');
      await expect(surface).toBeInViewport();
    }
    expect(await layout()).toEqual(initialLayout);
    await expect(page.locator('.project-atlas')).not.toHaveAttribute('data-reveal');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => (window as unknown as ProjectMotionWindow).projectEntranceFrames)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as unknown as ProjectMotionWindow).projectEntranceOverflow)).toBe(0);
    if (visit === 1) {
      await page.mouse.wheel(0, 180);
      await chapterAtTop(page, 'skills');
      // This represents a fresh gesture after the pager's trailing-wheel guard,
      // not an assertion tied to an animation's exact runtime.
      await page.waitForTimeout(300);
    }
  }
  await revealContentIsReadable(page);
});

test('project intro copy and desktop or touch selection hints are removed from the DOM', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('./#projects');
    const projects = page.locator('#projects');
    await expect(projects.getByText('從一個念頭出發', { exact: false })).toHaveCount(0);
    await expect(projects.getByText('點選切換', { exact: false })).toHaveCount(0);
    await expect(projects.getByText('懸停兩側，繼續探索', { exact: false })).toHaveCount(0);
    await expect(projects.locator('.library-hint, .hover-hint, .touch-hint')).toHaveCount(0);
    await expect(projects.getByRole('tab')).toHaveCount(10);
    await expect(projects.getByRole('button', { name: '向右瀏覽專案' })).toBeVisible();
  }
});

test('reduced motion keeps both project surfaces readable without playing directional entrances', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recordProjectEntrances(page);
  await page.goto('./');
  await fontsSettled(page);
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  const distance = await page.locator('#projects').evaluate(section => section.getBoundingClientRect().top);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, distance);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  const panel = page.getByRole('tabpanel');
  for (const surface of [panel.locator('.project-story'), panel.locator('.project-visual')]) {
    await expect(surface).toBeInViewport();
    await expect(surface).toHaveCSS('opacity', '1');
    await expect(surface).toHaveCSS('translate', 'none');
  }
  expect(await projectEntrances(page)).toEqual([]);
  await expect.poll(() => page.locator('#projects').evaluate(section => section.getAnimations({ subtree: true })
    .filter(animation => animation.id === 'chapter-reveal').length)).toBe(0);
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

test('without JavaScript every chapter and timeline event stays readable and the real portrait still displays', async ({ browser }) => {
  for (const supplied of [false, true]) {
    const label = supplied ? 'default real portrait' : 'empty portrait';
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    const page = await context.newPage();
    let failure: unknown;
    try {
      if (!supplied) await injectPortrait(page, null);
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
          await expect(photo).toHaveAttribute('src', defaultPortrait);
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
      await expect.poll(() => runningAmbient(page.locator('[data-portrait]'))).toBe(0);
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
