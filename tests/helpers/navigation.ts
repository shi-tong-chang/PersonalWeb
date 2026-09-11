import type { Page } from '@playwright/test';

export async function observeStartupScrollSettled(page: Page) {
  // An immediate top=0 can precede the browser's late fragment jump. Observe
  // navigation settling without changing the scroll position under test.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    let idleTimer = 0;
    const cleanup = () => {
      clearTimeout(idleTimer);
      clearTimeout(timeout);
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { cleanup(); resolve(); }, 200);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Startup fragment scrolling did not settle within five seconds.'));
    }, 5000);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }));
}
