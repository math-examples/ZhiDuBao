import { State } from './state.js';
import { APP_CONFIG } from './config.js';
import { getSynth } from './speech.js';
import { setupBubbleSlider } from './slider.js';

export function initUI() {
  const $ = (s) => document.querySelector(s);
  const synth = getSynth();

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
  const showAllBtn = $('#showAllVoices');
  const aboutBtn = $('#about-btn');
  const aboutOverlay = $('#about-overlay');
  const aboutClose = $('#about-close');
  const emptyState = $('#empty-state');
  const fileInput = $('#fileInput');
  const fsBtn = document.getElementById('fs-toggle');
  const fsIconExpand = document.getElementById('fs-icon-expand');
  const fsIconClose = document.getElementById('fs-icon-close');

  function log(msg) {
    logTextEl.textContent = msg;
    if (msg) logEl.classList.add('has-text');
    else logEl.classList.remove('has-text');

    if (State.clearLogTimer) { clearTimeout(State.clearLogTimer); State.clearLogTimer = null; }
    if (msg && !msg.startsWith('🔊')) {
      State.clearLogTimer = setTimeout(() => { log(''); }, 3000);
    }
  }

  function normalizeLang(lang) {
    return (lang || '').toLowerCase().replace(/_/g, '-').replace(/\s.*$/, '');
  }

  function getLangPrefix(lang) {
    return (lang || '').toLowerCase().split(/[-_]/)[0];
  }

  function getBrowserLang() {
    const preferred = (navigator.languages || []).filter(Boolean);
    if (preferred.length > 0) {
      const raw = preferred[0];
      return { full: normalizeLang(raw), prefix: getLangPrefix(raw) };
    }
    const raw = navigator.language || navigator.userLanguage || 'en-US';
    return { full: normalizeLang(raw), prefix: getLangPrefix(raw) };
  }

  function findBestVoice(voiceList, targetFull, targetPrefix) {
    if (!voiceList.length) return null;
    let best = voiceList.find(v => normalizeLang(v.lang) === targetFull);
    if (best) return best;
    best = voiceList.find(v => getLangPrefix(v.lang) === targetPrefix);
    if (best) return best;
    return null;
  }

  async function loadVoices(timeout = 3000) {
    return new Promise((resolve) => {
      let list = synth.getVoices();
      if (list.length) return resolve(list);

      const done = () => {
        list = synth.getVoices();
        if (list.length) {
          synth.removeEventListener('voiceschanged', done);
          resolve(list);
        }
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(() => resolve(synth.getVoices()), timeout);
    });
  }

  async function fillVoiceList() {
    State.voices = await loadVoices();
    const previouslySelectedVoice = State.userSelectedVoiceRef
      ? State.voices.find(v => v.name === State.userSelectedVoiceRef.name && v.lang === State.userSelectedVoiceRef.lang)
      : null;

    voiceSelect.innerHTML = '';
    if (!State.voices.length) {
      voiceSelect.appendChild(new Option('No voices detected', ''));
      return;
    }

    State.voices.forEach((v, i) => {
      voiceSelect.appendChild(new Option(
        `${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`,
        i
      ));
    });

    if (!State.userHasPickedVoice && !State.autoSelectDone) {
      autoSelectVoice();
    } else if (previouslySelectedVoice) {
      const restoredIdx = State.voices.indexOf(previouslySelectedVoice);
      if (restoredIdx >= 0) {
        voiceSelect.value = restoredIdx;
        log('🔊 ' + previouslySelectedVoice.name + ' (' + previouslySelectedVoice.lang + ')');
      }
    }
  }

  function autoSelectVoice() {
    if (State.userHasPickedVoice || State.autoSelectDone) return;
    if (!State.voices.length) return;

    const { full, prefix } = getBrowserLang();
    const best = findBestVoice(State.voices, full, prefix);

    if (best) {
      State.autoSelectDone = true;
      voiceSelect.value = State.voices.indexOf(best);
      State.userSelectedVoiceRef = { name: best.name, lang: best.lang };
      log('🔊 ' + best.name + ' (' + best.lang + ')');
      filterVoiceListToLang(best.lang);
    } else {
      State.autoSelectRetries++;
      if (State.autoSelectRetries < State.MAX_AUTO_RETRIES) {
        setTimeout(autoSelectVoice, Math.min(300 * State.autoSelectRetries, 2000));
      } else {
        const enVoice = State.voices.find(v => getLangPrefix(v.lang) === 'en') || State.voices[0];
        if (enVoice) {
          State.autoSelectDone = true;
          voiceSelect.value = State.voices.indexOf(enVoice);
          State.userSelectedVoiceRef = { name: enVoice.name, lang: enVoice.lang };
          log('🔊 ' + enVoice.name + ' (' + enVoice.lang + ')');
          filterVoiceListToLang(enVoice.lang);
        }
      }
    }
  }

  function filterVoiceListToLang(targetLang) {
    if (!targetLang || !State.voices.length) return;
    const prefix = getLangPrefix(targetLang);
    const matching = State.voices.filter(v => getLangPrefix(v.lang) === prefix);
    if (matching.length <= 1) return;

    const currentVoice = State.voices[voiceSelect.value];
    voiceSelect.innerHTML = '';
    matching.forEach(v => {
      voiceSelect.appendChild(new Option(
        `${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`,
        State.voices.indexOf(v)
      ));
    });

    if (currentVoice) {
      const stillThere = matching.findIndex(v => v.name === currentVoice.name && v.lang === currentVoice.lang);
      if (stillThere >= 0) {
        voiceSelect.value = State.voices.indexOf(currentVoice);
        log('🔊 ' + currentVoice.name + ' (' + currentVoice.lang + ')');
      }
    }
  }

  function showAllVoices() {
    if (!State.voices.length) return;
    const currentVoice = State.voices[voiceSelect.value];
    voiceSelect.innerHTML = '';
    State.voices.forEach((v, i) => {
      voiceSelect.appendChild(new Option(
        `${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`,
        i
      ));
    });
    if (currentVoice) {
      const idx = State.voices.findIndex(v => v.name === currentVoice.name && v.lang === currentVoice.lang);
      if (idx >= 0) {
        voiceSelect.value = idx;
        log('🔊 ' + currentVoice.name + ' (' + currentVoice.lang + ')');
      }
    }
  }

  function switchVoiceWhilePlaying() {
    const savedIndex = State.currentIndex;
    State.runId++;
    synth.cancel();
    setTimeout(() => {
      if (!State.isPlaying || State.runId === 0) return;
      State.currentIndex = savedIndex;
      speakFrom(savedIndex);
    }, 500);
  }

  function updateToggleBtn() {
    toggleBtn.textContent = State.isPlaying ? '■ Stop' : '▶ Read';
    toggleBtn.classList.toggle('stop-mode', State.isPlaying);
    toggleBtn.classList.toggle('secondary', !State.isPlaying);
  }

  function updateReaderToggleBtn() {
    toggleReaderBtn.textContent = State.isPlaying ? '■ Stop' : '▶ Read';
    toggleReaderBtn.classList.toggle('stop-mode', State.isPlaying);
    toggleReaderBtn.classList.toggle('secondary', !State.isPlaying);
  }

  function doStop() {
    State.runId++;
    synth.cancel();
    if (State.speakTimer) { clearTimeout(State.speakTimer); State.speakTimer = null; }
    State.isPlaying = false;
    updateReaderToggleBtn();
    log('Stopped');
    log('');
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
  }

  function speakWord(word) {
    if (State.wordUtterance) { synth.cancel(); State.wordUtterance = null; }
    if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    State.longPressFired = false;

    if (State.wordHighlightMark && State.wordHighlightMark.parentNode) {
      const text = State.wordHighlightMark.textContent;
      const textNode = document.createTextNode(text);
      State.wordHighlightMark.parentNode.replaceChild(textNode, State.wordHighlightMark);
      State.wordHighlightMark = null;
    }

    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    if (State.isPlaying) doStop();

    State.wordUtterance = new SpeechSynthesisUtterance(word);
    const voice = State.voices[voiceSelect.value];
    State.wordUtterance.lang = voice ? voice.lang : 'en-US';
    State.wordUtterance.rate = parseFloat(rateEl.value);
    State.wordUtterance.pitch = parseFloat(pitchEl.value);
    if (voice) State.wordUtterance.voice = voice;

    State.wordUtterance.onend = () => {
      if (State.wordHighlightMark && State.wordHighlightMark.parentNode) {
        const text = State.wordHighlightMark.textContent;
        const textNode = document.createTextNode(text);
        State.wordHighlightMark.parentNode.replaceChild(textNode, State.wordHighlightMark);
        State.wordHighlightMark = null;
      }
      State.wordUtterance = null;
    };

    State.wordUtterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (State.wordHighlightMark && State.wordHighlightMark.parentNode) {
        const text = State.wordHighlightMark.textContent;
        const textNode = document.createTextNode(text);
        State.wordHighlightMark.parentNode.replaceChild(textNode, State.wordHighlightMark);
        State.wordHighlightMark = null;
      }
      State.wordUtterance = null;
    };

    synth.speak(State.wordUtterance);
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    log('🔊 ' + word);

    document.body.classList.remove('log-hidden');
    State.barVisible = true;

    const q = encodeURIComponent(word);
    const cambridgeWord = encodeURIComponent(word.trim().toLowerCase());
    const isSingleWord = /^[a-z]+$/i.test(word.trim());

    const linksData = [
      { icon: '🔍', label: 'Bing', url: 'https://cn.bing.com/dict/search?q=' + q },
      { icon: '🎓', label: 'Cambridge', url: isSingleWord
        ? 'https://dictionary.cambridge.org/dictionary/english/' + cambridgeWord
        : 'https://dictionary.cambridge.org/search/english/?q=' + cambridgeWord },
      { icon: '📖', label: '有道', url: 'https://dict.youdao.com/result?word=' + q + '&lang=en' }
    ];

    linksData.forEach(d => {
      const a = document.createElement('a');
      a.className = 'word-link';
      a.href = d.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = d.label;
      a.innerHTML = d.icon + ' <span class="link-text">' + d.label + '</span>';
      logEl.insertBefore(a, fsBtn);
    });
  }

  function getWordAtPoint(element, x, y) {
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
      }
    }
    if (!range) return null;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent;
    let offset = range.startOffset;
    const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u0e00-\u0e7f]/.test(text[offset] || '');

    let start, end;
    if (isCJK) {
      start = offset; end = offset + 1;
    } else {
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
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
      State.longPressFired = false;

      if (!State.warmed && State.isHrefMode && !State.fsEverClicked) {
        State.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10; w.pitch = 1;
        w.onend = () => { log('✅ 语音初始化完毕'); };
        w.onerror = (e) => { log('❌ 语音初始化失败 (' + e.error + ') — 请长按'); };
        synth.speak(w);
        return;
      }

      if (!State.warmed) {
        State.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10;
        synth.speak(w);
      }

      State.longPressTimer = setTimeout(() => {
        State.longPressFired = true;
        window.getSelection().removeAllRanges();

        const result = getWordAtPoint(target, x, y);
        if (result) {
          const textNode = result.node;
          const text = textNode.textContent;
          const before = text.substring(0, result.start);
          const word = text.substring(result.start, result.end);
          const after = text.substring(result.end);

          const parent = textNode.parentNode;
          const frag = document.createDocumentFragment();

          if (before) frag.appendChild(document.createTextNode(before));
          const mark = document.createElement('mark');
          mark.className = 'word-hl';
          mark.textContent = word;
          frag.appendChild(mark);
          if (after) frag.appendChild(document.createTextNode(after));

          parent.replaceChild(frag, textNode);
          State.wordHighlightMark = mark;
          speakWord(word);
        }
      }, APP_CONFIG.longPressDelay);
    }

    el.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.paragraph')) { e.preventDefault(); return false; }
    });

    el.addEventListener('touchstart', (e) => {
      if (e.target.closest('.paragraph')) {
        const touch = e.touches[0];
        startLongPress(touch.clientX, touch.clientY, e.target);
      }
    }, { passive: true });

    el.addEventListener('touchmove', () => {
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (State.longPressFired) e.preventDefault();
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: false });

    el.addEventListener('touchcancel', () => {
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: true });

    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.paragraph')) {
        startLongPress(e.clientX, e.clientY, e.target);
      }
    });

    el.addEventListener('mousemove', () => {
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: true });

    el.addEventListener('mouseup', (e) => {
      if (State.longPressFired) e.preventDefault();
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: false });

    el.addEventListener('mouseleave', () => {
      if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }
    }, { passive: true });
  }

  function renderReader(text) {
    State.paragraphs = text.split(/\r?\n/).map(l => l);
    State.currentIndex = 0;
    emptyState.style.display = 'none';
    reader.innerHTML = '';

    State.paragraphs.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'paragraph';
      if (p === '') {
        div.style.height = '1em';
        div.style.padding = '0';
        div.style.marginBottom = '0.3em';
        div.style.pointerEvents = 'none';
      } else {
        div.textContent = p;
      }

      div.addEventListener('click', (e) => {
        if (State.longPressFired) return;
        if (!State.isPlaying) return;
        if (State.paragraphs[i] === '') return;

        State.runId++;
        synth.cancel();

        let target = i;
        while (target < State.paragraphs.length && State.paragraphs[target] === '') target++;
        if (target >= State.paragraphs.length) target = i;

        State.currentIndex = target;
        speakFrom(target);
        log('▶ From: ' + State.paragraphs[target].substring(0, 30) + '…');
      });

      reader.appendChild(div);
    });

    reader.classList.add('active');
    readerControls.classList.add('active');
    updateReaderToggleBtn();
    setupLongPress(reader);
  }

  function highlightParagraph(index) {
    const paras = reader.querySelectorAll('.paragraph');
    paras.forEach((p, i) => {
      p.classList.remove('active', 'spoken');
      if (i < index) p.classList.add('spoken');
      if (i === index) p.classList.add('active');
    });

    if (index < paras.length) {
      const target = paras[index];
      const scrollOffset = target.offsetTop - reader.offsetTop -
        (reader.clientHeight / 2) + (target.offsetHeight / 2);
      reader.scrollTop = Math.max(0, scrollOffset);
    }
  }

  function speakFrom(index) {
    if (!State.isPlaying) return;

    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    log('');

    const myRun = ++State.runId;
    State.currentIndex = index;

    function next() {
      if (myRun !== State.runId) return;

      while (State.currentIndex < State.paragraphs.length && State.paragraphs[State.currentIndex] === '') {
        State.currentIndex++;
      }

      if (State.currentIndex >= State.paragraphs.length) {
        reader.querySelectorAll('.paragraph').forEach(p => {
          p.classList.remove('active', 'spoken');
        });
        State.currentIndex = 0;
        log('Repeating…');
        State.speakTimer = setTimeout(next, 1200);
        return;
      }

      highlightParagraph(State.currentIndex);

      const u = new SpeechSynthesisUtterance(State.paragraphs[State.currentIndex]);
      const voice = State.voices[voiceSelect.value];
      u.lang = voice ? voice.lang : 'en-US';
      u.rate = parseFloat(rateEl.value);
      u.pitch = parseFloat(pitchEl.value);
      if (voice) u.voice = voice;

      u.onend = () => {
        if (myRun !== State.runId) return;
        State.currentIndex++;
        next();
      };

      u.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        if (myRun !== State.runId) return;
        State.isPlaying = false;
        updateReaderToggleBtn();
        log('Error: ' + e.error);
      };

      synth.speak(u);
    }

    next();
  }

  function enterReaderFromEditor() {
    const text = textEl.value;
    if (!text) { log('Please enter text to read'); return; }
    editor.classList.add('hidden');
    mainButtons.style.display = 'none';
    renderReader(text);
  }

  function exitToEditor() {
    if (State.wordUtterance) { synth.cancel(); State.wordUtterance = null; }
    if (State.longPressTimer) { clearTimeout(State.longPressTimer); State.longPressTimer = null; }

    if (State.paragraphs.length > 0) {
      textEl.value = State.paragraphs.join('\n');
    }

    editor.classList.remove('hidden');
    mainButtons.style.display = 'flex';
    reader.classList.remove('active');
    readerControls.classList.remove('active');
    editToggleBtn.classList.remove('active');

    if (State.isPlaying) doStop();
    log('');
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
    updateToggleBtn();
  }

  function exitHrefMode() {
    if (State.wordUtterance) { synth.cancel(); State.wordUtterance = null; }
    reader.classList.remove('active');
    readerControls.classList.remove('active');
    emptyState.style.display = 'block';
    if (State.isPlaying) doStop();
    log('');
    logEl.querySelectorAll('.word-link').forEach(el => el.remove());
  }

  let fsActive = false;

  function enterFullscreen() {
    State.fsEverClicked = true;
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
    fsIconExpand.style.display = 'none';
    fsIconClose.style.display = 'block';
    fsBtn.title = 'Exit Fullscreen (Esc)';
    fsActive = true;
    document.body.classList.remove('log-hidden');

    requestAnimationFrame(() => {
      reader.style.paddingTop = logEl.offsetHeight + 'px';
    });

    State.logResizeObserver = new ResizeObserver(() => {
      if (fsActive) reader.style.paddingTop = logEl.offsetHeight + 'px';
    });
    State.logResizeObserver.observe(logEl);
  }

  function exitFullscreen() {
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    fsIconExpand.style.display = 'block';
    fsIconClose.style.display = 'none';
    fsBtn.title = 'Toggle Fullscreen';
    fsActive = false;
    document.body.classList.remove('log-hidden');
    reader.style.paddingTop = '';

    if (State.logResizeObserver) {
      State.logResizeObserver.disconnect();
      State.logResizeObserver = null;
    }
  }

  function showBar() {
    if (!State.barVisible) {
      document.body.classList.remove('log-hidden');
      State.barVisible = true;
    }
    if (State.hideTimer) { clearTimeout(State.hideTimer); State.hideTimer = null; }
    if (fsActive && State.isPlaying) {
      State.hideTimer = setTimeout(() => {
        if (logTextEl.textContent.startsWith('🔊')) return;
        document.body.classList.add('log-hidden');
        State.barVisible = false;
      }, 3000);
    }
  }

  function hideBar() {
    State.lastScrollTop = reader.scrollTop;
    if (logTextEl.textContent.startsWith('🔊')) return;
    if (State.barVisible) {
      document.body.classList.add('log-hidden');
      State.barVisible = false;
    }
    if (State.hideTimer) { clearTimeout(State.hideTimer); State.hideTimer = null; }
  }

  reader.addEventListener('scroll', () => {
    if (!fsActive) return;
    const st = reader.scrollTop;
    const maxScroll = reader.scrollHeight - reader.clientHeight;
    State.barVisible = !document.body.classList.contains('log-hidden');

    if (st <= 15 || st >= maxScroll - 15) {
      showBar();
      State.lastScrollTop = st;
      return;
    }

    if (st > State.lastScrollTop + 15) hideBar();
    else if (st < State.lastScrollTop - 15) showBar();

    State.lastScrollTop = st;
  }, { passive: true });

  document.addEventListener('click', (e) => {
    if (!fsActive) return;
    if (e.target.closest('#log')) return;
    State.lastScrollTop = reader.scrollTop;
    State.barVisible = !document.body.classList.contains('log-hidden');
    if (State.isPlaying) showBar();
    else {
      if (State.barVisible) {
        document.body.classList.add('log-hidden');
        State.barVisible = false;
      } else {
        document.body.classList.remove('log-hidden');
        State.barVisible = true;
      }
    }
  });

  let initialDistance = null;
  let initialFontSize = 17;

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
    reader.querySelectorAll('.paragraph').forEach(p => {
      p.style.fontSize = newSize + 'px';
    });
  }, { passive: false });

  reader.addEventListener('touchend', () => { initialDistance = null; }, { passive: true });

  (function () {
    var startYear = 2026;
    var currentYear = new Date().getFullYear();
    var text = startYear === currentYear ? String(startYear) : startYear + '–' + currentYear;
    var aboutEl = document.getElementById('copyright-year-about');
    var footerEl = document.getElementById('copyright-year-footer');
    if (aboutEl) aboutEl.textContent = text;
    if (footerEl) footerEl.textContent = text;
  })();

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

  aboutBtn.addEventListener('click', () => { aboutOverlay.classList.add('active'); });
  aboutClose.addEventListener('click', () => { aboutOverlay.classList.remove('active'); });
  aboutOverlay.addEventListener('click', (e) => {
    if (e.target === aboutOverlay) aboutOverlay.classList.remove('active');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      aboutOverlay.classList.remove('active');
      if (fsActive) exitFullscreen();
    }
  });

  fillVoiceList();
  if (typeof synth.onvoiceschanged !== 'undefined') {
    synth.onvoiceschanged = fillVoiceList;
  }

  [500, 1000, 2000, 3000, 5000].forEach((delay, i, arr) => {
    setTimeout(() => {
      if (!State.voices.length) fillVoiceList();
      else if (!State.autoSelectDone) autoSelectVoice();
      if (i === arr.length - 1 && !State.autoSelectDone) {
        setTimeout(() => {
          if (!State.autoSelectDone && State.voices.length) autoSelectVoice();
        }, 1000);
      }
    }, delay);
  });

  voiceSelect.addEventListener('change', () => {
    State.userHasPickedVoice = true;
    State.autoSelectDone = true;
    const v = State.voices[voiceSelect.value];
    if (v) {
      State.userSelectedVoiceRef = { name: v.name, lang: v.lang };
      log('🔊 ' + v.name + ' (' + v.lang + ')');
      filterVoiceListToLang(v.lang);
    }
    if (State.isPlaying) switchVoiceWhilePlaying();
  });

  showAllBtn.addEventListener('click', () => {
    showAllVoices();
    log('Showing all voices');
  });

  setupBubbleSlider(
    document.getElementById('rateTrack'),
    document.getElementById('rateFill'),
    document.getElementById('rateThumb'),
    document.getElementById('rateBubble'),
    document.getElementById('rateVal'),
    document.getElementById('rate'),
    switchVoiceWhilePlaying
  );

  setupBubbleSlider(
    document.getElementById('pitchTrack'),
    document.getElementById('pitchFill'),
    document.getElementById('pitchThumb'),
    document.getElementById('pitchBubble'),
    document.getElementById('pitchVal'),
    document.getElementById('pitch')
  );

  if (State.isHrefMode()) {
    mainButtons.style.display = 'none';
    editor.classList.add('hidden');
    emptyState.style.display = 'block';
    backBtn.style.display = 'none';
    editToggleBtn.style.display = 'none';
  } else if (State.isFileMode()) {
    pasteBtn.textContent = '📁 文件';
    editToggleBtn.style.display = 'none';
  } else {
    textEl.placeholder = 'Type or paste text here to read aloud…';
  }

  pasteBtn.addEventListener('click', async () => {
    if (State.isFileMode()) { fileInput.click(); return; }
    if (navigator.clipboard && window.isSecureContext) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          textEl.value = text;
          if (!State.warmed) {
            State.warmed = true;
            const w = new SpeechSynthesisUtterance(' ');
            w.volume = 0; w.rate = 10;
            synth.speak(w);
          }
          State.isPlaying = false;
          enterReaderFromEditor();
          log('Pasted ' + text.length + ' chars. Long-press a word to hear it spoken.');
        } else {
          log('Clipboard empty, please paste manually');
        }
      } catch {
        textEl.focus();
        log('Cannot read clipboard automatically, please long-press to paste');
      }
    } else {
      textEl.focus();
      log('Auto-paste not supported, please long-press and select Paste');
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      log('Please select a .txt file');
      fileInput.value = '';
      return;
    }

    const fr = new FileReader();
    fr.onload = (ev) => {
      const text = ev.target.result;
      if (!text) { log('File is empty'); fileInput.value = ''; return; }
      textEl.value = text;
      if (!State.warmed) {
        State.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10;
        synth.speak(w);
      }
      State.isPlaying = false;
      enterReaderFromEditor();
      log('Loaded ' + text.length + ' chars from ' + file.name + '. Long-press a word to hear it spoken.');
      fileInput.value = '';
    };

    fr.onerror = () => { log('Failed to read file'); fileInput.value = ''; };
    fr.readAsText(file);
  });

  editToggleBtn.addEventListener('click', () => { exitToEditor(); });

  toggleBtn.addEventListener('click', () => {
    if (State.isPlaying) { doStop(); return; }
    if (!State.warmed) {
      State.warmed = true;
      const w = new SpeechSynthesisUtterance(' ');
      w.volume = 0; w.rate = 10;
      synth.speak(w);
    }
    enterReaderFromEditor();
    State.isPlaying = true;
    updateReaderToggleBtn();
    log('Reading…');
    speakFrom(State.currentIndex);
  });

  toggleReaderBtn.addEventListener('click', () => {
    if (State.isPlaying) {
      doStop();
    } else {
      if (State.isHrefMode() && !State.paragraphs.length) {
        loadFromHref();
        return;
      }
      if (!State.paragraphs.length) { log('No text loaded.'); return; }
      if (!State.warmed) {
        State.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10;
        synth.speak(w);
      }
      State.currentIndex = getTopVisibleParagraphIndex();
      State.isPlaying = true;
      updateReaderToggleBtn();
      log('Reading…');
      speakFrom(State.currentIndex);
    }
  });

  function loadFromHref() {
    const href = State.urlParams.get('href');
    if (!href) return;
    log('Loading text from ' + href + ' …');
    fetch(href)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(text => {
        renderReader(text);
        log('Loaded ' + text.length + ' chars. Long-press a word to hear it spoken.');
      })
      .catch(err => log('Failed to load: ' + err.message));
  }

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

  backBtn.addEventListener('click', exitToEditor);
  fsBtn.addEventListener('click', () => { if (fsActive) exitFullscreen(); else enterFullscreen(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && State.isPlaying) doStop();
  });

  window.addEventListener('pagehide', () => { if (State.isPlaying) doStop(); });
  window.addEventListener('focus', () => {
    if (!State.isPlaying && synth.speaking) synth.cancel();
  });

  if (State.isHrefMode()) {
    log('Ready. Loading from href…');
    loadFromHref();
  } else {
    log('Ready: paste text to read, or type and click Read.');
  }

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
      document.documentElement.style.setProperty(
        '--fs-btn-color',
        'color-mix(in srgb, var(--theme-' + tn + '-fg) 78%, transparent)'
      );
    }

    go(i);
    btn.addEventListener('click', () => { i = (i + 1) % 5; go(i); });
  })();
}