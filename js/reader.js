/* ===== js/reader.js ===== */
window.App = window.App || {};
App.reader = (function () {
  function render(text) {
    var S = App.state;
    S.paragraphs = text.split(/\r?\n/).map(function (l) { return l; });
    S.currentIndex = 0;
    App.elements.emptyState.style.display = 'none';
    App.elements.reader.innerHTML = '';
    S.paragraphs.forEach(function (p, i) {
      var div = document.createElement('div');
      div.className = 'paragraph';
      if (p === '') {
        div.style.height = '1em';
        div.style.padding = '0';
        div.style.marginBottom = '0.3em';
        div.style.pointerEvents = 'none';
      } else {
        div.textContent = p;
      }
      div.addEventListener('click', function (e) {
        if (S.longPressFired) return;
        if (!S.isPlaying) return;
        if (S.paragraphs[i] === '') return;
        var target = i;
        while (target < S.paragraphs.length && S.paragraphs[target] === '') target++;
        if (target >= S.paragraphs.length) target = i;
        S.runId++; App.speech.stopAll();
        S.currentIndex = target; playFrom(target);
        App.ui.log('▶ From: ' + S.paragraphs[target].substring(0, 30) + '…');
      });
      App.elements.reader.appendChild(div);
    });
    App.elements.reader.classList.add('active');
    App.elements.readerControls.classList.add('active');
    App.longpress.setup(App.elements.reader, { onWord: handleWord });
  }

  function handleWord(result) {
    var S = App.state;
    var textNode = result.node, text = textNode.textContent;
    var before = text.substring(0, result.start);
    var word = text.substring(result.start, result.end);
    var after = text.substring(result.end);
    var parent = textNode.parentNode;
    var frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    var mark = document.createElement('mark');
    mark.className = 'word-hl';
    mark.textContent = word;
    frag.appendChild(mark);
    if (after) frag.appendChild(document.createTextNode(after));
    parent.replaceChild(frag, textNode);
    S.wordHighlightMark = mark;
    App.speech.speakWord(word);
    App.ui.showWordLinks(word);
  }

  function highlight(index) {
    var paras = App.elements.reader.querySelectorAll('.paragraph');
    paras.forEach(function (p, i) {
      p.classList.remove('active', 'spoken');
      if (i < index) p.classList.add('spoken');
      if (i === index) p.classList.add('active');
    });
    if (index < paras.length) {
      var target = paras[index];
      var scrollOffset = target.offsetTop - App.elements.reader.offsetTop - (App.elements.reader.clientHeight / 2) + (target.offsetHeight / 2);
      App.elements.reader.scrollTop = Math.max(0, scrollOffset);
    }
  }

  function playFrom(index) {
    var S = App.state;
    if (!S.isPlaying) return;
    var myRun = ++S.runId;
    S.currentIndex = index;
    function next() {
      if (myRun !== S.runId) return;
      while (S.currentIndex < S.paragraphs.length && S.paragraphs[S.currentIndex] === '') S.currentIndex++;
      if (S.currentIndex >= S.paragraphs.length) {
        App.elements.reader.querySelectorAll('.paragraph').forEach(function (p) { p.classList.remove('active', 'spoken'); });
        S.currentIndex = 0;
        App.ui.log('Repeating…');
        if (S.speakTimer) clearTimeout(S.speakTimer);
        S.speakTimer = setTimeout(next, 1200);
        return;
      }
      highlight(S.currentIndex);
      App.speech.speakParagraph(
        S.paragraphs[S.currentIndex],
        function () { if (myRun === S.runId) { S.currentIndex++; next(); } },
        function (e) {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          if (myRun !== S.runId) return;
          S.isPlaying = false;
          App.ui.updatePlayBtns();
          App.ui.log('Error: ' + e.error);
        }
      );
    }
    next();
  }

  function stop() {
    var S = App.state;
    S.runId++;
    App.speech.stopAll();
    if (S.speakTimer) { clearTimeout(S.speakTimer); S.speakTimer = null; }
    S.isPlaying = false;
    App.ui.updatePlayBtns();
    App.ui.log('Stopped');
    App.ui.log('');
    App.elements.logEl.querySelectorAll('.word-link').forEach(function (el) { el.remove(); });
  }

  function clearWordHighlight() {
    var S = App.state;
    if (S.wordHighlightMark && S.wordHighlightMark.parentNode) {
      var text = S.wordHighlightMark.textContent;
      var textNode = document.createTextNode(text);
      S.wordHighlightMark.parentNode.replaceChild(textNode, S.wordHighlightMark);
      S.wordHighlightMark = null;
    }
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function getTopVisibleIndex() {
    var paras = App.elements.reader.querySelectorAll('.paragraph');
    if (!paras.length) return 0;
    for (var i = 0; i < paras.length; i++) {
      var rect = paras[i].getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) return i;
    }
    for (var j = 0; j < paras.length; j++) {
      if (paras[j].getBoundingClientRect().bottom > 0) return j;
    }
    return 0;
  }

  return { render: render, playFrom: playFrom, stop: stop, highlight: highlight, clearWordHighlight: clearWordHighlight, getTopVisibleIndex: getTopVisibleIndex };
})();