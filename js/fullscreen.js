window.App = window.App || {};
App.fullscreen = (function () {
  let active = false;
  function enter() {
    const S = App.state;
    S.fsEverClicked = true; active = true;
    document.body.classList.add('fs-mode'); document.body.style.overflow = 'hidden';
    App.elements.fsIconExpand.style.display = 'none'; App.elements.fsIconClose.style.display = 'block';
    document.body.classList.remove('log-hidden');
    requestAnimationFrame(() => { App.elements.reader.style.paddingTop = App.elements.logEl.offsetHeight + 'px'; });
    S.logResizeObserver = new ResizeObserver(() => { if (active) App.elements.reader.style.paddingTop = App.elements.logEl.offsetHeight + 'px'; });
    S.logResizeObserver.observe(App.elements.logEl);
  }
  function exit() {
    const S = App.state;
    document.body.classList.remove('fs-mode'); document.body.style.overflow = '';
    App.elements.fsIconExpand.style.display = 'block'; App.elements.fsIconClose.style.display = 'none';
    document.body.classList.remove('log-hidden');
    App.elements.reader.style.paddingTop = '';
    if (S.logResizeObserver) { S.logResizeObserver.disconnect(); S.logResizeObserver = null; }
    active = false;
  }
  function init() {
    App.elements.fsBtn.addEventListener('click', () => active ? exit() : enter());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && active) exit(); });
    // scroll show/hide
    App.elements.reader.addEventListener('scroll', () => {
      if (!active) return;
      const S = App.state, st = App.elements.reader.scrollTop;
      const max = App.elements.reader.scrollHeight - App.elements.reader.clientHeight;
      if (st <= 15 || st >= max - 15) App.ui.showBar();
      else if (st > S.lastScrollTop + 15) App.ui.hideBar();
      else if (st < S.lastScrollTop - 15) App.ui.showBar();
      S.lastScrollTop = st;
    }, { passive: true });
    // pinch zoom
    let initDist = null, initSize = 17;
    App.elements.reader.addEventListener('touchstart', e => {
      if (!active || e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      initDist = Math.sqrt(dx*dx + dy*dy);
      const sample = App.elements.reader.querySelector('.paragraph');
      if (sample) initSize = parseFloat(getComputedStyle(sample).fontSize);
    }, { passive: true });
    App.elements.reader.addEventListener('touchmove', e => {
      if (!active || e.touches.length !== 2 || !initDist) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      const scale = Math.sqrt(dx*dx + dy*dy) / initDist;
      let newSize = Math.max(8, initSize * scale);
      App.elements.reader.querySelectorAll('.paragraph').forEach(p => p.style.fontSize = newSize + 'px');
    }, { passive: false });
  }
  return { init, enter, exit, isActive: () => active };
})();