window.App = window.App || {};
App.slider = {
  setup(trackEl, fillEl, thumbEl, bubbleEl, valEl, hiddenInput, onChange) {
    const min = parseFloat(hiddenInput.min), max = parseFloat(hiddenInput.max), step = parseFloat(hiddenInput.step);
    function pct(v) { return ((v - min) / (max - min)) * 100; }
    function valFromPct(p) { return Math.max(min, Math.min(max, Math.round((min + (p/100)*(max-min)) / step) * step)); }
    function update(v, show) {
      const p = pct(v); fillEl.style.width = p+'%'; thumbEl.style.left = p+'%'; hiddenInput.value = v.toFixed(1); valEl.textContent = v.toFixed(1);
      if (show) { bubbleEl.textContent = v.toFixed(1)+'×'; bubbleEl.classList.add('show'); bubbleEl.style.left = `calc(${p}% + 0px)`; }
    }
    update(parseFloat(hiddenInput.value), false);
    let active = false;
    function down(x) { active = true; move(x); }
    function move(x) { if (!active) return; const rect = trackEl.getBoundingClientRect(); const v = valFromPct(Math.max(0, Math.min(100, (x - rect.left)/rect.width*100))); update(v, true); if (onChange) onChange(v); }
    function up() { active = false; thumbEl.classList.remove('active'); bubbleEl.classList.remove('show'); }
    trackEl.addEventListener('mousedown', e => { e.preventDefault(); down(e.clientX); });
    document.addEventListener('mousemove', e => move(e.clientX)); document.addEventListener('mouseup', up);
    trackEl.addEventListener('touchstart', e => down(e.touches[0].clientX), {passive:true});
    document.addEventListener('touchmove', e => move(e.touches[0].clientX), {passive:true});
    document.addEventListener('touchend', up);
  }
};