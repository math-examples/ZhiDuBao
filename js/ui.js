// ===== js/ui.js =====
import { State } from './state.js';
import { APP_CONFIG } from './config.js';
import { getSynth } from './speech.js';
import { setupBubbleSlider } from './slider.js';
import { initTheme } from './theme.js';
import {
  initVoices, setupVoiceSelectListener, setupShowAllVoicesListener,
  switchVoiceWhilePlaying, getCurrentVoice
} from './voice.js';
import {
  initReader, renderReader, speakFrom, doStop,
  enterReaderFromEditor, exitToEditor, loadFromHref,
  getTopVisibleParagraphIndex, updateReaderBtnState
} from './reader.js';
import { initGesture, setupLongPress } from './gesture.js';

export async function initUI() {
  const $ = (s) => document.querySelector(s);
  const synth = getSynth();

  // ─── Cache ALL DOM elements once ───
  const elements = {
    logEl: $('#log'),
    logTextEl: $('#log .log-text'),
    textEl: $('#text'),
    voiceSelect: $('#voiceSelect'),
    rateEl: $('#rate'),
    pitchEl: $('#pitch'),
    rateVal: $('#rateVal'),
    pitchVal: $('#pitchVal'),
    toggleBtn: $('#toggle'),
    toggleReaderBtn: $('#toggle-reader'),
    pasteBtn: $('#paste'),
    editToggleBtn: $('#edit-toggle'),
    backBtn: $('#back'),
    editor: $('#editor'),
    reader: $('#reader'),
    mainButtons: $('#main-buttons'),
    readerControls: $('#reader-controls'),
    showAllBtn: $('#showAllVoices'),
    aboutBtn: $('#about-btn'),
    aboutOverlay: $('#about-overlay'),
    aboutClose: $('#about-close'),
    emptyState: $('#empty-state'),
    fileInput: $('#fileInput'),
    fsBtn: document.getElementById('fs-toggle'),
    fsIconExpand: document.getElementById('fs-icon-expand'),
    fsIconClose: document.getElementById('fs-icon-close')
  };

  // ─── log() helper ───
  function log(msg) {
    const { logTextEl, logEl } = elements;
    logTextEl.textContent = msg;
    if (msg) logEl.classList.add('has-text');
    else logEl.classList.remove('has-text');
    if (State.clearLogTimer) { clearTimeout(State.clearLogTimer); State.clearLogTimer = null; }
    if (msg && !msg.startsWith('🔊')) {
      State.clearLogTimer = setTimeout(() => { log(''); }, 3000);
    }
  }

  // ─── Initialize modules ───
  initReader(elements, log);
  initGesture(elements, log);

  initTheme();

  const restartPlayback = () => {
    const savedIndex = State.currentIndex;
    State.runId++;
    synth.cancel();
    setTimeout(() => {
      if (!State.isPlaying || State.runId === 0) return;
      State.currentIndex = savedIndex;
      speakFrom(savedIndex);
    }, 500);
  };
  await initVoices(elements.voiceSelect, log, restartPlayback);
  setupVoiceSelectListener();
  setupShowAllVoicesListener(elements.showAllBtn);

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

  // ─── Toggle buttons ───
  elements.toggleBtn.addEventListener('click', () => {
    if (State.isPlaying) { doStop(); return; }
    if (!State.warmed) {
      State.warmed = true;
      const w = new SpeechSynthesisUtterance(' ');
      w.volume = 0; w.rate = 10; synth.speak(w);
    }
    enterReaderFromEditor();
    State.isPlaying = true;
    updateReaderBtnState();
    log('Reading…');
    speakFrom(State.currentIndex);
  });

  elements.toggleReaderBtn.addEventListener('click', () => {
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
        w.volume = 0; w.rate = 10; synth.speak(w);
      }
      State.currentIndex = getTopVisibleParagraphIndex();
      State.isPlaying = true;
      updateReaderBtnState();
      log('Reading…');
      speakFrom(State.currentIndex);
    }
  });

  elements.editToggleBtn.addEventListener('click', exitToEditor);
  elements.backBtn.addEventListener('click', exitToEditor);

  // ─── Paste / File ───
  elements.pasteBtn.addEventListener('click', async () => {
    if (State.isFileMode()) { elements.fileInput.click(); return; }
    if (navigator.clipboard && window.isSecureContext) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          elements.textEl.value = text;
          if (!State.warmed) {
            State.warmed = true;
            const w = new SpeechSynthesisUtterance(' ');
            w.volume = 0; w.rate = 10; synth.speak(w);
          }
          State.isPlaying = false;
          enterReaderFromEditor();
          log('Pasted ' + text.length + ' chars. Long-press a word to hear it spoken.');
        } else {
          log('Clipboard empty, please paste manually');
        }
      } catch {
        elements.textEl.focus();
        log('Cannot read clipboard automatically, please long-press to paste');
      }
    } else {
      elements.textEl.focus();
      log('Auto-paste not supported, please long-press and select Paste');
    }
  });

  elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      log('Please select a .txt file');
      elements.fileInput.value = '';
      return;
    }
    const fr = new FileReader();
    fr.onload = (ev) => {
      const text = ev.target.result;
      if (!text) { log('File is empty'); elements.fileInput.value = ''; return; }
      elements.textEl.value = text;
      if (!State.warmed) {
        State.warmed = true;
        const w = new SpeechSynthesisUtterance(' ');
        w.volume = 0; w.rate = 10; synth.speak(w);
      }
      State.isPlaying = false;
      enterReaderFromEditor();
      log('Loaded ' + text.length + ' chars from ' + file.name + '. Long-press a word to hear it spoken.');
      elements.fileInput.value = '';
    };
    fr.onerror = () => { log('Failed to read file'); elements.fileInput.value = ''; };
    fr.readAsText(file);
  });

  // ─── About overlay ───
  elements.aboutBtn.addEventListener('click', () => { elements.aboutOverlay.classList.add('active'); });
  elements.aboutClose.addEventListener('click', () => { elements.aboutOverlay.classList.remove('active'); });
  elements.aboutOverlay.addEventListener('click', (e) => {
    if (e.target === elements.aboutOverlay) elements.aboutOverlay.classList.remove('active');
  });

  // ─── Fullscreen ───
  let fsActive = false;

  function enterFullscreen() {
    State.fsEverClicked = true;
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
    elements.fsIconExpand.style.display = 'none';
    elements.fsIconClose.style.display = 'block';
    elements.fsBtn.title = 'Exit Fullscreen (Esc)';
    fsActive = true;
    document.body.classList.remove('log-hidden');
    requestAnimationFrame(() => {
      elements.reader.style.paddingTop = elements.logEl.offsetHeight + 'px';
    });
    State.logResizeObserver = new ResizeObserver(() => {
      if (fsActive) elements.reader.style.paddingTop = elements.logEl.offsetHeight + 'px';
    });
    State.logResizeObserver.observe(elements.logEl);
  }

  function exitFullscreen() {
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    elements.fsIconExpand.style.display = 'block';
    elements.fsIconClose.style.display = 'none';
    elements.fsBtn.title = 'Toggle Fullscreen';
    fsActive = false;
    document.body.classList.remove('log-hidden');
    elements.reader.style.paddingTop = '';
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
        if (elements.logTextEl.textContent.startsWith('🔊')) return;
        document.body.classList.add('log-hidden');
        State.barVisible = false;
      }, 3000);
    }
  }

  function hideBar() {
    State.lastScrollTop = elements.reader.scrollTop;
    if (elements.logTextEl.textContent.startsWith('🔊')) return;
    if (State.barVisible) {
      document.body.classList.add('log-hidden');
      State.barVisible = false;
    }
    if (State.hideTimer) { clearTimeout(State.hideTimer); State.hideTimer = null; }
  }

  elements.reader.addEventListener('scroll', () => {
    if (!fsActive) return;
    const st = elements.reader.scrollTop;
    const maxScroll = elements.reader.scrollHeight - elements.reader.clientHeight;
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
    State.lastScrollTop = elements.reader.scrollTop;
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

  // Pinch-to-zoom
  let initialDistance = null;
  let initialFontSize = 17;
  elements.reader.addEventListener('touchstart', (e) => {
    if (!fsActive) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
      const sample = elements.reader.querySelector('.paragraph');
      if (sample) initialFontSize = parseFloat(getComputedStyle(sample).fontSize);
    }
  }, { passive: true });
  elements.reader.addEventListener('touchmove', (e) => {
    if (!fsActive || e.touches.length !== 2 || !initialDistance) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scale = dist / initialDistance;
    let newSize = initialFontSize * scale;
    newSize = Math.max(8, newSize);
    elements.reader.querySelectorAll('.paragraph').forEach(p => {
      p.style.fontSize = newSize + 'px';
    });
  }, { passive: false });
  elements.reader.addEventListener('touchend', () => { initialDistance = null; }, { passive: true });

  elements.fsBtn.addEventListener('click', () => { if (fsActive) exitFullscreen(); else enterFullscreen(); });

  setupLongPress(elements.reader);

  // ─── Mode-based UI ───
  if (State.isHrefMode()) {
    if (elements.mainButtons) elements.mainButtons.style.display = 'none';
    if (elements.editor) elements.editor.classList.add('hidden');
    if (elements.emptyState) elements.emptyState.style.display = 'block';
    if (elements.backBtn) elements.backBtn.style.display = 'none';
    if (elements.editToggleBtn) elements.editToggleBtn.style.display = 'none';
    log('Ready. Loading from href…');
    loadFromHref();
  } else if (State.isFileMode()) {
    elements.pasteBtn.textContent = '📁 文件';
    if (elements.editToggleBtn) elements.editToggleBtn.style.display = 'none';
  } else {
    elements.textEl.placeholder = 'Type or paste text here to read aloud…';
    log('Ready: paste text to read, or type and click Read.');
  }

  // ─── Mode switch link ───
  (function renderModeSwitchLink() {
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
  })();

  // ─── Global keys ───
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      elements.aboutOverlay.classList.remove('active');
      if (fsActive) exitFullscreen();
    }
  });

  // ─── Visibility / lifecycle ───
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && State.isPlaying) doStop();
  });
  window.addEventListener('pagehide', () => { if (State.isPlaying) doStop(); });
  window.addEventListener('focus', () => {
    if (!State.isPlaying && synth.speaking) synth.cancel();
  });

  // ─── Copyright year ───
  (function () {
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    const text = startYear === currentYear ? String(startYear) : startYear + '–' + currentYear;
    const aboutEl = document.getElementById('copyright-year-about');
    const footerEl = document.getElementById('copyright-year-footer');
    if (aboutEl) aboutEl.textContent = text;
    if (footerEl) footerEl.textContent = text;
  })();
}