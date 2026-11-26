window.App = window.App || {};
App.speech = (function () {
  const synth = window.APP_CONFIG.synth;

  function stopAll() {
    synth.cancel();
    App.state.wordUtterance = null;
    App.reader.clearWordHighlight();
  }

  function warmUp() {
    const S = App.state;
    if (S.warmed) return;
    S.warmed = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.rate = 10; u.pitch = 1;
    synth.speak(u);
  }

  function getVoice() { return App.state.voices[App.elements.voiceSelect.value] || null; }

  function speakWord(word) {
    stopAll();
    const S = App.state;
    if (S.isPlaying) App.reader.stop();
    const voice = getVoice();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = parseFloat(App.elements.rateEl.value);
    u.pitch = parseFloat(App.elements.pitchEl.value);
    if (voice) u.voice = voice;
    u.onend = () => { App.reader.clearWordHighlight(); S.wordUtterance = null; };
    u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') { App.reader.clearWordHighlight(); S.wordUtterance = null; } };
    S.wordUtterance = u;
    synth.speak(u);
  }

  function speakParagraph(text, onEnd, onError) {
    const voice = getVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = parseFloat(App.elements.rateEl.value);
    u.pitch = parseFloat(App.elements.pitchEl.value);
    if (voice) u.voice = voice;
    u.onend = onEnd; u.onerror = onError;
    synth.speak(u);
  }

  function switchVoice(savedIndex) {
    const S = App.state;
    S.runId++; synth.cancel();
    setTimeout(() => { if (S.isPlaying) { S.currentIndex = savedIndex; App.reader.playFrom(savedIndex); } }, 500);
  }

  return { stopAll, warmUp, speakWord, speakParagraph, switchVoice };
})();