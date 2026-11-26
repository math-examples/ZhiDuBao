window.App = window.App || {};
App.reader = (function () {
  function render(text) {
    const S = App.state;
    S.paragraphs = text.split(/\r?\n/); S.currentIndex = 0;
    App.elements.emptyState.style.display = 'none';
    App.elements.reader.innerHTML = '';
    S.paragraphs.forEach((p, i) => {
      const div = document.createElement('div'); div.className = 'paragraph';
      if (p === '') { div.style.height = '1em'; div.style.pointerEvents = 'none'; }
      else div.textContent = p;
      div.addEventListener('click', () => {
        if (S.longPressFired || !S.isPlaying || p === '') return;
        let target = i; while (target < S.paragraphs.length && S.paragraphs[target] === '') target++;
        S.runId++; App.speech.stopAll(); S.currentIndex = target; playFrom(target);
      });
      App.elements.reader.appendChild(div);
    });
    App.elements.reader.classList.add('active'); App.elements.readerControls.classList.add('active');
    App.longpress.setup(App.elements.reader, { onWord: handleWord });
  }

  function handleWord(result) {
    const textNode = result.node, text = textNode.textContent;
    const frag = document.createDocumentFragment();
    if (result.start > 0) frag.appendChild(document.createTextNode(text.substring(0, result.start)));
    const mark = document.createElement('mark'); mark.className = 'word-hl'; mark.textContent = text.substring(result.start, result.end); frag.appendChild(mark);
    if (result.end < text.length) frag.appendChild(document.createTextNode(text.substring(result.end)));
    textNode.parentNode.replaceChild(frag, textNode); App.state.wordHighlightMark = mark;
    App.speech.speakWord(result.word);
    App.ui.showWordLinks(result.word);
  }

  function highlight(index) {
    const paras = App.elements.reader.querySelectorAll('.paragraph');
    paras.forEach((p, i) => { p.classList.remove('active', 'spoken'); if (i < index) p.classList.add('spoken'); if (i === index) p.classList.add('active'); });
    if (paras[index]) { const t = paras[index]; App.elements.reader.scrollTop = t.offsetTop - App.elements.reader.offsetTop - (App.elements.reader.clientHeight / 2) + (t.offsetHeight / 2); }
  }

  function playFrom(index) {
    const S = App.state; if (!S.isPlaying) return;
    const myRun = ++S.runId; S.currentIndex = index;
    function next() {
      if (myRun !== S.runId) return;
      while (S.currentIndex < S.paragraphs.length && S.paragraphs[S.currentIndex] === '') S.currentIndex++;
      if (S.currentIndex >= S.paragraphs.length) { /* loop */ S.currentIndex = 0; setTimeout(next, 1200); return; }
      highlight(S.currentIndex);
      App.speech.speakParagraph(S.paragraphs[S.currentIndex],
        () => { if (myRun === S.runId) { S.currentIndex++; next(); } },
        e => { if (e.error !== 'interrupted' && e.error !== 'canceled' && myRun === S.runId) { S.isPlaying = false; App.ui.updatePlayBtns(); } }
      );
    }
    next();
  }

  function stop() { App.state.runId++; App.speech.stopAll(); }
  function clearWordHighlight() { /* same as before */ }
  function getTopVisibleIndex() { /* same as before */ }

  return { render, playFrom, stop, highlight, clearWordHighlight, getTopVisibleIndex };
})();