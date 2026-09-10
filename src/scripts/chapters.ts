import Swiper from 'swiper';
import { A11y } from 'swiper/modules';
import 'swiper/css';

const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-chapter]')];
const media = matchMedia('(min-width: 900px) and (min-height: 700px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let swiper: Swiper | undefined;
let activeIndex = 0;
let observer: IntersectionObserver | undefined;
let pendingNavigation: { index: number; focus: boolean } | undefined;

// Longer copy, larger text and late-loading fonts must never be clipped to a slide.
function contentFitsViewport() {
  return sections.every(section => {
    const content = section.querySelector<HTMLElement>(':scope > .section-inner');
    if (!content) return false;
    const style = getComputedStyle(section);
    const requiredHeight = content.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    return requiredHeight <= innerHeight + 1;
  });
}

function hashIndex() {
  const index = sections.findIndex(section => `#${section.id}` === location.hash);
  return index < 0 ? 0 : index;
}

function update(index: number, writeHash = true) {
  activeIndex = index;
  const active = sections[index];
  document.body.dataset.theme = active.id;
  sections.forEach((section, i) => {
    section.classList.toggle('is-active', i === index);
    section.inert = Boolean(swiper) && i !== index;
  });
  links.forEach(link => {
    if (Number(link.dataset.chapter) === index) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#current-chapter')!.textContent = `0${index + 1}`;
  (document.querySelector('#progress-fill') as HTMLElement).style.width = `${((index + 1) / sections.length) * 100}%`;
  const next = document.querySelector<HTMLAnchorElement>('#next-chapter')!;
  next.href = `#${sections[(index + 1) % sections.length].id}`;
  document.querySelector('#next-label')!.textContent = index === sections.length - 1 ? '重展此卷' : '向下展卷';
  document.querySelector('#next-arrow')!.textContent = index === sections.length - 1 ? '↑' : '↓';
  if (writeHash && location.hash !== `#${active.id}`) history.replaceState(null, '', `#${active.id}`);
}

function goTo(index: number, focus = false) {
  if (index < 0 || index >= sections.length) return;
  if (swiper) {
    if (swiper.animating) {
      pendingNavigation = { index, focus };
      return;
    }
    swiper.slideTo(index);
    update(index);
  } else {
    sections[index].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  if (focus) sections[index].focus({ preventScroll: true });
}

function configure() {
  const paged = media.matches && contentFitsViewport();
  const index = swiper ? activeIndex : hashIndex();
  pendingNavigation = undefined;
  observer?.disconnect();
  swiper?.destroy(true, true);
  swiper = undefined;
  sections.forEach(section => { section.inert = false; });
  document.body.classList.toggle('is-paged', paged);
  if (paged) {
    window.scrollTo(0, 0);
    swiper = new Swiper('.chapters', {
      modules: [A11y],
      direction: 'vertical',
      slidesPerView: 1,
      initialSlide: index,
      speed: 650,
      allowTouchMove: false,
      preventInteractionOnTransition: true,
      a11y: { enabled: true, slideLabelMessage: '第 {{index}} 章，共 {{slidesLength}} 章' },
      on: { slideChange(instance) {
        const previous = sections[activeIndex];
        const shouldMoveFocus = previous.contains(document.activeElement);
        update(instance.activeIndex);
        if (shouldMoveFocus) sections[instance.activeIndex].focus({ preventScroll: true });
      }, transitionEnd() {
        if (!pendingNavigation) return;
        const next = pendingNavigation;
        pendingNavigation = undefined;
        goTo(next.index, next.focus);
      } },
    });
    update(index, false);
  } else {
    update(index, false);
    sections[index].scrollIntoView({ behavior: 'instant' });
    const intersections = new Map<Element, IntersectionObserverEntry>();
    observer = new IntersectionObserver(entries => {
      // A callback contains only changed entries, not every visible chapter.
      entries.forEach(entry => intersections.set(entry.target, entry));
      const visible = [...intersections.values()].filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) update(sections.indexOf(visible.target as HTMLElement));
    }, { rootMargin: '-20% 0px -35% 0px', threshold: [0, 0.2, 0.5] });
    sections.forEach(section => observer!.observe(section));
  }
}

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const index = sections.findIndex(section => `#${section.id}` === link.getAttribute('href'));
  if (index < 0) return;
  event.preventDefault();
  goTo(index, true);
});

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || !swiper || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if ((event.target as Element).closest('input, textarea, select, button, [contenteditable="true"]')) return;
  const directions: Record<string, number> = { ArrowDown: activeIndex + 1, PageDown: activeIndex + 1, ArrowUp: activeIndex - 1, PageUp: activeIndex - 1, Home: 0, End: sections.length - 1 };
  if (!(event.key in directions)) return;
  event.preventDefault();
  if (!swiper.animating) goTo(directions[event.key], true);
});

// Accumulate small trackpad deltas and consume only one transition per gesture.
let wheelTotal = 0;
let lastWheelAt = 0;
let wheelConsumed = false;
document.addEventListener('wheel', event => {
  if (event.defaultPrevented || !swiper || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastWheelAt > 180) {
    wheelTotal = 0;
    wheelConsumed = false;
  }
  lastWheelAt = now;
  if (swiper.animating || wheelConsumed) return;
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (Math.sign(delta) !== Math.sign(wheelTotal)) wheelTotal = 0;
  wheelTotal += delta;
  if (Math.abs(wheelTotal) < 45) return;
  wheelConsumed = true;
  goTo(activeIndex + Math.sign(wheelTotal));
}, { passive: false });

window.addEventListener('hashchange', () => goTo(hashIndex()));
media.addEventListener('change', configure);
configure();

let layoutFrame = 0;
function checkLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    if ((media.matches && contentFitsViewport()) !== Boolean(swiper)) configure();
  });
}
const contentObserver = new ResizeObserver(checkLayout);
sections.forEach(section => {
  const content = section.querySelector<HTMLElement>(':scope > .section-inner');
  if (content) contentObserver.observe(content);
});
window.addEventListener('resize', checkLayout);

document.querySelector<HTMLButtonElement>('#copy-email')?.addEventListener('click', async event => {
  const button = event.currentTarget as HTMLButtonElement;
  const status = document.querySelector('#copy-status')!;
  try {
    await navigator.clipboard.writeText(button.dataset.email!);
    status.textContent = 'Email 已複製';
  } catch {
    status.textContent = '無法自動複製，請選取上方 Email 複製。';
  }
});
