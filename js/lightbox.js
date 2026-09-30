// ─── Photo viewer (lightbox) ─────────────────────────────────────
// Tap a photo inside a report to see it full screen. Close with ✕, a tap on the
// dark background, Esc, or the phone's back button. Arrows / swipe / ← → move
// between the photos in that report.

(() => {
  const PHOTOS = '.prose figure img, .prose .gallery img';
  let list = [], index = 0, open = false, startX = null;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.innerHTML = `
    <button type="button" class="lb-close" aria-label="Close photo">✕</button>
    <button type="button" class="lb-prev" aria-label="Previous photo">‹</button>
    <figure class="lb-print">
      <img alt="">
      <figcaption><span class="lb-caption"></span><span class="lb-count"></span></figcaption>
    </figure>
    <button type="button" class="lb-next" aria-label="Next photo">›</button>`;
  document.body.appendChild(box);
  const img = box.querySelector('img'), caption = box.querySelector('.lb-caption'), count = box.querySelector('.lb-count');
  const prev = box.querySelector('.lb-prev'), next = box.querySelector('.lb-next'), close = box.querySelector('.lb-close');

  function captionFor(el) {
    const fig = el.closest('figure');
    return (fig && fig.querySelector('figcaption')?.textContent.trim()) || el.alt || '';
  }
  function show(i) {
    index = (i + list.length) % list.length;
    const el = list[index];
    img.src = el.currentSrc || el.src;
    img.alt = el.alt || captionFor(el);
    caption.textContent = captionFor(el);
    count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
    prev.hidden = next.hidden = list.length < 2;
  }
  function openAt(el) {
    list = [...document.querySelectorAll(PHOTOS)].filter(x => x.offsetParent);
    show(Math.max(0, list.indexOf(el)));
    box.hidden = false;
    open = true;
    document.documentElement.classList.add('lb-open');
    history.pushState({ lightbox: true }, '');   // so the back button closes the photo, not the report
    close.focus();
  }
  function shut(fromHistory) {
    if (!open) return;
    open = false;
    box.hidden = true;
    img.removeAttribute('src');
    document.documentElement.classList.remove('lb-open');
    if (!fromHistory && history.state?.lightbox) history.back();
    list[index]?.focus?.();
  }

  document.addEventListener('click', e => {
    const el = e.target.closest(PHOTOS);
    if (el && !open) { e.preventDefault(); openAt(el); }
  });
  // keyboard users: photos are focusable and open with Enter/Space
  document.addEventListener('keydown', e => {
    if (!open) {
      const el = e.target.closest?.(PHOTOS);
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openAt(el); }
      return;
    }
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'Tab') {   // keep focus inside the viewer
      const f = [...box.querySelectorAll('button:not([hidden])')];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  new MutationObserver(() => {
    document.querySelectorAll(PHOTOS).forEach(el => {
      if (el.tabIndex !== 0) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Open photo${el.alt ? ': ' + el.alt : ''}`); }
    });
  }).observe(document.body, { childList: true, subtree: true });

  close.addEventListener('click', () => shut());
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', e => { if (e.target === box) shut(); });
  window.addEventListener('popstate', () => shut(true));
  window.addEventListener('hashchange', () => shut(true));

  // swipe left/right between photos
  box.addEventListener('touchstart', e => { startX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (startX === null || list.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
