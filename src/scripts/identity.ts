const motion = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

for (const stage of document.querySelectorAll<HTMLElement>('[data-parallax]')) {
  let frame = 0;
  stage.addEventListener('pointermove', event => {
    if (!motion.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = stage.getBoundingClientRect();
      stage.style.setProperty('--pointer-x', `${((event.clientX - box.left) / box.width - 0.5) * 12}deg`);
      stage.style.setProperty('--pointer-y', `${((event.clientY - box.top) / box.height - 0.5) * -12}deg`);
    });
  });
  const reset = () => {
    cancelAnimationFrame(frame);
    stage.style.setProperty('--pointer-x', '0deg');
    stage.style.setProperty('--pointer-y', '0deg');
  };
  stage.addEventListener('pointerleave', reset);
  motion.addEventListener('change', reset);
}
