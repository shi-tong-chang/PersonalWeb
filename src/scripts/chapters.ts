const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-chapter]')];
const header = document.querySelector<HTMLElement>('.site-header');
const hero = document.querySelector<HTMLElement>('#about');
const currentChapter = document.querySelector<HTMLElement>('#current-chapter');
const progressFill = document.querySelector<HTMLElement>('#progress-fill');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let activeIndex = -1;
let frame = 0;
let heroVisible = Boolean(hero);
let previousSceneState = '';

function setActiveChapter(index: number) {
  if (index === activeIndex || !sections[index]) return;
  activeIndex = index;
  document.body.dataset.theme = sections[index].id;
  sections.forEach((section, sectionIndex) => {
    section.classList.toggle('is-active', sectionIndex === index);
  });
  links.forEach(link => {
    if (Number(link.dataset.chapter) === index) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (currentChapter) currentChapter.textContent = String(index + 1).padStart(2, '0');
  if (progressFill) progressFill.style.width = `${((index + 1) / sections.length) * 100}%`;
}

function updateSceneVisibility() {
  hero?.classList.toggle('is-scene-visible', heroVisible && !document.hidden);
}

function update() {
  frame = 0;
  if (document.hidden) return;

  header?.classList.toggle('is-scrolled', window.scrollY > 32);

  // A fixed reading line also works for sections much taller than the viewport.
  // Intersection ratios alone would favour the shorter neighbouring section.
  const readingLine = (header?.getBoundingClientRect().bottom ?? 0) + Math.min(innerHeight * 0.2, 160);
  let nextIndex = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= readingLine) nextIndex = index;
  });
  if (window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2) {
    nextIndex = Math.max(0, sections.length - 1);
  }
  setActiveChapter(nextIndex);

  if (!hero) return;
  if (reducedMotion.matches) {
    if (previousSceneState === 'reduced') return;
    previousSceneState = 'reduced';
    hero.style.setProperty('--scene-shift', '0px');
    hero.style.setProperty('--scene-scale', '1');
    hero.style.setProperty('--scene-opacity', '1');
    return;
  }

  // Only the illustration recedes. Text stays fixed in the normal document flow.
  // No ticking animation loop or scroll trapping is needed for this effect.
  const bounds = hero.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(bounds.height, 1)));
  const sceneState = progress.toFixed(4);
  if (sceneState === previousSceneState) return;
  previousSceneState = sceneState;
  hero.style.setProperty('--scene-shift', `${(progress * 60).toFixed(2)}px`);
  hero.style.setProperty('--scene-scale', (1.02 + progress * 0.04).toFixed(4));
  hero.style.setProperty('--scene-opacity', (1 - progress * 0.55).toFixed(4));
}

function scheduleUpdate() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(update);
}

function sectionFromHash(hash: string) {
  return sections.find(section => `#${section.id}` === hash);
}

// Leave the browser in charge of scrolling, history and fragment navigation.
// Moving focus without scrolling lets the next Tab continue inside that chapter.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const section = sectionFromHash(link.getAttribute('href') ?? '');
  section?.focus({ preventScroll: true });
  if (section) scheduleUpdate();
});

window.addEventListener('hashchange', () => {
  sectionFromHash(location.hash)?.focus({ preventScroll: true });
  scheduleUpdate();
});
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate, { passive: true });
window.addEventListener('pageshow', scheduleUpdate);
window.addEventListener('load', scheduleUpdate, { once: true });
reducedMotion.addEventListener('change', scheduleUpdate);

if (hero) {
  const sceneObserver = new IntersectionObserver(entries => {
    heroVisible = entries.some(entry => entry.isIntersecting);
    updateSceneVisibility();
    scheduleUpdate();
  });
  sceneObserver.observe(hero);
}

// Project details and late-loaded fonts may change chapter heights after load.
const layoutObserver = new ResizeObserver(scheduleUpdate);
sections.forEach(section => layoutObserver.observe(section));
document.fonts?.ready.then(scheduleUpdate);

document.addEventListener('visibilitychange', () => {
  updateSceneVisibility();
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else scheduleUpdate();
});
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  hero?.classList.remove('is-scene-visible');
});
window.addEventListener('pageshow', updateSceneVisibility);

updateSceneVisibility();
scheduleUpdate();

document.querySelector<HTMLButtonElement>('#copy-email')?.addEventListener('click', async event => {
  const button = event.currentTarget as HTMLButtonElement;
  const status = document.querySelector<HTMLElement>('#copy-status');
  if (!button.dataset.email || !status) return;
  try {
    await navigator.clipboard.writeText(button.dataset.email);
    status.textContent = 'Email 已複製';
  } catch {
    status.textContent = '無法自動複製，請選取上方 Email 複製。';
  }
});
