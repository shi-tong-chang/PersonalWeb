import { test, expect } from '@playwright/test';

test('desktop wheel, keyboard, chapter links and deep links work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://shi-tong-chang.github.io/PersonalWeb/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/PersonalWeb/favicon.svg');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 180);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
  await expect(page.locator('#projects')).toBeInViewport();
  await page.waitForTimeout(850);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await page.waitForTimeout(850);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'contact');
  await expect(page.locator('#contact')).toBeInViewport();
  await expect(page.getByRole('link', { name: /到 GitHub 找我/ })).toHaveAttribute('href', 'https://github.com/shi-tong-chang');
  await page.waitForTimeout(850);
  await page.locator('#next-chapter').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'about');
  await page.goto('./#skills');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'skills');
  await page.reload();
  await expect(page.locator('#skills')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('trackpad wheel burst advances only one chapter', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.mouse.move(700, 500);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 80);
  await page.waitForTimeout(850);
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'projects');
});

test('rapid chapter selection finishes on the latest destination with accessible focus', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.evaluate(() => {
    for (const index of [1, 2, 3]) {
      document.querySelector<HTMLAnchorElement>(`nav [data-chapter="${index}"]`)!.click();
    }
  });
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'contact');
  await expect(page.locator('#contact')).toBeFocused();
  await expect(page.locator('#contact')).not.toHaveAttribute('inert');
  await expect(page.locator('#about')).toHaveAttribute('inert');
  await expect(page).toHaveURL(/#contact$/);
  await page.waitForTimeout(750);
  await page.keyboard.press('Home');
  await expect(page.locator('#about')).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'about');
});

test('large touch screens retain native scrolling and chapter navigation', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 1366 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/PersonalWeb/');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).tap();
  await expect(page.locator('#contact')).toBeInViewport();
  await expect(page.locator('#contact')).toBeFocused();
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  await context.close();
});

test('longer content switches to native scrolling and remains reachable', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.locator('#projects .project-description').first().evaluate(element => {
    // Extend the actual editable copy without changing the chapter's grid structure.
    element.append(document.createTextNode('這是延長的專案介紹，補上背景、過程與實作心得。'.repeat(90)));
    const lastLine = document.createElement('span');
    lastLine.dataset.testid = 'extended-copy-end';
    lastLine.style.display = 'block';
    lastLine.textContent = '完整內容的最後一行';
    element.append(lastLine);
  });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('.chapter[inert]')).toHaveCount(0);
  const lastLine = page.getByTestId('extended-copy-end');
  await lastLine.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect.poll(() => lastLine.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const section = element.closest('.chapter')!.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const footer = document.querySelector('.site-footer')!.getBoundingClientRect();
    return bounds.height > 0
      && bounds.top >= Math.max(header.bottom, section.top)
      && bounds.bottom <= Math.min(footer.top, section.bottom)
      && bounds.left >= Math.max(0, section.left)
      && bounds.right <= Math.min(innerWidth, section.right);
  }), { message: 'The full final line must be inside its chapter and visible between the fixed header and footer.' }).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('#contact')).toBeInViewport();
});

test('mobile keeps all content reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  for (const id of ['about', 'projects', 'skills', 'contact']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id}`)).toBeInViewport();
    expect(await page.locator(`#${id}`).evaluate(element => element.hasAttribute('inert'))).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: /個人介紹/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'about');
});

test('reduced motion and short viewports use readable native scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#contact');
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('#contact')).toBeInViewport();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('body')).toHaveClass(/is-paged/);
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect(page.locator('body')).not.toHaveClass(/is-paged/);
  await expect(page.locator('#contact')).toBeInViewport();
});

test('without JavaScript all chapters and navigation remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/PersonalWeb/');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await page.getByRole('navigation').getByRole('link', { name: /聯繫方式/ }).click();
  await expect(page.locator('#contact')).toBeInViewport();
  await context.close();
});

test('ink landscape, four arts and chapter navigation remain available', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => page.locator('.hero-landscape').evaluate(image => {
    const landscape = image as HTMLImageElement;
    return landscape.complete && landscape.naturalWidth > 0;
  }), { message: 'The main ink landscape must load successfully.' }).toBe(true);

  await expect(page.locator('.four-arts-grid .art-card')).toHaveCount(4);
  for (const art of ['qin', 'qi', 'shu', 'hua']) {
    const symbol = page.locator(`.art-card[data-art="${art}"] svg.four-arts--${art}`);
    await expect(symbol).toHaveCount(1);
    await expect(symbol).toHaveAttribute('aria-hidden', 'true');
  }

  const navigation = page.getByRole('navigation', { name: '章節導覽' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link')).toHaveCount(4);
  for (const [id, label] of [
    ['about', '個人介紹'],
    ['projects', '專案經歷'],
    ['skills', '擅長技能'],
    ['contact', '聯繫方式'],
  ]) {
    await expect(page.locator(`section.chapter#${id}`)).toHaveCount(1);
    await expect(navigation.getByRole('link', { name: label })).toHaveAttribute('href', `#${id}`);
  }
});

test('mobile skill headings and narrow tablet navigation fit without collisions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#skills');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const headingLines = page.locator('#skills-heading .heading-line');
  await expect(headingLines).toHaveCount(2);
  const lines = await headingLines.evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect();
    return {
      top: bounds.top,
      bottom: bounds.bottom,
      height: bounds.height,
      lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    };
  }));
  for (const line of lines) {
    expect(line.height).toBeGreaterThan(0);
    expect(line.height).toBeLessThanOrEqual(line.lineHeight * 1.5);
  }
  expect(lines[1].top).toBeGreaterThanOrEqual(lines[0].bottom - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 601, height: 900 });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const brand = document.querySelector('.brand')!.getBoundingClientRect();
    const navigation = document.querySelector('.top-nav')!.getBoundingClientRect();
    return brand.right <= navigation.left
      && brand.left >= header.left
      && navigation.right <= header.right
      && brand.top >= header.top
      && brand.bottom <= header.bottom
      && navigation.top >= header.top
      && navigation.bottom <= header.bottom
      && document.documentElement.scrollWidth <= innerWidth;
  }), { message: 'The brand and navigation must fit inside the 601px header without overlap or overflow.' }).toBe(true);
});
