window.App = window.App || {};
App.ui = (function () {
  // cache elements
  App.elements = {
    logEl: document.getElementById('log'), logTextEl: document.querySelector('#log .log-text'),
    textEl: document.getElementById('text'), voiceSelect: document.getElementById('voiceSelect'),
    rateEl: document.getElementById('rate'), pitchEl: document.getElementById('pitch'),
    rateVal: document.getElementById('rateVal'), pitchVal: document.getElementById('pitchVal'),
    toggleBtn: document.getElementById('toggle'), toggleReaderBtn: document.getElementById('toggle-reader'),
    pasteBtn: document.getElementById('paste'), editToggleBtn: document.getElementById('edit-toggle'),
    backBtn: document.getElementById('back'), editor: document.getElementById('editor'),
    reader: document.getElementById('reader'), mainButtons: document.getElementById('main-buttons'),
    readerControls: document.getElementById('reader-controls'), editorControls: document.getElementById('editor-controls'),
    editorControls2: document.getElementById('editor-controls2'), showAllBtn: document.getElementById('showAllVoices'),
    aboutBtn: document.getElementById('about-btn'), aboutOverlay: document.getElementById('about-overlay'),
    aboutClose: document.getElementById('about-close'), emptyState: document.getElementById('empty-state'),
    fileInput: document.getElementById('fileInput'), fsBtn: document.getElementById('fs-toggle'),
    fsIconExpand: document.getElementById('fs-icon-expand'), fsIconClose: document.getElementById('fs-icon-close')
  };

  function log(msg) { /* same as before */ }
  function showBar() { /* same */ }
  function hideBar() { /* same */ }
  function showWordLinks(word) { /* create Bing/Cambridge/Youdao links */ }
  function updatePlayBtns() { /* toggle stop-mode class */ }

  function init() {
    App.voices.fillVoiceList();
    App.fullscreen.init();
    App.slider.setup(/* rate */); App.slider.setup(/* pitch */);
    // wire all buttons, paste, file, toggle, etc. (same as original but calling App.reader.render / App.speech.warmUp)
    // background cycler, about overlay, copyright, mode switch link
  }
  return { init, log, showBar, hideBar, showWordLinks, updatePlayBtns };
})();
window.initApp = App.ui.init;