// Progressive enhancement: markup is visible before, after, and without this file.
// Nothing here owns scrolling or the project gallery's selection animation.
type RevealItem = {
  element: HTMLElement;
  chapter: HTMLElement | null;
  order: number;
  visible: boolean;
  readyToReveal: boolean;
  needsReveal: boolean;
  lastPlayedAt: number;
  lastExitedAt: number;
  animation?: Animation;
};

function initializeMotion() {
  const chapters = [...document.querySelectorAll<HTMLElement>('.chapter')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const chapterVisibility = new Map<HTMLElement, boolean>();
  const chapterOrder = new Map<HTMLElement | null, number>();
  const items: RevealItem[] = [];
  let suspended = false;

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
    // These surfaces already belong to the gallery's independent 420ms effect.
    if (element.matches('.project-panel-motion, [data-project-panel]')) {
      element.dataset.revealState = 'visible';
      return;
    }
    const chapter = element.closest<HTMLElement>('.chapter');
    const order = chapterOrder.get(chapter) ?? 0;
    chapterOrder.set(chapter, order + 1);
    element.dataset.revealState = 'idle';
    items.push({ element, chapter, order, visible: false, readyToReveal: false, needsReveal: true, lastPlayedAt: -Infinity, lastExitedAt: -Infinity });
  });
  chapters.forEach(chapter => {
    chapterVisibility.set(chapter, false);
    chapter.dataset.motionActive = 'false';
  });

  if (typeof IntersectionObserver === 'undefined' || typeof Element.prototype.animate !== 'function') {
    items.forEach(item => { item.element.dataset.revealState = 'visible'; });
    return;
  }

  function cancelReveal(item: RevealItem, forceVisible = false) {
    if (item.animation) {
      item.animation.onfinish = null;
      item.animation.cancel();
      item.animation = undefined;
      forceVisible = true;
    }
    if (forceVisible) item.element.dataset.revealState = 'visible';
  }

  function chapterIsActive(chapter: HTMLElement | null) {
    if (suspended || document.hidden || reducedMotion.matches) return false;
    if (!chapter) return true;
    return Boolean(chapterVisibility.get(chapter)) &&
      (!document.body.classList.contains('is-paged') || chapter.classList.contains('is-active'));
  }

  function itemIsActive(item: RevealItem) {
    if (!chapterIsActive(item.chapter)) return false;
    // Overlaid panels share the same intersection geometry, even when hidden.
    // Only reveal the selected project; tab changes keep their own animation.
    const panel = item.element.closest<HTMLElement>('[data-project-panel]');
    return !panel?.closest('[data-project-gallery].is-enhanced') || panel.classList.contains('is-current');
  }

  function playReveal(item: RevealItem) {
    if (!item.needsReveal || !item.visible || !item.readyToReveal || !itemIsActive(item)) return;
    item.needsReveal = false;
    const now = performance.now();
    // Boundary jitter and a quick reversal should not repeatedly fade readable text.
    if (now - item.lastPlayedAt < 1200 || now - item.lastExitedAt < 280 || item.element.contains(document.activeElement)) {
      cancelReveal(item, true);
      return;
    }
    cancelReveal(item);
    item.lastPlayedAt = now;
    const requestedDelay = Number.parseFloat(item.element.dataset.revealDelay ?? '');
    const delay = Number.isFinite(requestedDelay) ? Math.max(0, Math.min(180, requestedDelay)) : Math.min(item.order * 45, 180);
    const direction = item.element.dataset.reveal;
    const horizontal = direction === 'left' || direction === 'right';
    const keyframes: Keyframe[] = [{ opacity: horizontal ? 0 : 0.22 }, { opacity: 1 }];
    // Interactive surfaces may opt into fade-only to keep native focus/hover
    // scroll geometry stable. Other wrappers preserve their existing transform.
    if (direction !== 'fade' && CSS.supports('translate', '0 1px') && getComputedStyle(item.element).translate === 'none') {
      // Individual translate composes with the gallery's parent transform.
      // Smaller offsets keep stacked phone content inside its reading surface.
      const distance = innerWidth <= 760 ? 40 : direction === 'left' ? 64 : 96;
      keyframes[0].translate = horizontal ? `${direction === 'left' ? -distance : distance}px 0` : '0 14px';
      keyframes[1].translate = '0 0';
    }
    const animation = item.element.animate(keyframes, {
      duration: horizontal ? 760 : 580,
      delay,
      easing: 'cubic-bezier(.2,.75,.2,1)',
      fill: 'backwards',
    });
    animation.id = 'chapter-reveal';
    item.animation = animation;
    item.element.dataset.revealState = 'running';
    animation.onfinish = () => {
      if (item.animation !== animation) return;
      animation.onfinish = null;
      animation.cancel();
      item.animation = undefined;
      item.element.dataset.revealState = 'visible';
    };
  }

  function syncMotion(allowReveals = true) {
    chapters.forEach(chapter => {
      const active = String(chapterIsActive(chapter));
      if (chapter.dataset.motionActive !== active) chapter.dataset.motionActive = active;
    });
    items.forEach(item => {
      if (!item.visible || !itemIsActive(item)) cancelReveal(item);
      else if (allowReveals) playReveal(item);
    });
  }

  function resetVisibleContent() {
    items.forEach(item => {
      cancelReveal(item, true);
      // Resume ambient motion, not a new fade on content already being read.
      item.needsReveal = !item.visible;
    });
  }

  function refreshVisibility() {
    chapters.forEach(chapter => {
      const bounds = chapter.getBoundingClientRect();
      chapterVisibility.set(chapter, bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth);
    });
    items.forEach(item => {
      const bounds = item.element.getBoundingClientRect();
      item.visible = bounds.height > 0 && bounds.width > 0 && bounds.bottom > 24 && bounds.top < innerHeight - 40 && bounds.right > 0 && bounds.left < innerWidth;
      item.readyToReveal = Math.min(bounds.bottom, innerHeight - 40) - Math.max(bounds.top, 24) >= Math.min(40, bounds.height);
    });
  }

  const chapterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      chapterVisibility.set(entry.target as HTMLElement, entry.isIntersecting && entry.intersectionRatio > 0);
    });
    syncMotion();
  }, { threshold: [0, 0.001] });
  chapters.forEach(chapter => chapterObserver.observe(chapter));

  const itemByElement = new Map(items.map(item => [item.element, item]));
  const revealObserver = new IntersectionObserver(entries => {
    const now = performance.now();
    entries.forEach(entry => {
      const item = itemByElement.get(entry.target as HTMLElement);
      if (!item) return;
      const visible = entry.isIntersecting && entry.intersectionRatio > 0;
      if (item.visible && !visible) {
        item.lastExitedAt = now;
        item.needsReveal = true;
        cancelReveal(item);
      }
      item.visible = visible;
      // Start only after enough of the element is inside the viewport for its
      // 14px entrance not to move it straight back across the observer boundary.
      item.readyToReveal = visible && entry.intersectionRect.height >= Math.min(40, entry.boundingClientRect.height);
    });
    syncMotion();
  }, { rootMargin: '-24px 0px -40px 0px', threshold: [0, 0.001, 0.15, 0.5, 1] });
  items.forEach(item => revealObserver.observe(item.element));

  // The pager already marks the intended active chapter. Observe that contract
  // rather than adding scroll listeners or changing its stable navigation code.
  const activeObserver = new MutationObserver(() => syncMotion());
  chapters.forEach(chapter => activeObserver.observe(chapter, { attributes: true, attributeFilter: ['class'] }));
  activeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  function cancelCurrentReveals() {
    items.forEach(item => cancelReveal(item));
  }
  document.addEventListener('personalweb:chapter-navigation', cancelCurrentReveals);
  document.addEventListener('personalweb:project-navigation', () => {
    items.filter(item => item.chapter?.id === 'projects').forEach(item => {
      item.needsReveal = false;
      cancelReveal(item, true);
    });
  });
  // Cancel before native focus computes visibility, so a 14px entrance cannot
  // make Tab scroll an otherwise fully visible rail beneath the fixed dock.
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') cancelCurrentReveals();
  }, { capture: true });
  document.addEventListener('pointerdown', cancelCurrentReveals, { capture: true, passive: true });
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element)) return;
    items.filter(item => item.element.contains(event.target as Element)).forEach(item => cancelReveal(item));
  });

  reducedMotion.addEventListener('change', () => {
    refreshVisibility();
    resetVisibleContent();
    syncMotion(false);
  });
  document.addEventListener('visibilitychange', () => {
    refreshVisibility();
    resetVisibleContent();
    syncMotion(false);
  });
  window.addEventListener('pagehide', () => {
    suspended = true;
    resetVisibleContent();
    syncMotion(false);
  });
  window.addEventListener('pageshow', event => {
    if (!suspended && !event.persisted) return;
    suspended = false;
    refreshVisibility();
    resetVisibleContent();
    syncMotion(false);
  });

  if (reducedMotion.matches) resetVisibleContent();
  syncMotion();
}

initializeMotion();
export {};
