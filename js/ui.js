/* ===== js/ui.js ===== */
window.App = window.App || {};
App.ui = (function () {
  // ─── cache elements ───
  App.elements = {
    logEl: document.getElementById('log'),
    logTextEl: document.querySelector('#log .log-text'),
    textEl: document.getElementById('text'),
    voiceSelect: document.getElementById('voiceSelect'),
    rateEl: document.getElementById('rate'),
    pitchEl: document.getElementById('pitch'),
    rateVal: document.getElementById('rateVal'),
    pitchVal: document.getElementById('pitchVal'),
    toggleBtn: document.getElementById('toggle'),
    toggleReaderBtn: document.getElementById('toggle-reader'),
    pasteBtn: document.getElementById('paste'),
    editToggleBtn: document.getElementById('edit-toggle'),
    backBtn: document.getElementById('back'),
    editor: document.getElementById('editor'),
    reader: document.getElementById('reader'),
    mainButtons: document.getElementById('main-buttons'),
    readerControls: document.getElementById('reader-controls'),
    editorControls: document.getElementById('editor-controls'),
    editorControls2: document.getElementById('editor-controls2'),
    showAllBtn: document.getElementById('showAllVoices'),
    aboutBtn: document.getElementById('about-btn'),
    aboutOverlay: document.getElementById('about-overlay'),
    aboutClose: document.getElementById('about-close'),
    emptyState: document.getElementById('empty-state'),
    fileInput: document.getElementById('fileInput'),
    fsBtn: document.getElementById('fs-toggle'),
    fsIconExpand: document.getElementById('fs-icon-expand'),
    fsIconClose: document.getElementById('fs-icon-close')
  };

  // ─── Logging (full impl) ───
  function log(msg) {
    const S = App.state;
    const logTextEl = App.elements.logTextEl;
    const logEl = App.elements.logEl;
    logTextEl.textContent = msg;
    if (msg) { logEl.classList.add('has-text'); }
    else { logEl.classList.remove('has-text'); }
    if (S.clearLogTimer) { clearTimeout(S.clearLogTimer); S.clearLogTimer = null; }
    if (msg && !msg.startsWith('🔊')) {
      S.clearLogTimer = setTimeout(function () { log(''); }, 3000);
    }
  }

  // ─── Bar show/hide (full impl) ───
  function showBar() {
    const S = App.state;
    if (!S.barVisible) {
      document.body.classList.remove('log-hidden');
      S.barVisible = true;
    }
    if (S.hideTimer) { clearTimeout(S.hideTimer); S.hideTimer = null; }
    if (App.fullscreen.isActive() && S.isPlaying) {
      S.hideTimer = setTimeout(function () {
        if (App.elements.logTextEl.textContent.startsWith('🔊')) return;
        document.body.classList.add('log-hidden');
        S.barVisible = false;
      }, 3000);
    }
  }

  function hideBar() {
    const S = App.state;
    S.lastScrollTop = App.elements.reader.scrollTop;
    if (App.elements.logTextEl.textContent.startsWith('🔊')) return;
    if (S.barVisible) {
      document.body.classList.add('log-hidden');
      S.barVisible = false;
    }
    if (S.hideTimer) { clearTimeout(S.hideTimer); S.hideTimer = null; }
  }

  // ─── Word dictionary links (full impl) ───
  function showWordLinks(word) {
    const logEl = App.elements.logEl;
    const fsBtn = App.elements.fsBtn;
    logEl.querySelectorAll('.word-link').forEach(function (el) { el.remove(); });
    log('🔊 ' + word);
    document.body.classList.remove('log-hidden');
    App.state.barVisible = true;
    var q = encodeURIComponent(word);
    var cambridgeWord = encodeURIComponent(word.trim().toLowerCase());
    var isSingleWord = /^[a-z]+$/i.test(word.trim());
    var linksData = [
      { icon: '🔍', label: 'Bing', url: 'https://cn.bing.com/dict/search?q=' + q },
      { icon: '🎓', label: 'Cambridge', url: isSingleWord ? 'https://dictionary.cambridge.org/dictionary/english/' + cambridgeWord : 'https://dictionary.cambridge.org/search/english/?q=' + cambridgeWord },
      { icon: '📖', label: '有道', url: 'https://dict.youdao.com/result?word=' + q + '&lang=en' }
    ];
    linksData.forEach(function (d) {
      var a = document.createElement('a');
      a.className = 'word-link'; a.href = d.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = d.label; a.innerHTML = d.icon + ' <span class="link-text">' + d.label + '</span>';
      logEl.insertBefore(a, fsBtn);
    });
  }

  // ─── Update play buttons (full impl) ───
  function updatePlayBtns() {
    var S = App.state;
    var toggleBtn = App.elements.toggleBtn;
    var toggleReaderBtn = App.elements.toggleReaderBtn;
    toggleBtn.textContent = S.isPlaying ? '■ Stop' : '▶ Read';
    toggleBtn.classList.toggle('stop-mode', S.isPlaying);
    toggleBtn.classList.toggle('secondary', !S.isPlaying);
    toggleReaderBtn.textContent = S.isPlaying ? '■ Stop' : '▶ Read';
    toggleReaderBtn.classList.toggle('stop-mode', S.isPlaying);
    toggleReaderBtn.classList.toggle('secondary', !S.isPlaying);
  }

  // ─── Background cycler ───
  function initBgCycler() {
    var i = parseInt(localStorage.getItem('bg-i') || '0');
    var btn = document.getElementById('bgCycle');
    function go(n) {
      var tn = n + 1;
      document.documentElement.style.setProperty('--bg', 'var(--theme-' + tn + '-bg)');
      document.body.style.color = 'var(--theme-' + tn + '-fg)';
      document.documentElement.style.colorScheme = (tn >= 3) ? 'dark' : 'light';
      var icons = ['☀️', '📖', '🌗', '🌙', '⚫'];
      btn.textContent = icons[n];
      localStorage.setItem('bg-i', n);
      document.documentElement.style.setProperty('--fs-btn-color', 'color-mix(in srgb, var(--theme-' + tn + '-fg) 78%, transparent)');
    }
    go(i);
    btn.addEventListener('click', function () { i = (i + 1) % 5; go(i); });
  }

  // ─── Copyright ───
  function initCopyright() {
    var startYear = 2026;
    var currentYear = new Date().getFullYear();
    var text = startYear === currentYear ? String(startYear) : startYear + '–' + currentYear;
    var aboutEl = document.getElementById('copyright-year-about');
    var footerEl = document.getElementById('copyright-year-footer');
    if (aboutEl) aboutEl.textContent = text;
    if (footerEl) footerEl.textContent = text;
  }

  // ─── Mode switch link ───
  function renderModeSwitchLink() {
    var el = document.getElementById('modeSwitchLink');
    if (!el) return;
    var url = new URL(window.location.href);
    url.searchParams.delete('href');
    var isFileMode = url.searchParams.get('file') === '1';
    if (isFileMode) {
      url.searchParams.delete('file');
      var paramsString = url.searchParams.toString();
      var clean = url.pathname + (paramsString ? '?' + paramsString : '');
      el.innerHTML = '<a href="' + clean + '" style="color:var(--primary);text-decoration:none;font-size:13px;opacity:0.8;">📋 改为粘贴文本</a>';
    } else {
      url.searchParams.set('file', '1');
      var paramsString2 = url.searchParams.toString();
      el.innerHTML = '<a href="' + url.pathname + (paramsString2 ? '?' + paramsString2 : '') + '" style="color:var(--primary);text-decoration:none;font-size:13px;opacity:0.8;">📁 从文件加载</a>';
    }
  }

  // ─── Load from href ───
  function loadFromHref() {
    var S = App.state;
    var href = S.urlParams.get('href');
    if (!href) return;
    log('Loading text from ' + href + ' …');
    fetch(href)
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (text) {
        App.reader.render(text);
        log('Loaded ' + text.length + ' chars. Long-press a word to hear it spoken.');
      })
      .catch(function (err) { log('Failed to load: ' + err.message); });
  }

  // ─── Enter/exit reader ───
  function enterReaderFromEditor() {
    var S = App.state;
    var text = App.elements.textEl.value;
    if (!text) { log('Please enter text to read'); return; }
    App.elements.editor.classList.add('hidden');
    App.elements.mainButtons.style.display = 'none';
    App.reader.render(text);
  }

  function exitToEditor() {
    var S = App.state;
    App.speech.stopAll();
    if (S.paragraphs.length > 0) { App.elements.textEl.value = S.paragraphs.join('\n'); }
    App.elements.editor.classList.remove('hidden');
    App.elements.mainButtons.style.display = 'flex';
    App.elements.reader.classList.remove('active');
    App.elements.readerControls.classList.remove('active');
    App.elements.editToggleBtn.classList.remove('active');
    if (S.isPlaying) App.reader.stop();
    log('');
    App.elements.logEl.querySelectorAll('.word-link').forEach(function (el) { el.remove(); });
    updatePlayBtns();
  }

  function exitHrefMode() {
    var S = App.state;
    App.speech.stopAll();
    App.elements.reader.classList.remove('active');
    App.elements.readerControls.classList.remove('active');
    App.elements.emptyState.style.display = 'block';
    if (S.isPlaying) App.reader.stop();
    log('');
    App.elements.logEl.querySelectorAll('.word-link').forEach(function (el) { el.remove(); });
  }

  // ─── Switch voice while playing ───
  function switchVoiceWhilePlaying() {
    var S = App.state;
    var savedIndex = S.currentIndex;
    S.runId++;
    App.speech.stopAll();
    setTimeout(function () {
      if (!S.isPlaying || S.runId === 0) return;
      S.currentIndex = savedIndex;
      App.reader.playFrom(savedIndex);
    }, 500);
  }

  // ─── MAIN INIT ───
  function init() {
    var S = App.state;

    // voice
    App.voices.fillVoiceList();
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = App.voices.fillVoiceList;
    }
    [500, 1000, 2000, 3000, 5000].forEach(function (delay, i, arr) {
      setTimeout(function () {
        if (!S.voices.length) App.voices.fillVoiceList();
        else if (!S.autoSelectDone) App.voices.autoSelectVoice();
        if (i === arr.length - 1 && !S.autoSelectDone) {
          setTimeout(function () { if (!S.autoSelectDone && S.voices.length) App.voices.autoSelectVoice(); }, 1000);
        }
      }, delay);
    });

    // fullscreen
    App.fullscreen.init();

    // sliders
    App.slider.setup(
      document.getElementById('rateTrack'), document.getElementById('rateFill'),
      document.getElementById('rateThumb'), document.getElementById('rateBubble'),
      document.getElementById('rateVal'), document.getElementById('rate'),
      function () { if (S.isPlaying) switchVoiceWhilePlaying(); }
    );
    App.slider.setup(
      document.getElementById('pitchTrack'), document.getElementById('pitchFill'),
      document.getElementById('pitchThumb'), document.getElementById('pitchBubble'),
      document.getElementById('pitchVal'), document.getElementById('pitch'),
      null
    );

    // voice select change
    App.elements.voiceSelect.addEventListener('change', function () {
      S.userHasPickedVoice = true; S.autoSelectDone = true;
      var v = S.voices[App.elements.voiceSelect.value];
      if (v) { S.userSelectedVoiceRef = { name: v.name, lang: v.lang }; log('🔊 ' + v.name + ' (' + v.lang + ')'); App.voices.filterToLang(v.lang); }
      if (S.isPlaying) switchVoiceWhilePlaying();
    });

    // show all voices
    App.elements.showAllBtn.addEventListener('click', function () { App.voices.showAll(); log('Showing all voices'); });

    // paste
    App.elements.pasteBtn.addEventListener('click', async function () {
      if (S.isFileMode()) { App.elements.fileInput.click(); return; }
      if (navigator.clipboard && window.isSecureContext) {
        try {
          var text = await navigator.clipboard.readText();
          if (text) {
            App.elements.textEl.value = text;
            if (!S.warmed) App.speech.warmUp();
            S.isPlaying = false; enterReaderFromEditor();
            log('Pasted ' + text.length + ' chars. Long-press a word to hear it spoken.');
          } else { log('Clipboard empty, please paste manually'); }
        } catch (e) { App.elements.textEl.focus(); log('Cannot read clipboard automatically, please long-press to paste'); }
      } else { App.elements.textEl.focus(); log('Auto-paste not supported, please long-press and select Paste'); }
    });

    // file input
    App.elements.fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.txt')) { log('Please select a .txt file'); App.elements.fileInput.value = ''; return; }
      var fr = new FileReader();
      fr.onload = function (ev) {
        var text = ev.target.result;
        if (!text) { log('File is empty'); App.elements.fileInput.value = ''; return; }
        App.elements.textEl.value = text;
        if (!S.warmed) App.speech.warmUp();
        S.isPlaying = false; enterReaderFromEditor();
        log('Loaded ' + text.length + ' chars from ' + file.name + '. Long-press a word to hear it spoken.');
        App.elements.fileInput.value = '';
      };
      fr.onerror = function () { log('Failed to read file'); App.elements.fileInput.value = ''; };
      fr.readAsText(file);
    });

    // edit toggle
    App.elements.editToggleBtn.addEventListener('click', exitToEditor);

    // toggle (main)
    App.elements.toggleBtn.addEventListener('click', function () {
      if (S.isPlaying) { App.reader.stop(); updatePlayBtns(); log('Stopped'); return; }
      App.speech.warmUp();
      enterReaderFromEditor();
      S.isPlaying = true; updatePlayBtns(); log('Reading…');
      App.reader.playFrom(S.currentIndex);
    });

    // toggle (reader)
    App.elements.toggleReaderBtn.addEventListener('click', function () {
      if (S.isPlaying) { App.reader.stop(); updatePlayBtns(); log('Stopped'); }
      else {
        if (S.isHrefMode() && !S.paragraphs.length) { loadFromHref(); return; }
        if (!S.paragraphs.length) { log('No text loaded.'); return; }
        App.speech.warmUp();
        S.currentIndex = App.reader.getTopVisibleIndex();
        S.isPlaying = true; updatePlayBtns(); log('Reading…');
        App.reader.playFrom(S.currentIndex);
      }
    });

    // back
    App.elements.backBtn.addEventListener('click', exitToEditor);

    // about
    App.elements.aboutBtn.addEventListener('click', function () { App.elements.aboutOverlay.classList.add('active'); });
    App.elements.aboutClose.addEventListener('click', function () { App.elements.aboutOverlay.classList.remove('active'); });
    App.elements.aboutOverlay.addEventListener('click', function (e) { if (e.target === App.elements.aboutOverlay) App.elements.aboutOverlay.classList.remove('active'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') App.elements.aboutOverlay.classList.remove('active'); });

    // visibility / focus
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.isPlaying) App.reader.stop(); });
    window.addEventListener('pagehide', function () { if (S.isPlaying) App.reader.stop(); });
    window.addEventListener('focus', function () { if (!S.isPlaying && window.speechSynthesis.speaking) window.speechSynthesis.cancel(); });

    // bg cycler
    initBgCycler();

    // copyright
    initCopyright();

    // mode switch link
    renderModeSwitchLink();

    // mode setup
    if (S.isHrefMode()) {
      App.elements.mainButtons.style.display = 'none'; App.elements.editor.classList.add('hidden');
      App.elements.emptyState.style.display = 'block'; App.elements.backBtn.style.display = 'none'; App.elements.editToggleBtn.style.display = 'none';
      log('Ready. Loading from href…'); loadFromHref();
    } else if (S.isFileMode()) {
      App.elements.pasteBtn.textContent = '📁 文件';
      App.elements.editToggleBtn.style.display = 'none';
    } else {
      App.elements.textEl.placeholder = 'Type or paste text here to read aloud…';
      log('Ready: paste text to read, or type and click Read.');
    }
  }

  return { init: init, log: log, showBar: showBar, hideBar: hideBar, showWordLinks: showWordLinks, updatePlayBtns: updatePlayBtns };
})();

window.initApp = function () { App.ui.init(); };