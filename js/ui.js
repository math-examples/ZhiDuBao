(function () {
  const $ = (s) => document.querySelector(s);
  const S = window.State;
  const synth = window.APP_CONFIG.synth;

  const logEl = $('#log');
  const logTextEl = logEl.querySelector('.log-text');
  const textEl = $('#text');
  const voiceSelect = $('#voiceSelect');
  const rateEl = $('#rate');
  const pitchEl = $('#pitch');
  const rateVal = $('#rateVal');
  const pitchVal = $('#pitchVal');
  const toggleBtn = $('#toggle');
  const toggleReaderBtn = $('#toggle-reader');
  const pasteBtn = $('#paste');
  const editToggleBtn = $('#edit-toggle');
  const backBtn = $('#back');
  const editor = $('#editor');
  const reader = $('#reader');
  const mainButtons = $('#main-buttons');
  const readerControls = $('#reader-controls');
  const editorControls = $('#editor-controls');
  const editorControls2 = $('#editor-controls2');
  const showAllBtn = $('#showAllVoices');
  const aboutBtn = $('#about-btn');
  const aboutOverlay = $('#about-overlay');
  const aboutClose = $('#about-close');
  const emptyState = $('#empty-state');
  const fileInput = $('#fileInput');
  const fsBtn = document.getElementById('fs-toggle');
  const fsIconExpand = document.getElementById('fs-icon-expand');
  const fsIconClose = document.getElementById('fs-icon-close');

  // ─── Logging ───
  function log(msg) {
    logTextEl.textContent = msg;
    if (msg) { logEl.classList.add('has-text'); }
    else { logEl.classList.remove('has-text'); }
    if (S.clearLogTimer) { clearTimeout(S.clearLogTimer); S.clearLogTimer = null; }
    if (msg && !msg.startsWith('🔊')) {
      S.clearLogTimer = setTimeout(() => { log(''); }, 3000);
    }
  }
  window.log = log;

  // ─── Voice Logic ───
  function loadVoices(timeout = 3000) {
    return new Promise((resolve) => {
      let list = synth.getVoices();
      if (list.length) return resolve(list);
      const done = () => { list = synth.getVoices(); if (list.length) { synth.removeEventListener('voiceschanged', done); resolve(list); } };
      synth.addEventListener('voiceschanged', done);
      setTimeout(() => resolve(synth.getVoices()), timeout);
    });
  }
  function normalizeLang(lang) { return (lang || '').toLowerCase().replace(/_/g, '-').replace(/\s.*$/, ''); }
  function getLangPrefix(lang) { return (lang || '').toLowerCase().split(/[-_]/)[0]; }
  function getBrowserLang() {
    const preferred = (navigator.languages || []).filter(Boolean);
    if (preferred.length > 0) { const raw = preferred[0]; return { full: normalizeLang(raw), prefix: getLangPrefix(raw) }; }
    const raw = navigator.language || navigator.userLanguage || 'en-US';
    return { full: normalizeLang(raw), prefix: getLangPrefix(raw) };
  }
  function findBestVoice(voiceList, targetFull, targetPrefix) {
    if (!voiceList.length) return null;
    let best = voiceList.find(v => normalizeLang(v.lang) === targetFull);
    if (best) return best;
    best = voiceList.find(v => getLangPrefix(v.lang) === targetPrefix);
    if (best) return best; return null;
  }

  window.autoSelectVoice = function () {
    if (S.userHasPickedVoice || S.autoSelectDone) return;
    if (!S.voices.length) return;
    const { full, prefix } = getBrowserLang();
    const best = findBestVoice(S.voices, full, prefix);
    if (best) {
      S.autoSelectDone = true; voiceSelect.value = S.voices.indexOf(best);
      S.userSelectedVoiceRef = { name: best.name, lang: best.lang };
      log('🔊 ' + best.name + ' (' + best.lang + ')');
      filterVoiceListToLang(best.lang);
    } else {
      S.autoSelectRetries++;
      if (S.autoSelectRetries < S.MAX_AUTO_RETRIES) { setTimeout(window.autoSelectVoice, Math.min(300 * S.autoSelectRetries, 2000)); }
      else {
        const enVoice = S.voices.find(v => getLangPrefix(v.lang) === 'en') || S.voices[0];
        if (enVoice) {
          S.autoSelectDone = true; voiceSelect.value = S.voices.indexOf(enVoice);
          S.userSelectedVoiceRef = { name: enVoice.name, lang: enVoice.lang };
          log('🔊 ' + enVoice.name + ' (' + enVoice.lang + ')');
          filterVoiceListToLang(enVoice.lang);
        }
      }
    }
  };

  window.fillVoiceList = function () {
    loadVoices().then((list) => {
      S.voices = list;
      const previouslySelectedVoice = S.userSelectedVoiceRef ? S.voices.find(v => v.name === S.userSelectedVoiceRef.name && v.lang === S.userSelectedVoiceRef.lang) : null;
      voiceSelect.innerHTML = '';
      if (!S.voices.length) { voiceSelect.appendChild(new Option('No voices detected', '')); return; }
      S.voices.forEach((v, i) => { voiceSelect.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, i)); });
      if (!S.userHasPickedVoice && !S.autoSelectDone) { window.autoSelectVoice(); }
      else if (previouslySelectedVoice) { const restoredIdx = S.voices.indexOf(previouslySelectedVoice); if (restoredIdx >= 0) { voiceSelect.value = restoredIdx; log('🔊 ' + previouslySelectedVoice.name + ' (' + previouslySelectedVoice.lang + ')'); } }
    });
  };

  function filterVoiceListToLang(targetLang) {
    if (!targetLang || !S.voices.length) return;
    const prefix = getLangPrefix(targetLang);
    const matching = S.voices.filter(v => getLangPrefix(v.lang) === prefix);
    if (matching.length <= 1) return;
    const currentVoice = S.voices[voiceSelect.value];
    voiceSelect.innerHTML = '';
    matching.forEach((v) => { voiceSelect.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, S.voices.indexOf(v))); });
    if (currentVoice) { const stillThere = matching.findIndex(v => v.name === currentVoice.name && v.lang === currentVoice.lang); if (stillThere >= 0) { voiceSelect.value = S.voices.indexOf(currentVoice); log('🔊 ' + currentVoice.name + ' (' + currentVoice.lang + ')'); } }
  }

  function showAllVoices() {
    if (!S.voices.length) return;
    const currentVoice = S.voices[voiceSelect.value];
    voiceSelect.innerHTML = '';
    S.voices.forEach((v, i) => { voiceSelect.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, i)); });
    if (currentVoice) { const idx = S.voices.findIndex(v => v.name === currentVoice.name && v.lang === currentVoice.lang); if (idx >= 0) { voiceSelect.value = idx; log('🔊 ' + currentVoice.name + ' (' + currentVoice.lang + ')'); } }
  }

  // ─── Long Press & Word Detection ───
  function clearLongPress() {
    if (S.longPressTimer) { clearTimeout(S.longPressTimer); S.longPressTimer = null; }
    S.longPressFired = false;
  }
  function clearWordHighlight() {
    if (S.wordHighlightMark && S.wordHighlightMark.parentNode) {
      const text = S.wordHighlightMark.textContent;
      const textNode = document.createTextNode(text);
      S.wordHighlightMark.parentNode.replaceChild(textNode, S.wordHighlightMark);
      S.wordHighlightMark = null;
    }
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }
  function stopWordSpeech() {
    if (S.wordUtterance) { synth.cancel(); S.wordUtterance = null; }
    clearWordHighlight();
  }

  window.speakWord = function (word) {
    stopWordSpeech(); clearLongPress();
    if (S.isPlaying) window.doStop();
    S.wordUtterance = new SpeechSynthesisUtterance(word);
    const voice = S.voices[voiceSelect.value];
    S.wordUtterance.lang = voice ? voice.lang : 'en-US';
    S.wordUtterance.rate = parseFloat(rateEl.value);
    S.wordUtterance.pitch = parseFloat(pitchEl.value);
    if (voice) S.wordUtterance.voice = voice;
    S.wordUtterance.onend = () => { clearWordHighlight(); S.wordUtterance = null; };
    S.wordUtterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      clearWordHighlight(); S.wordUtterance = null;
    };
    synth.speak(S.wordUtterance);
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    log('🔊 ' + word);
    document.body.classList.remove('log-hidden');
    S.barVisible = true;
    const q = encodeURIComponent(word);
    const cambridgeWord = encodeURIComponent(word.trim().toLowerCase());
    const isSingleWord = /^[a-z]+$/i.test(word.trim());
    const linksData = [
      { icon: '🔍', label: 'Bing', url: 'https://cn.bing.com/dict/search?q=' + q },
      { icon: '🎓', label: 'Cambridge', url: isSingleWord ? 'https://dictionary.cambridge.org/dictionary/english/' + cambridgeWord : 'https://dictionary.cambridge.org/search/english/?q=' + cambridgeWord },
      { icon: '📖', label: '有道', url: 'https://dict.youdao.com/result?word=' + q + '&lang=en' }
    ];
    linksData.forEach(d => {
      const a = document.createElement('a');
      a.className = 'word-link'; a.href = d.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = d.label; a.innerHTML = d.icon + ' <span class="link-text">' + d.label + '</span>';
      logEl.insertBefore(a, fsBtn);
    });
  };

  function getWordAtPoint(element, x, y) {
    let range;
    if (document.caretRangeFromPoint) { range = document.caretRangeFromPoint(x, y); }
    else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.setEnd(pos.offsetNode, pos.offset); }
    }
    if (!range) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent;
    let offset = range.startOffset;
    const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u0e00-\u0e7f]/.test(text[offset] || '');
    let start, end;
    if (isCJK) { start = offset; end = offset + 1; }
    else {
      const wordBoundaries = /[\s,.\-!?;:，。！？；：、()（）[\]【】""''""'']/;
      start = offset; end = offset;
      while (start > 0 && !wordBoundaries.test(text[start - 1])) start--;
      while (end < text.length && !wordBoundaries.test(text[end])) end++;
    }
    const word = text.substring(start, end).trim();
    if (!word || word.length < 1) return null;
    return { word, node, start, end };
  }

  function setupLongPress(el) {
    function startLongPress(x, y, target) {
      clearLongPress(); S.longPressFired = false;
      if (!S.warmed && S.isHrefMode && !S.fsEverClicked) {
        S.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10; w.pitch = 1;
        w.onend = () => { log('✅ 语音初始化完毕'); };
        w.onerror = (e) => { log('❌ 语音初始化失败 (' + e.error + ') — 请长按'); };
        synth.speak(w);
        return;
      }
      if (!S.warmed) {
        S.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10;
        synth.speak(w);
      }
      S.longPressTimer = setTimeout(() => {
        S.longPressFired = true; window.getSelection().removeAllRanges();
        const result = getWordAtPoint(target, x, y);
        if (result) {
          const textNode = result.node; const text = textNode.textContent;
          const before = text.substring(0, result.start); const word = text.substring(result.start, result.end); const after = text.substring(result.end);
          const parent = textNode.parentNode; const frag = document.createDocumentFragment();
          if (before) frag.appendChild(document.createTextNode(before));
          const mark = document.createElement('mark'); mark.className = 'word-hl'; mark.textContent = word; frag.appendChild(mark);
          if (after) frag.appendChild(document.createTextNode(after));
          parent.replaceChild(frag, textNode); S.wordHighlightMark = mark; window.speakWord(word);
        }
      }, window.APP_CONFIG.longPressDelay);
    }
    el.addEventListener('contextmenu', (e) => { if (e.target.closest('.paragraph')) { e.preventDefault(); return false; } });
    el.addEventListener('touchstart', (e) => { if (e.target.closest('.paragraph')) { const touch = e.touches[0]; startLongPress(touch.clientX, touch.clientY, e.target); } }, { passive: true });
    el.addEventListener('touchmove', () => { clearLongPress(); }, { passive: true });
    el.addEventListener('touchend', (e) => { if (S.longPressFired) { e.preventDefault(); } clearLongPress(); }, { passive: false });
    el.addEventListener('touchcancel', clearLongPress, { passive: true });
    el.addEventListener('mousedown', (e) => { if (e.target.closest('.paragraph')) { startLongPress(e.clientX, e.clientY, e.target); } });
    el.addEventListener('mousemove', clearLongPress, { passive: true });
    el.addEventListener('mouseup', (e) => { if (S.longPressFired) { e.preventDefault(); } clearLongPress(); }, { passive: false });
    el.addEventListener('mouseleave', clearLongPress, { passive: true });
  }

  // ─── Reader ───
  function getTopVisibleParagraphIndex() {
    const paras = reader.querySelectorAll('.paragraph');
    if (!paras.length) return 0;
    for (let i = 0; i < paras.length; i++) {
      const rect = paras[i].getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) return i;
    }
    for (let i = 0; i < paras.length; i++) {
      if (paras[i].getBoundingClientRect().bottom > 0) return i;
    }
    return 0;
  }

  window.renderReader = function (text) {
    S.paragraphs = text.split(/\r?\n/).map(l => l);
    S.currentIndex = 0;
    emptyState.style.display = 'none';
    reader.innerHTML = '';
    S.paragraphs.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'paragraph';
      if (p === '') {
        div.style.height = '1em'; div.style.padding = '0'; div.style.marginBottom = '0.3em'; div.style.pointerEvents = 'none';
      } else { div.textContent = p; }
      div.addEventListener('click', (e) => {
        if (S.longPressFired) return;
        if (!S.isPlaying) return;
        if (S.paragraphs[i] === '') return;
        S.runId++; synth.cancel();
        let target = i;
        while (target < S.paragraphs.length && S.paragraphs[target] === '') target++;
        if (target >= S.paragraphs.length) target = i;
        S.currentIndex = target; window.speakFrom(target);
        log('▶ From: ' + S.paragraphs[target].substring(0, 30) + '…');
      });
      reader.appendChild(div);
    });
    reader.classList.add('active');
    readerControls.classList.add('active');
    updateReaderToggleBtn();
    setupLongPress(reader);
  };

  function highlightParagraph(index) {
    const paras = reader.querySelectorAll('.paragraph');
    paras.forEach((p, i) => {
      p.classList.remove('active', 'spoken');
      if (i < index) p.classList.add('spoken');
      if (i === index) p.classList.add('active');
    });
    if (index < paras.length) {
      const target = paras[index];
      const scrollOffset = target.offsetTop - reader.offsetTop - (reader.clientHeight / 2) + (target.offsetHeight / 2);
      reader.scrollTop = Math.max(0, scrollOffset);
    }
  }

  window.speakFrom = function (index) {
    if (!S.isPlaying) return;
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    log('');
    const myRun = ++S.runId;
    S.currentIndex = index;
    function next() {
      if (myRun !== S.runId) return;
      while (S.currentIndex < S.paragraphs.length && S.paragraphs[S.currentIndex] === '') S.currentIndex++;
      if (S.currentIndex >= S.paragraphs.length) {
        reader.querySelectorAll('.paragraph').forEach(p => { p.classList.remove('active', 'spoken'); });
        S.currentIndex = 0; log('Repeating…'); S.speakTimer = setTimeout(next, 1200); return;
      }
      highlightParagraph(S.currentIndex);
      const u = new SpeechSynthesisUtterance(S.paragraphs[S.currentIndex]);
      const voice = S.voices[voiceSelect.value];
      u.lang = voice ? voice.lang : 'en-US';
      u.rate = parseFloat(rateEl.value); u.pitch = parseFloat(pitchEl.value);
      if (voice) u.voice = voice;
      u.onend = () => { if (myRun !== S.runId) return; S.currentIndex++; next(); };
      u.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        if (myRun !== S.runId) return;
        S.isPlaying = false; updateReaderToggleBtn(); log('Error: ' + e.error);
      };
      synth.speak(u);
    }
    next();
  };

  window.doStop = function () {
    S.runId++; synth.cancel();
    if (S.speakTimer) { clearTimeout(S.speakTimer); S.speakTimer = null; }
    S.isPlaying = false; updateReaderToggleBtn(); log('Stopped');
    log(''); logEl.querySelectorAll('.word-link').forEach(el => el.remove());
  };

  function switchVoiceWhilePlaying() {
    const savedIndex = S.currentIndex; S.runId++; synth.cancel();
    setTimeout(() => { if (!S.isPlaying || S.runId === 0) return; S.currentIndex = savedIndex; window.speakFrom(savedIndex); }, 500);
  }

  // ─── UI Updates ───
  function updateToggleBtn() {
    toggleBtn.textContent = S.isPlaying ? '■ Stop' : '▶ Read';
    toggleBtn.classList.toggle('stop-mode', S.isPlaying); toggleBtn.classList.toggle('secondary', !S.isPlaying);
  }
  function updateReaderToggleBtn() {
    toggleReaderBtn.textContent = S.isPlaying ? '■ Stop' : '▶ Read';
    toggleReaderBtn.classList.toggle('stop-mode', S.isPlaying); toggleReaderBtn.classList.toggle('secondary', !S.isPlaying);
  }

  function loadFromHref() {
    const href = S.urlParams.get('href');
    if (!href) return;
    log('Loading text from ' + href + ' …');
    fetch(href)
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(text => {
        window.renderReader(text);
        log('Loaded ' + text.length + ' chars. Long-press a word to hear it spoken.');
      })
      .catch(err => log('Failed to load: ' + err.message));
  }

  function enterReaderFromEditor() {
    const text = textEl.value;
    if (!text) { log('Please enter text to read'); return; }
    editor.classList.add('hidden');
    mainButtons.style.display = 'none';
    window.renderReader(text);
  }

  function exitToEditor() {
    stopWordSpeech();
    if (S.paragraphs.length > 0) { textEl.value = S.paragraphs.join('\n'); }
    editor.classList.remove('hidden');
    mainButtons.style.display = 'flex';
    reader.classList.remove('active');
    readerControls.classList.remove('active');
    editToggleBtn.classList.remove('active');
    if (S.isPlaying) window.doStop();
    log(''); logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    updateToggleBtn();
  }

  function exitHrefMode() {
    stopWordSpeech();
    reader.classList.remove('active');
    readerControls.classList.remove('active');
    emptyState.style.display = 'block';
    if (S.isPlaying) window.doStop();
    log(''); logEl.querySelectorAll('.word-link').forEach(el => el.remove());
  }

  // ─── Fullscreen ───
  let fsActive = false;
  function enterFullscreen() {
    S.fsEverClicked = true;
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
    fsIconExpand.style.display = 'none'; fsIconClose.style.display = 'block';
    fsBtn.title = 'Exit Fullscreen (Esc)'; fsActive = true;
    document.body.classList.remove('log-hidden');
    requestAnimationFrame(() => { reader.style.paddingTop = logEl.offsetHeight + 'px'; });
    S.logResizeObserver = new ResizeObserver(() => {
      if (fsActive) reader.style.paddingTop = logEl.offsetHeight + 'px';
    });
    S.logResizeObserver.observe(logEl);
  }
  function exitFullscreen() {
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    fsIconExpand.style.display = 'block'; fsIconClose.style.display = 'none';
    fsBtn.title = 'Toggle Fullscreen'; fsActive = false;
    document.body.classList.remove('log-hidden');
    reader.style.paddingTop = '';
    if (S.logResizeObserver) { S.logResizeObserver.disconnect(); S.logResizeObserver = null; }
  }
  fsBtn.addEventListener('click', () => { if (fsActive) exitFullscreen(); else enterFullscreen(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fsActive) exitFullscreen(); });

  // ─── Scroll hide/show bar ───
  function showBar() {
    if (!S.barVisible) { document.body.classList.remove('log-hidden'); S.barVisible = true; }
    if (S.hideTimer) { clearTimeout(S.hideTimer); S.hideTimer = null; }
    if (fsActive && S.isPlaying) {
      S.hideTimer = setTimeout(() => {
        if (logTextEl.textContent.startsWith('🔊')) return;
        document.body.classList.add('log-hidden'); S.barVisible = false;
      }, 3000);
    }
  }
  function hideBar() {
    S.lastScrollTop = reader.scrollTop;
    if (logTextEl.textContent.startsWith('🔊')) return;
    if (S.barVisible) { document.body.classList.add('log-hidden'); S.barVisible = false; }
    if (S.hideTimer) { clearTimeout(S.hideTimer); S.hideTimer = null; }
  }
  reader.addEventListener('scroll', () => {
    if (!fsActive) return;
    const st = reader.scrollTop;
    const maxScroll = reader.scrollHeight - reader.clientHeight;
    S.barVisible = !document.body.classList.contains('log-hidden');
    if (st <= 15 || st >= maxScroll - 15) { showBar(); S.lastScrollTop = st; return; }
    if (st > S.lastScrollTop + 15) hideBar();
    else if (st < S.lastScrollTop - 15) showBar();
    S.lastScrollTop = st;
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (!fsActive) return;
    if (e.target.closest('#log')) return;
    S.lastScrollTop = reader.scrollTop;
    S.barVisible = !document.body.classList.contains('log-hidden');
    if (S.isPlaying) showBar();
    else {
      if (S.barVisible) { document.body.classList.add('log-hidden'); S.barVisible = false; }
      else { document.body.classList.remove('log-hidden'); S.barVisible = true; }
    }
  });

  // ─── Pinch zoom ───
  let initialDistance = null; let initialFontSize = 17;
  reader.addEventListener('touchstart', (e) => {
    if (!fsActive) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
      const sample = reader.querySelector('.paragraph');
      if (sample) initialFontSize = parseFloat(getComputedStyle(sample).fontSize);
    }
  }, { passive: true });
  reader.addEventListener('touchmove', (e) => {
    if (!fsActive || e.touches.length !== 2 || !initialDistance) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scale = dist / initialDistance;
    let newSize = initialFontSize * scale;
    newSize = Math.max(8, newSize);
    reader.querySelectorAll('.paragraph').forEach(p => { p.style.fontSize = newSize + 'px'; });
  }, { passive: false });
  reader.addEventListener('touchend', () => { initialDistance = null; }, { passive: true });

  // ─── Copyright ───
  (function () {
    var startYear = 2026;
    var currentYear = new Date().getFullYear();
    var text = startYear === currentYear ? String(startYear) : startYear + '–' + currentYear;
    var aboutEl = document.getElementById('copyright-year-about');
    var footerEl = document.getElementById('copyright-year-footer');
    if (aboutEl) aboutEl.textContent = text;
    if (footerEl) footerEl.textContent = text;
  })();

  // ─── Mode Switch Link ───
  function renderModeSwitchLink() {
    const el = document.getElementById('modeSwitchLink');
    if (!el) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('href');
    const isFileMode = url.searchParams.get('file') === '1';
    if (isFileMode) {
      url.searchParams.delete('file');
      const paramsString = url.searchParams.toString();
      const clean = url.pathname + (paramsString ? '?' + paramsString : '');
      el.innerHTML = '<a href="' + clean + '" style="color:var(--primary);text-decoration:none;font-size:13px;opacity:0.8;">📋 改为粘贴文本</a>';
    } else {
      url.searchParams.set('file', '1');
      const paramsString = url.searchParams.toString();
      el.innerHTML = '<a href="' + url.pathname + (paramsString ? '?' + paramsString : '') + '" style="color:var(--primary);text-decoration:none;font-size:13px;opacity:0.8;">📁 从文件加载</a>';
    }
  }
  renderModeSwitchLink();

  // ─── About Overlay ───
  aboutBtn.addEventListener('click', () => { aboutOverlay.classList.add('active'); });
  aboutClose.addEventListener('click', () => { aboutOverlay.classList.remove('active'); });
  aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) aboutOverlay.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') aboutOverlay.classList.remove('active'); });

  // ─── Voice Init ───
  fillVoiceList();
  if (typeof synth.onvoiceschanged !== 'undefined') { synth.onvoiceschanged = fillVoiceList; }
  [500, 1000, 2000, 3000, 5000].forEach((delay, i, arr) => {
    setTimeout(() => {
      if (!S.voices.length) fillVoiceList();
      else if (!S.autoSelectDone) window.autoSelectVoice();
      if (i === arr.length - 1 && !S.autoSelectDone) setTimeout(() => { if (!S.autoSelectDone && S.voices.length) window.autoSelectVoice(); }, 1000);
    }, delay);
  });

  voiceSelect.addEventListener('change', () => {
    S.userHasPickedVoice = true; S.autoSelectDone = true;
    const v = S.voices[voiceSelect.value];
    if (v) { S.userSelectedVoiceRef = { name: v.name, lang: v.lang }; log('🔊 ' + v.name + ' (' + v.lang + ')'); filterVoiceListToLang(v.lang); }
    if (S.isPlaying) switchVoiceWhilePlaying();
  });
  showAllBtn.addEventListener('click', () => { showAllVoices(); log('Showing all voices'); });

  // ─── iOS Value Bubble Slider ───
  function setupBubbleSlider(trackEl, fillEl, thumbEl, bubbleEl, valEl, hiddenInput) {
    const min = parseFloat(hiddenInput.min);
    const max = parseFloat(hiddenInput.max);
    const step = parseFloat(hiddenInput.step);

    function pctFromVal(val) { return ((val - min) / (max - min)) * 100; }
    function valFromPct(pct) {
      const raw = min + (pct / 100) * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    }
    function update(val, showBubble) {
      const pct = pctFromVal(val);
      fillEl.style.width = pct + '%';
      thumbEl.style.left = pct + '%';
      hiddenInput.value = val.toFixed(1);
      valEl.textContent = parseFloat(val).toFixed(1);
      if (showBubble) {
        bubbleEl.textContent = parseFloat(val).toFixed(1) + '×';
        bubbleEl.classList.add('show');
        bubbleEl.style.left = 'calc(' + pct + '% + 0px)';
      }
    }

    update(parseFloat(hiddenInput.value), false);

    function handleDown(clientX) {
      thumbEl.classList.add('active');
      bubbleEl.classList.add('show');
      const rect = trackEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const val = valFromPct(pct);
      update(val, true);
      if (hiddenInput.id === 'rate' && S.isPlaying) switchVoiceWhilePlaying();
    }
    function handleMove(clientX) {
      if (!thumbEl.classList.contains('active')) return;
      const rect = trackEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const val = valFromPct(pct);
      update(val, true);
    }
    function handleUp() {
      thumbEl.classList.remove('active');
      bubbleEl.classList.remove('show');
    }

    trackEl.addEventListener('mousedown', (e) => { e.preventDefault(); handleDown(e.clientX); });
    document.addEventListener('mousemove', (e) => handleMove(e.clientX));
    document.addEventListener('mouseup', handleUp);
    trackEl.addEventListener('touchstart', (e) => { handleDown(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX), { passive: true });
    document.addEventListener('touchend', handleUp);
  }

  setupBubbleSlider(document.getElementById('rateTrack'), document.getElementById('rateFill'), document.getElementById('rateThumb'), document.getElementById('rateBubble'), document.getElementById('rateVal'), document.getElementById('rate'));
  setupBubbleSlider(document.getElementById('pitchTrack'), document.getElementById('pitchFill'), document.getElementById('pitchThumb'), document.getElementById('pitchBubble'), document.getElementById('pitchVal'), document.getElementById('pitch'));

  // ─── Mode Setup ───
  if (S.isHrefMode()) {
    mainButtons.style.display = 'none'; editor.classList.add('hidden');
    emptyState.style.display = 'block'; backBtn.style.display = 'none'; editToggleBtn.style.display = 'none';
  } else if (S.isFileMode()) {
    pasteBtn.textContent = '📁 文件';
    editToggleBtn.style.display = 'none';
  } else { textEl.placeholder = 'Type or paste text here to read aloud…'; }

  // ─── Event Listeners ───
  pasteBtn.addEventListener('click', async () => {
    if (S.isFileMode()) { fileInput.click(); return; }
    if (navigator.clipboard && window.isSecureContext) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          textEl.value = text;
          if (!S.warmed) { S.warmed = true; const w = new SpeechSynthesisUtterance(' '); w.volume = 0; w.rate = 10; synth.speak(w); }
          S.isPlaying = false; enterReaderFromEditor();
          log('Pasted ' + text.length + ' chars. Long-press a word to hear it spoken.');
        } else { log('Clipboard empty, please paste manually'); }
      } catch { textEl.focus(); log('Cannot read clipboard automatically, please long-press to paste'); }
    } else { textEl.focus(); log('Auto-paste not supported, please long-press and select Paste'); }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) { log('Please select a .txt file'); fileInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = (ev) => {
      const text = ev.target.result;
      if (!text) { log('File is empty'); fileInput.value = ''; return; }
      textEl.value = text;
      if (!S.warmed) { S.warmed = true; const w = new SpeechSynthesisUtterance(' '); w.volume = 0; w.rate = 10; synth.speak(w); }
      S.isPlaying = false; enterReaderFromEditor();
      log('Loaded ' + text.length + ' chars from ' + file.name + '. Long-press a word to hear it spoken.');
      fileInput.value = '';
    };
    fr.onerror = () => { log('Failed to read file'); fileInput.value = ''; };
    fr.readAsText(file);
  });

  editToggleBtn.addEventListener('click', () => { exitToEditor(); });

  toggleBtn.addEventListener('click', () => {
    if (S.isPlaying) { window.doStop(); return; }
    if (!S.warmed) { S.warmed = true; const w = new SpeechSynthesisUtterance(' '); w.volume = 0; w.rate = 10; synth.speak(w); }
    enterReaderFromEditor(); S.isPlaying = true; updateReaderToggleBtn(); log('Reading…'); window.speakFrom(S.currentIndex);
  });

  toggleReaderBtn.addEventListener('click', () => {
    if (S.isPlaying) { window.doStop(); }
    else {
      if (S.isHrefMode() && !S.paragraphs.length) { loadFromHref(); return; }
      if (!S.paragraphs.length) { log('No text loaded.'); return; }
      if (!S.warmed) { S.warmed = true; const w = new SpeechSynthesisUtterance(' '); w.volume = 0; w.rate = 10; synth.speak(w); }
      S.currentIndex = getTopVisibleParagraphIndex();
      S.isPlaying = true; updateReaderToggleBtn(); log('Reading…'); window.speakFrom(S.currentIndex);
    }
  });

  backBtn.addEventListener('click', exitToEditor);

  document.addEventListener('visibilitychange', () => { if (document.hidden && S.isPlaying) window.doStop(); });
  window.addEventListener('pagehide', () => { if (S.isPlaying) window.doStop(); });
  window.addEventListener('focus', () => { if (!S.isPlaying && synth.speaking) synth.cancel(); });

  if (S.isHrefMode()) { log('Ready. Loading from href…'); loadFromHref(); }
  else { log('Ready: paste text to read, or type and click Read.'); }

  // ─── Background Cycler ───
  (function () {
    let i = parseInt(localStorage.getItem('bg-i') || '0');
    const btn = document.getElementById('bgCycle');
    function go(n) {
      const tn = n + 1;
      document.documentElement.style.setProperty('--bg', 'var(--theme-' + tn + '-bg)');
      document.body.style.color = 'var(--theme-' + tn + '-fg)';
      document.documentElement.style.colorScheme = (tn >= 3) ? 'dark' : 'light';
      const icons = ['☀️', '📖', '🌗', '🌙', '⚫'];
      btn.textContent = icons[n];
      localStorage.setItem('bg-i', n);
      document.documentElement.style.setProperty('--fs-btn-color', 'color-mix(in srgb, var(--theme-' + tn + '-fg) 78%, transparent)');
    }
    go(i);
    btn.addEventListener('click', () => { i = (i + 1) % 5; go(i); });
  })();

  window.initApp = function () { /* hook for loader */ };
})();