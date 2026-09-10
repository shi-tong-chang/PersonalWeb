const projectReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const projectHover = matchMedia('(hover: hover) and (pointer: fine)');

document.querySelectorAll<HTMLElement>('[data-project-gallery]').forEach(gallery => {
  const trackElement = gallery.querySelector<HTMLElement>('[data-project-track]');
  const tabs = [...gallery.querySelectorAll<HTMLAnchorElement>('[data-project-tab]')];
  const panels = [...gallery.querySelectorAll<HTMLElement>('[data-project-panel]')];
  const controls = [...gallery.querySelectorAll<HTMLButtonElement>('[data-project-scroll]')];
  if (!trackElement || !tabs.length || tabs.length !== panels.length) return;
  const track = trackElement;

  const chapter = gallery.closest<HTMLElement>('.chapter');
  const archive = gallery.closest<HTMLDetailsElement>('details');
  const current = gallery.querySelector<HTMLElement>('[data-project-current]');
  const status = gallery.querySelector<HTMLElement>('[data-project-status]');
  let selected = 0;
  let entrance: Animation | undefined;
  let hoverFrame = 0;
  let hoverDirection = 0;
  let hoverSpeed = 0;
  let hoverIntensity = 0.65;
  let previousFrame = 0;
  let visible = false;
  let openFrame = 0;
  let layoutFrame = 0;

  const maximumScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

  function stopHover() {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverDirection = 0;
    hoverSpeed = 0;
    previousFrame = 0;
  }

  function canHover() {
    return projectHover.matches && !projectReducedMotion.matches && visible &&
      !document.hidden && !chapter?.inert && (!archive || archive.open);
  }

  function updateEdges() {
    const maximum = maximumScroll();
    const left = Math.min(maximum, Math.max(0, track.scrollLeft));
    const canLeft = left > 1;
    const canRight = left < maximum - 1;
    gallery.dataset.canScrollLeft = String(canLeft);
    gallery.dataset.canScrollRight = String(canRight);
    gallery.style.setProperty('--rail-progress', String(maximum > 0 ? left / maximum : 0));
    controls.forEach(control => {
      const available = Number(control.dataset.projectScroll) < 0 ? canLeft : canRight;
      control.hidden = maximum <= 1;
      control.setAttribute('aria-disabled', String(!available));
      control.tabIndex = available ? 0 : -1;
    });
    if ((hoverDirection < 0 && !canLeft) || (hoverDirection > 0 && !canRight)) stopHover();
  }

  function keepTabVisible(index: number, instant = false) {
    // Closed details have no usable rail geometry. Restore the selection on open.
    if (!track.clientWidth) return;
    const trackBounds = track.getBoundingClientRect();
    const tabBounds = tabs[index].getBoundingClientRect();
    // Move only the horizontal rail: scrollIntoView would also move the chapter.
    const inset = Math.min(48, track.clientWidth / 6);
    const leftEdge = trackBounds.left + track.clientLeft + inset;
    const rightEdge = trackBounds.left + track.clientLeft + track.clientWidth - inset;
    let next = track.scrollLeft;
    if (tabBounds.left < leftEdge) next += tabBounds.left - leftEdge;
    else if (tabBounds.right > rightEdge) next += tabBounds.right - rightEdge;
    track.scrollTo({
      left: Math.min(maximumScroll(), Math.max(0, next)),
      behavior: instant || projectReducedMotion.matches ? 'instant' : 'smooth',
    });
  }

  function select(index: number, focus = false, animate = true) {
    if (index < 0 || index >= tabs.length) return;
    stopHover();
    const previous = selected;
    const changed = previous !== index;
    selected = index;
    // A fresh selection replaces the previous animation, never queues behind it.
    entrance?.cancel();
    entrance = undefined;
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.classList.toggle('is-current', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
      panel.tabIndex = active ? 0 : -1;
    });
    if (current) current.textContent = String(index + 1).padStart(2, '0');
    if (changed && status) {
      status.textContent = `第 ${index + 1} 件，共 ${panels.length} 件：${panels[index].dataset.projectTitle ?? ''}`;
    }
    if (focus) tabs[index].focus({ preventScroll: true });
    keepTabVisible(index, !animate);

    const motion = panels[index].querySelector<HTMLElement>('.project-panel-motion');
    if (changed && animate && !projectReducedMotion.matches && motion) {
      entrance = motion.animate([
        { opacity: 0, transform: `translate3d(${index > previous ? 18 : -18}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration: 420, easing: 'cubic-bezier(.2,.75,.2,1)' });
      entrance.onfinish = () => { entrance = undefined; };
    }
  }

  track.setAttribute('role', 'tablist');
  track.setAttribute('aria-orientation', 'horizontal');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      select(index);
    });
    tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        select(index);
        return;
      }
      const next: Record<string, number> = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in next)) return;
      event.preventDefault();
      event.stopPropagation();
      select(next[event.key], true);
    });
  });

  function hoverTick(now: number) {
    hoverFrame = 0;
    if (!hoverDirection || !canHover()) return stopHover();
    const elapsed = previousFrame ? Math.min(48, now - previousFrame) : 16;
    previousFrame = now;
    const targetSpeed = 160 + hoverIntensity * 360;
    hoverSpeed += (targetSpeed - hoverSpeed) * (1 - Math.exp(-elapsed / 130));
    track.scrollLeft += hoverDirection * hoverSpeed * elapsed / 1000;
    updateEdges();
    if (hoverDirection) hoverFrame = requestAnimationFrame(hoverTick);
  }

  controls.forEach(control => {
    const direction = Number(control.dataset.projectScroll) < 0 ? -1 : 1;
    const updateIntensity = (event: PointerEvent) => {
      const bounds = control.getBoundingClientRect();
      const position = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
      hoverIntensity = direction < 0 ? 1 - position : position;
    };
    control.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || control.getAttribute('aria-disabled') === 'true') return;
      const bounds = gallery.getBoundingClientRect();
      visible = bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
      if (!canHover()) return;
      stopHover();
      // Cancel an earlier button/keyboard smooth scroll before RAF takes ownership.
      track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
      updateIntensity(event);
      hoverDirection = direction;
      hoverFrame = requestAnimationFrame(hoverTick);
    });
    control.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse') updateIntensity(event);
    });
    control.addEventListener('pointerleave', stopHover);
    control.addEventListener('pointercancel', stopHover);
    control.addEventListener('click', () => {
      stopHover();
      if (control.getAttribute('aria-disabled') === 'true') return;
      const destination = track.scrollLeft + direction * Math.max(160, track.clientWidth * 0.55);
      track.scrollTo({
        left: Math.min(maximumScroll(), Math.max(0, destination)),
        behavior: projectReducedMotion.matches ? 'instant' : 'smooth',
      });
    });
  });

  track.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!horizontal && !event.shiftKey) return;
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    stopHover();
    if (maximumScroll() <= 1) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
    track.scrollTo({ left: track.scrollLeft + delta * unit, behavior: 'instant' });
  }, { passive: false });
  track.addEventListener('scroll', updateEdges, { passive: true });
  track.addEventListener('pointerdown', stopHover);

  let previousTrackWidth = 0;
  let previousTabWidth = 0;
  const resizeObserver = new ResizeObserver(() => {
    const trackWidth = track.clientWidth;
    const tabWidth = tabs[0].offsetWidth;
    if (trackWidth !== previousTrackWidth || tabWidth !== previousTabWidth) {
      previousTrackWidth = trackWidth;
      previousTabWidth = tabWidth;
      stopHover();
      // A desktop-to-phone resize must not strand the selected item offscreen.
      keepTabVisible(selected, true);
    }
    updateEdges();
  });
  resizeObserver.observe(track);
  tabs.forEach(tab => resizeObserver.observe(tab));
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
    if (!visible) stopHover();
  });
  visibilityObserver.observe(gallery);
  if (chapter) {
    new MutationObserver(() => { if (chapter.inert) stopHover(); })
      .observe(chapter, { attributes: true, attributeFilter: ['inert'] });
  }

  const stopMotion = () => {
    stopHover();
    cancelAnimationFrame(openFrame);
    cancelAnimationFrame(layoutFrame);
    openFrame = 0;
    layoutFrame = 0;
    entrance?.cancel();
    entrance = undefined;
    track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    updateEdges();
  };
  projectReducedMotion.addEventListener('change', stopMotion);
  projectHover.addEventListener('change', stopMotion);
  window.addEventListener('blur', stopHover);
  window.addEventListener('pagehide', stopMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });

  archive?.addEventListener('toggle', () => {
    if (!archive.open) return stopMotion();
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      if (!archive.open) return;
      keepTabVisible(selected, true);
      updateEdges();
    });
  });

  // Featured cards are ordinary archive links without JavaScript. Enhancement
  // opens the collection and takes keyboard users straight to the requested work.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
      event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>('a[data-project-open]') : null;
    if (!link) return;
    const index = tabs.findIndex(tab => tab.dataset.projectId === link.dataset.projectOpen);
    if (index < 0) return;
    event.preventDefault();
    if (archive) archive.open = true;
    cancelAnimationFrame(openFrame);
    openFrame = requestAnimationFrame(() => {
      openFrame = 0;
      if (archive && !archive.open) return;
      select(index, true, false);
      updateEdges();
      // Show the stage and rail together when they fit. On shorter screens the
      // focused tab must still be visible, rather than sitting below the fold.
      const topInset = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const galleryTop = gallery.getBoundingClientRect().top + scrollY;
      const tabBottom = tabs[index].getBoundingClientRect().bottom + scrollY;
      window.scrollTo({
        top: Math.max(0, galleryTop - topInset, tabBottom - innerHeight + 24),
        behavior: projectReducedMotion.matches ? 'instant' : 'smooth',
      });
    });
  });

  function restoreHashProject() {
    const index = panels.findIndex(panel => '#' + panel.id === location.hash);
    if (index < 0) return false;
    if (archive) archive.open = true;
    select(index, false, false);
    updateEdges();
    return true;
  }

  gallery.classList.add('is-enhanced');
  // A modified click can open a panel link in a new tab. Never hide that target
  // behind the first project when enhancing the browser's native fragment jump.
  if (!restoreHashProject()) select(0, false, false);
  window.addEventListener('hashchange', restoreHashProject);
  updateEdges();
});
