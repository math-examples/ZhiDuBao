// ===== js/ui.js =====
import { State } from './state.js';
import { APP_CONFIG } from './config.js';
import { getSynth } from './speech.js';
import { setupBubbleSlider } from './slider.js';
import { initTheme } from './theme.js';
import {
  initVoices, setupVoiceSelectListener, setupShowAllVoicesListener,
  switchVoiceWhilePlaying
} from './voice.js';
import {
  initReader, speakFrom, doStop,
  enterReaderFromEditor, exitToEditor, loadFromHref,
  getTopVisibleParagraphIndex, updateReaderBtnState
} from './reader.js';
import { initGesture, setupLongPress } from './gesture.js';
import { initFullscreen, exitFullscreen, isFullscreen } from './fullscreen.js';

export async function initUI() {
  const $ = (s) => document.querySelector(s);
  const synth = getSynth();

  // ─── Cache ALL DOM elements ───
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

  // ─── Initialize all modules ───
  initReader(elements, log);
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

  initGesture(elements, log);
  initFullscreen(elements);
  setupLongPress(elements.reader);

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
      if (State.isHrefMode() && !State.paragraphs.length) { loadFromHref(); return; }
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
        } else { log('Clipboard empty, please paste manually'); }
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
  elements.aboutBtn.addEventListener('click', () => elements.aboutOverlay.classList.add('active'));
  elements.aboutClose.addEventListener('click', () => elements.aboutOverlay.classList.remove('active'));
  elements.aboutOverlay.addEventListener('click', (e) => {
    if (e.target === elements.aboutOverlay) elements.aboutOverlay.classList.remove('active');
  });

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
      if (isFullscreen()) exitFullscreen();
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