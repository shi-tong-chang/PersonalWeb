const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-chapter]')];
const header = document.querySelector<HTMLElement>('.site-header');
const hero = document.querySelector<HTMLElement>('#about');
const currentChapter = document.querySelector<HTMLElement>('#current-chapter');
const progressFill = document.querySelector<HTMLElement>('#progress-fill');
const nextChapter = document.querySelector<HTMLAnchorElement>('#next-chapter');
const nextLabel = document.querySelector<HTMLElement>('#next-label');
const nextArrow = document.querySelector<HTMLElement>('#next-arrow');
const chapterDock = document.querySelector<HTMLElement>('.chapter-dock');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pagedMedia = matchMedia('(min-width: 900px) and (min-height: 700px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

const transitionDuration = 650;
const gestureIdle = 180;
let paged = pagedMedia.matches;
let activeIndex = -1;
let frame = 0;
let tweenFrame = 0;
let layoutFrame = 0;
let heroVisible = Boolean(hero);
let previousSceneState = '';
let hasInteracted = false;
let rememberedIndex = 0;
let rememberedOffset = 0;
let tween: { index: number; from: number; startedAt: number } | undefined;
let lastWheelAt = -Infinity;
let wheelTotal = 0;
let gestureConsumed = false;
let gestureReadsChapter = false;
let wheelLockedUntil = 0;
let nativeHashTimer = 0;
const initialChapterHash = location.hash;
const initialChapterIndex = hashIndex(initialChapterHash);
let initialAlignmentAllowed = initialChapterIndex >= 0;
let initialAlignmentUntil = performance.now() + 2000;
let initialAlignmentTimer = 0;
let initialChapterAligned = false;
const readingKeys = new Set<string>();
const consumedKeys = new Set<string>();

document.body.classList.toggle('is-paged', paged);

function chapterTop(index: number) {
  return sections[index].getBoundingClientRect().top + window.scrollY;
}

function chapterReadingEnd(index: number) {
  return chapterTop(index) + Math.max(0, sections[index].getBoundingClientRect().height - innerHeight);
}

function maximumScroll() {
  return Math.max(0, document.documentElement.scrollHeight - innerHeight);
}

function scrollInstant(top: number) {
  window.scrollTo({ top: Math.max(0, Math.min(maximumScroll(), top)), behavior: 'instant' });
}

function indexAtReadingLine() {
  const readingLine = (header?.getBoundingClientRect().bottom ?? 0) + Math.min(innerHeight * 0.2, 160);
  let index = 0;
  sections.forEach((section, sectionIndex) => {
    if (section.getBoundingClientRect().top <= readingLine) index = sectionIndex;
  });
  if (window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2) {
    index = Math.max(0, sections.length - 1);
  }
  return index;
}

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
  if (progressFill) progressFill.style.width = String(((index + 1) / sections.length) * 100) + '%';
  const isLastChapter = index === sections.length - 1;
  const nextIndex = (index + 1) % sections.length;
  if (nextChapter) {
    nextChapter.href = '#' + sections[nextIndex].id;
    nextChapter.setAttribute('aria-label', isLastChapter ? '回到開場：第一章，個人介紹' : '下一章：第 ' + (nextIndex + 1) + ' 章');
  }
  if (nextLabel) nextLabel.textContent = isLastChapter ? '回到開場' : '下一章';
  if (nextArrow) nextArrow.textContent = isLastChapter ? '↑' : '↓';
}

function updateSceneVisibility() {
  hero?.classList.toggle('is-scene-visible', heroVisible && !document.hidden);
}

function update() {
  frame = 0;
  if (document.hidden || !sections.length) return;
  header?.classList.toggle('is-scrolled', window.scrollY > 32);
  const readingIndex = indexAtReadingLine();
  setActiveChapter(tween?.index ?? readingIndex);
  if (!tween && !layoutFrame) {
    rememberedIndex = readingIndex;
    rememberedOffset = window.scrollY - chapterTop(readingIndex);
  }

  if (!hero) return;
  if (reducedMotion.matches) {
    if (previousSceneState === 'reduced') return;
    previousSceneState = 'reduced';
    hero.style.setProperty('--scene-shift', '0px');
    hero.style.setProperty('--scene-scale', '1');
    hero.style.setProperty('--scene-opacity', '1');
    return;
  }

  // The image recedes independently; copy and every chapter remain normal DOM.
  const bounds = hero.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(bounds.height, 1)));
  const sceneState = progress.toFixed(4);
  if (sceneState === previousSceneState) return;
  previousSceneState = sceneState;
  hero.style.setProperty('--scene-shift', (progress * 60).toFixed(2) + 'px');
  hero.style.setProperty('--scene-scale', (1.02 + progress * 0.04).toFixed(4));
  hero.style.setProperty('--scene-opacity', (1 - progress * 0.55).toFixed(4));
}

function scheduleUpdate() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(update);
}

function stopInitialAlignment() {
  initialAlignmentAllowed = false;
  clearTimeout(initialAlignmentTimer);
  initialAlignmentTimer = 0;
}

function canAlignInitialChapter() {
  return initialAlignmentAllowed && !hasInteracted && paged && !tween && !layoutFrame &&
    !document.hidden && location.hash === initialChapterHash && performance.now() <= initialAlignmentUntil;
}

function correctInitialChapter() {
  initialAlignmentTimer = 0;
  if (!canAlignInitialChapter()) return;
  const target = Math.min(maximumScroll(), chapterTop(initialChapterIndex));
  if (Math.abs(window.scrollY - target) <= 1) {
    initialChapterAligned = true;
    return;
  }
  scrollInstant(target);
  rememberedIndex = initialChapterIndex;
  rememberedOffset = 0;
  initialChapterAligned = true;
  setActiveChapter(initialChapterIndex);
  scheduleUpdate();
}

function scheduleInitialAlignment() {
  clearTimeout(initialAlignmentTimer);
  initialAlignmentTimer = 0;
  if (!canAlignInitialChapter()) return;
  const target = Math.min(maximumScroll(), chapterTop(initialChapterIndex));
  if (Math.abs(window.scrollY - target) <= 1) return;
  // A native fragment leaves a positive header inset. Scrolling well inside an
  // already aligned chapter is reading, not a startup fragment to pull back.
  const nativeInset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (initialChapterAligned && window.scrollY > target + Math.max(40, nativeInset)) return stopInitialAlignment();
  initialAlignmentTimer = window.setTimeout(correctInitialChapter, 120);
}

// Tab and inputs inside the gallery must release this startup-only guard too.
// Capture runs even when an interactive child consumes the bubbling event.
for (const eventName of ['keydown', 'wheel', 'pointerdown', 'touchstart']) {
  document.addEventListener(eventName, stopInitialAlignment, { capture: true, passive: true, once: true });
}

function syncSettledNativeHash() {
  nativeHashTimer = 0;
  if (paged || tween || layoutFrame || document.hidden || !hasInteracted || !sections.length) return;
  // Keep project/archive deep links intact. A chapter fragment follows reading
  // only after native scrolling settles, never during an anchor's smooth scroll.
  if (location.hash && hashIndex() < 0) return;
  const hash = '#' + sections[indexAtReadingLine()].id;
  if (location.hash !== hash) history.replaceState(history.state, '', hash);
}

function resetWheelGesture() {
  lastWheelAt = -Infinity;
  wheelTotal = 0;
  gestureConsumed = false;
  gestureReadsChapter = false;
  wheelLockedUntil = 0;
}

function cancelTween() {
  cancelAnimationFrame(tweenFrame);
  tweenFrame = 0;
  tween = undefined;
}

function settleTweenBeforePause() {
  const index = tween?.index;
  cancelTween();
  if (index === undefined) return;
  // A suspended tab must not return between chapters with the destination hash.
  const nativeInset = pagedMedia.matches ? 0 : parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  scrollInstant(chapterTop(index) - nativeInset);
  rememberedIndex = index;
  rememberedOffset = -nativeInset;
  setActiveChapter(index);
}

function hashIndex(hash = location.hash) {
  return sections.findIndex(section => '#' + section.id === hash);
}

function writeChapterHash(index: number, mode: 'push' | 'replace' | 'none') {
  const hash = '#' + sections[index].id;
  if (mode === 'none' || location.hash === hash) return;
  if (mode === 'push') history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
}

function navigateChapter(index: number, options: { focus?: boolean; history?: 'push' | 'replace' | 'none'; animate?: boolean } = {}) {
  if (!sections[index]) return;
  // Release project hover/entrance motion before a newer chapter intent.
  document.dispatchEvent(new CustomEvent('personalweb:chapter-navigation'));
  cancelTween();
  writeChapterHash(index, options.history ?? 'replace');
  setActiveChapter(index);
  if (options.focus) sections[index].focus({ preventScroll: true });

  const from = window.scrollY;
  const target = Math.min(maximumScroll(), chapterTop(index));
  if (!paged || options.animate === false || Math.abs(target - from) < 1) {
    scrollInstant(target);
    rememberedIndex = index;
    rememberedOffset = 0;
    scheduleUpdate();
    return;
  }

  const startedAt = performance.now();
  tween = { index, from, startedAt };
  wheelLockedUntil = startedAt + transitionDuration + gestureIdle;
  const animate = (now: number) => {
    if (!tween || document.hidden) return;
    const progress = Math.min(1, Math.max(0, (now - tween.startedAt) / transitionDuration));
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    // Re-read the destination so late font/layout shifts cannot miss the chapter.
    const destination = Math.min(maximumScroll(), chapterTop(tween.index));
    scrollInstant(tween.from + (destination - tween.from) * eased);
    scheduleUpdate();
    if (progress < 1) tweenFrame = requestAnimationFrame(animate);
    else {
      rememberedIndex = tween.index;
      rememberedOffset = 0;
      tween = undefined;
      tweenFrame = 0;
      scheduleUpdate();
    }
  };
  tweenFrame = requestAnimationFrame(animate);
}

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const index = hashIndex(link.getAttribute('href') ?? '');
  if (index < 0) return;
  hasInteracted = true;
  resetWheelGesture();
  if (paged) {
    event.preventDefault();
    navigateChapter(index, { focus: true, history: 'push' });
  } else {
    cancelTween();
    document.dispatchEvent(new CustomEvent('personalweb:chapter-navigation'));
    sections[index].focus({ preventScroll: true });
    scheduleUpdate();
  }
});

// One desktop wheel gesture means one chapter. Trackpad tails are consumed,
// including tails that arrive while the 650ms transition is still running.
document.addEventListener('wheel', event => {
  if (event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
  hasInteracted = true;
  if (!paged) return;
  event.preventDefault();
  const now = performance.now();
  const freshGesture = now - lastWheelAt > gestureIdle;
  if (freshGesture) {
    wheelTotal = 0;
    gestureConsumed = false;
    gestureReadsChapter = false;
  }
  lastWheelAt = now;
  if (tween || now < wheelLockedUntil) {
    gestureConsumed = true;
    return;
  }

  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  const direction = Math.sign(delta);
  const index = indexAtReadingLine();
  const start = chapterTop(index);
  const end = chapterReadingEnd(index);
  const longChapter = end - start > 2;
  const canRead = longChapter && (direction > 0 ? window.scrollY < end - 2 : window.scrollY > start + 2);

  // Expanded projects and long copy are never clipped. A reading gesture stays
  // inside this chapter; reaching its edge requires a new gesture to leave.
  if (canRead && !gestureConsumed) {
    gestureReadsChapter = true;
    scrollInstant(Math.max(start, Math.min(end, window.scrollY + delta)));
    scheduleUpdate();
    return;
  }
  if (gestureReadsChapter || gestureConsumed) return;
  if (Math.sign(wheelTotal) !== direction) wheelTotal = 0;
  wheelTotal += delta;
  if (Math.abs(wheelTotal) < 45) return;
  gestureConsumed = true;
  navigateChapter(index + direction, { focus: true, history: 'replace' });
}, { passive: false });

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!(event.target instanceof Element) || event.target.closest('input, textarea, select, button, summary, [contenteditable]:not([contenteditable="false"]), [role="tablist"], [role="slider"], [role="listbox"], [role="combobox"], [role="menu"]')) return;
  const index = tween?.index ?? indexAtReadingLine();
  const destinations: Record<string, number> = {
    ArrowDown: index + 1,
    PageDown: index + 1,
    ArrowUp: index - 1,
    PageUp: index - 1,
    Home: 0,
    End: sections.length - 1,
  };
  if (!(event.key in destinations)) return;
  hasInteracted = true;
  if (!paged) return;
  event.preventDefault();
  if (!event.repeat) {
    readingKeys.delete(event.key);
    consumedKeys.delete(event.key);
  }
  if (consumedKeys.has(event.key) || (event.repeat && tween)) return;

  const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
  const start = chapterTop(index);
  const end = chapterReadingEnd(index);
  const canRead = direction !== 0 && end - start > 2 && (direction > 0 ? window.scrollY < end - 2 : window.scrollY > start + 2);
  if (!tween && canRead) {
    readingKeys.add(event.key);
    const distance = event.key.startsWith('Page') ? Math.max(40, innerHeight - (header?.getBoundingClientRect().height ?? 0) - (chapterDock?.getBoundingClientRect().height ?? 0) - 40) : 40;
    scrollInstant(Math.max(start, Math.min(end, window.scrollY + distance * direction)));
    scheduleUpdate();
    return;
  }
  // Holding a reading key at the edge must not spill into another chapter.
  if (readingKeys.has(event.key)) return;
  resetWheelGesture();
  consumedKeys.add(event.key);
  navigateChapter(destinations[event.key], { focus: true, history: 'replace' });
});
document.addEventListener('keyup', event => {
  readingKeys.delete(event.key);
  consumedKeys.delete(event.key);
});
document.addEventListener('pointerdown', () => { hasInteracted = true; }, { passive: true });
document.addEventListener('touchstart', () => { hasInteracted = true; }, { passive: true });

window.addEventListener('hashchange', () => {
  cancelTween();
  resetWheelGesture();
  const index = hashIndex();
  if (index >= 0) {
    if (paged) navigateChapter(index, { focus: true, history: 'none' });
    else sections[index].focus({ preventScroll: true });
  }
  scheduleUpdate();
});
window.addEventListener('popstate', cancelTween);

document.addEventListener('personalweb:project-navigation', () => {
  stopInitialAlignment();
  hasInteracted = true;
  cancelTween();
  resetWheelGesture();
  scheduleUpdate();
});

// A viewport/media-mode change preserves the chapter and its reading offset.
// Content ResizeObserver callbacks intentionally do NOT trigger this alignment.
function configureLayout() {
  if (layoutFrame) return;
  if (initialAlignmentAllowed && !hasInteracted) initialAlignmentUntil = performance.now() + 2000;
  const index = tween?.index ?? rememberedIndex;
  const offset = tween ? 0 : rememberedOffset;
  const wasPaged = paged;
  cancelTween();
  resetWheelGesture();
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    paged = pagedMedia.matches;
    document.body.classList.toggle('is-paged', paged);
    if ((wasPaged || paged) && sections[index]) {
      const start = chapterTop(index);
      const end = chapterReadingEnd(index);
      const nativeInset = !paged && offset <= 0 ? parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0 : 0;
      scrollInstant(start + Math.max(0, Math.min(end - start, offset)) - nativeInset);
      rememberedIndex = index;
      rememberedOffset = Math.max(0, Math.min(end - start, offset)) - nativeInset;
      setActiveChapter(index);
    }
    scheduleUpdate();
    scheduleInitialAlignment();
  });
}

window.addEventListener('scroll', () => {
  scheduleUpdate();
  scheduleInitialAlignment();
  clearTimeout(nativeHashTimer);
  nativeHashTimer = 0;
  if (!paged && hasInteracted) nativeHashTimer = window.setTimeout(syncSettledNativeHash, gestureIdle);
}, { passive: true });
window.addEventListener('resize', configureLayout, { passive: true });
pagedMedia.addEventListener('change', configureLayout);
reducedMotion.addEventListener('change', scheduleUpdate);

if (hero) {
  const sceneObserver = new IntersectionObserver(entries => {
    heroVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
    updateSceneVisibility();
    scheduleUpdate();
  }, { threshold: [0, 0.001] });
  sceneObserver.observe(hero);
}

const layoutObserver = new ResizeObserver(() => {
  scheduleUpdate();
  scheduleInitialAlignment();
});
sections.forEach(section => layoutObserver.observe(section));

function alignInitialHash() {
  if (initialAlignmentAllowed && !hasInteracted) {
    initialAlignmentUntil = performance.now() + 2000;
    correctInitialChapter();
    scheduleInitialAlignment();
  }
  scheduleUpdate();
}
window.addEventListener('load', alignInitialHash, { once: true });
document.fonts?.ready.then(alignInitialHash);

document.addEventListener('visibilitychange', () => {
  updateSceneVisibility();
  if (document.hidden) {
    settleTweenBeforePause();
    resetWheelGesture();
    readingKeys.clear();
    consumedKeys.clear();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(layoutFrame);
    clearTimeout(nativeHashTimer);
    clearTimeout(initialAlignmentTimer);
    initialAlignmentTimer = 0;
    nativeHashTimer = 0;
    frame = 0;
    layoutFrame = 0;
  } else {
    if (paged !== pagedMedia.matches) configureLayout();
    scheduleUpdate();
  }
});
window.addEventListener('pagehide', () => {
  stopInitialAlignment();
  settleTweenBeforePause();
  resetWheelGesture();
  readingKeys.clear();
  consumedKeys.clear();
  cancelAnimationFrame(frame);
  cancelAnimationFrame(layoutFrame);
  clearTimeout(nativeHashTimer);
  nativeHashTimer = 0;
  frame = 0;
  layoutFrame = 0;
  hero?.classList.remove('is-scene-visible');
});
window.addEventListener('pageshow', () => {
  updateSceneVisibility();
  if (paged !== pagedMedia.matches) configureLayout();
  scheduleUpdate();
});

updateSceneVisibility();
alignInitialHash();

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
