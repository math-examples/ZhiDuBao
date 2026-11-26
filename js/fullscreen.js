/* ===== js/fullscreen.js ===== */
window.App = window.App || {};
App.fullscreen = (function () {
  var active = false;

  function enter() {
    var S = App.state;
    S.fsEverClicked = true;
    active = true;
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
    App.elements.fsIconExpand.style.display = 'none';
    App.elements.fsIconClose.style.display = 'block';
    document.body.classList.remove('log-hidden');
    requestAnimationFrame(function () {
      App.elements.reader.style.paddingTop = App.elements.logEl.offsetHeight + 'px';
    });
    S.logResizeObserver = new ResizeObserver(function () {
      if (active) App.elements.reader.style.paddingTop = App.elements.logEl.offsetHeight + 'px';
    });
    S.logResizeObserver.observe(App.elements.logEl);
  }

  function exit() {
    var S = App.state;
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    App.elements.fsIconExpand.style.display = 'block';
    App.elements.fsIconClose.style.display = 'none';
    document.body.classList.remove('log-hidden');
    App.elements.reader.style.paddingTop = '';
    if (S.logResizeObserver) { S.logResizeObserver.disconnect(); S.logResizeObserver = null; }
    active = false;
  }

  function init() {
    App.elements.fsBtn.addEventListener('click', function () { active ? exit() : enter(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) exit(); });

    // scroll show/hide
    App.elements.reader.addEventListener('scroll', function () {
      if (!active) return;
      var S = App.state;
      var st = App.elements.reader.scrollTop;
      var max = App.elements.reader.scrollHeight - App.elements.reader.clientHeight;
      if (st <= 15 || st >= max - 15) {
        App.ui.showBar();
      } else if (st > S.lastScrollTop + 15) {
        App.ui.hideBar();
      } else if (st < S.lastScrollTop - 15) {
        App.ui.showBar();
      }
      S.lastScrollTop = st;
    }, { passive: true });

    // click to toggle bar
    document.addEventListener('click', function (e) {
      if (!active) return;
      if (e.target.closest('#log')) return;
      var S = App.state;
      S.lastScrollTop = App.elements.reader.scrollTop;
      S.barVisible = !document.body.classList.contains('log-hidden');
      if (S.isPlaying) App.ui.showBar();
      else {
        if (S.barVisible) { document.body.classList.add('log-hidden'); S.barVisible = false; }
        else { document.body.classList.remove('log-hidden'); S.barVisible = true; }
      }
    });

    // pinch zoom
    var initDist = null, initSize = 17;
    App.elements.reader.addEventListener('touchstart', function (e) {
      if (!active || e.touches.length !== 2) return;
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      initDist = Math.sqrt(dx * dx + dy * dy);
      var sample = App.elements.reader.querySelector('.paragraph');
      if (sample) initSize = parseFloat(getComputedStyle(sample).fontSize);
    }, { passive: true });

    App.elements.reader.addEventListener('touchmove', function (e) {
      if (!active || e.touches.length !== 2 || !initDist) return;
      e.preventDefault();
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var scale = Math.sqrt(dx * dx + dy * dy) / initDist;
      var newSize = Math.max(8, initSize * scale);
      App.elements.reader.querySelectorAll('.paragraph').forEach(function (p) { p.style.fontSize = newSize + 'px'; });
    }, { passive: false });

    App.elements.reader.addEventListener('touchend', function () { initDist = null; }, { passive: true });
  }

  return { init: init, enter: enter, exit: exit, isActive: function () { return active; } };
})();