// An optional photo never leaves a broken image over the reserved portrait.
document.querySelectorAll<HTMLElement>('[data-portrait]').forEach(figure => {
  const image = figure.querySelector<HTMLImageElement>('[data-portrait-image]');
  const placeholder = figure.querySelector<HTMLElement>('.portrait-placeholder');
  if (!image) return;
  const showImage = () => {
    figure.dataset.portraitState = 'ready';
    image.hidden = false;
    placeholder?.setAttribute('aria-hidden', 'true');
  };
  const showPlaceholder = () => {
    figure.dataset.portraitState = 'error';
    image.hidden = true;
    placeholder?.removeAttribute('aria-hidden');
  };
  image.addEventListener('load', showImage);
  image.addEventListener('error', showPlaceholder);
  if (image.complete) {
    if (image.naturalWidth > 0) showImage();
    else showPlaceholder();
  }
});
