window.App = window.App || {};
App.longpress = (function () {
  function getWordAtPoint(element, x, y) {
    let range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    if (!range && document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); range.setEnd(p.offsetNode, p.offset); } }
    if (!range) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent, offset = range.startOffset;
    const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u0e00-\u0e7f]/.test(text[offset] || '');
    let start = offset, end = offset;
    if (isCJK) { end = offset + 1; }
    else {
      const wb = /[\s,.\-!?;:，。！？；：、()（）[\]【】""''""'']/;
      while (start > 0 && !wb.test(text[start - 1])) start--;
      while (end < text.length && !wb.test(text[end])) end++;
    }
    const word = text.substring(start, end).trim();
    return word ? { word, node, start, end } : null;
  }

  function setup(rootEl, callbacks) {
    const S = App.state;
    function clearLP() { if (S.longPressTimer) clearTimeout(S.longPressTimer); S.longPressFired = false; }
    function start(x, y, target) {
      clearLP(); S.longPressFired = false;
      App.speech.warmUp();
      S.longPressTimer = setTimeout(() => {
        S.longPressFired = true; window.getSelection().removeAllRanges();
        const r = getWordAtPoint(target, x, y);
        if (r && callbacks.onWord) callbacks.onWord(r);
      }, window.APP_CONFIG.longPressDelay);
    }
    rootEl.addEventListener('contextmenu', e => { if (e.target.closest('.paragraph')) e.preventDefault(); });
    rootEl.addEventListener('touchstart', e => { if (e.target.closest('.paragraph')) start(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: true });
    rootEl.addEventListener('touchmove', clearLP, { passive: true });
    rootEl.addEventListener('touchend', e => { if (S.longPressFired) e.preventDefault(); clearLP(); }, { passive: false });
    rootEl.addEventListener('touchcancel', clearLP, { passive: true });
    rootEl.addEventListener('mousedown', e => { if (e.target.closest('.paragraph')) start(e.clientX, e.clientY, e.target); });
    rootEl.addEventListener('mousemove', clearLP, { passive: true });
    rootEl.addEventListener('mouseup', e => { if (S.longPressFired) e.preventDefault(); clearLP(); }, { passive: false });
    rootEl.addEventListener('mouseleave', clearLP, { passive: true });
  }
  return { setup, getWordAtPoint };
})();