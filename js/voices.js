/* ===== js/voices.js ===== */
window.App = window.App || {};
App.voices = (function () {
  var synth = window.APP_CONFIG.synth;

  function normalizeLang(lang) { return (lang || '').toLowerCase().replace(/_/g, '-').replace(/\s.*$/, ''); }
  function getLangPrefix(lang) { return (lang || '').toLowerCase().split(/[-_]/)[0]; }
  function getBrowserLang() {
    var preferred = (navigator.languages || []).filter(Boolean);
    var raw = preferred[0] || navigator.language || navigator.userLanguage || 'en-US';
    return { full: normalizeLang(raw), prefix: getLangPrefix(raw) };
  }
  function findBestVoice(list, full, prefix) {
    var best = list.find(function (v) { return normalizeLang(v.lang) === full; });
    if (best) return best;
    best = list.find(function (v) { return getLangPrefix(v.lang) === prefix; });
    return best || null;
  }
  function loadVoices(timeout) {
    timeout = timeout || 3000;
    return new Promise(function (resolve) {
      var list = synth.getVoices();
      if (list.length) return resolve(list);
      var done = function () { list = synth.getVoices(); if (list.length) { synth.removeEventListener('voiceschanged', done); resolve(list); } };
      synth.addEventListener('voiceschanged', done);
      setTimeout(function () { resolve(synth.getVoices()); }, timeout);
    });
  }

  function fillVoiceList() {
    var S = App.state, sel = App.elements.voiceSelect;
    loadVoices().then(function (list) {
      S.voices = list;
      var prev = S.userSelectedVoiceRef ? list.find(function (v) { return v.name === S.userSelectedVoiceRef.name && v.lang === S.userSelectedVoiceRef.lang; }) : null;
      sel.innerHTML = '';
      if (!list.length) { sel.appendChild(new Option('No voices detected', '')); return; }
      list.forEach(function (v, i) { sel.appendChild(new Option(v.name + ' (' + v.lang + ')' + (v.localService ? '' : ' · Cloud'), i)); });
      if (!S.userHasPickedVoice && !S.autoSelectDone) {
        autoSelectVoice();
      } else if (prev) {
        var restoredIdx = list.indexOf(prev);
        if (restoredIdx >= 0) {
          sel.value = restoredIdx;
          App.ui.log('🔊 ' + prev.name + ' (' + prev.lang + ')');
        }
      }
    });
  }

  function autoSelectVoice() {
    var S = App.state;
    if (S.userHasPickedVoice || S.autoSelectDone || !S.voices.length) return;
    var bl = getBrowserLang();
    var best = findBestVoice(S.voices, bl.full, bl.prefix);
    if (best) {
      applyVoice(best);
    } else {
      S.autoSelectRetries++;
      if (S.autoSelectRetries < S.MAX_AUTO_RETRIES) {
        setTimeout(autoSelectVoice, Math.min(300 * S.autoSelectRetries, 2000));
      } else {
        var enVoice = S.voices.find(function (v) { return getLangPrefix(v.lang) === 'en'; }) || S.voices[0];
        if (enVoice) applyVoice(enVoice);
      }
    }
  }

  function applyVoice(v) {
    var S = App.state, sel = App.elements.voiceSelect;
    S.autoSelectDone = true;
    sel.value = S.voices.indexOf(v);
    S.userSelectedVoiceRef = { name: v.name, lang: v.lang };
    App.ui.log('🔊 ' + v.name + ' (' + v.lang + ')');
    filterToLang(v.lang);
  }

  function filterToLang(targetLang) {
    var S = App.state, sel = App.elements.voiceSelect;
    if (!targetLang || !S.voices.length) return;
    var prefix = getLangPrefix(targetLang);
    var matching = S.voices.filter(function (v) { return getLangPrefix(v.lang) === prefix; });
    if (matching.length <= 1) return;
    var currentVoice = S.voices[sel.value];
    sel.innerHTML = '';
    matching.forEach(function (v) { sel.appendChild(new Option(v.name + ' (' + v.lang + ')' + (v.localService ? '' : ' · Cloud'), S.voices.indexOf(v))); });
    if (currentVoice) {
      var stillThere = matching.find(function (v) { return v.name === currentVoice.name && v.lang === currentVoice.lang; });
      if (stillThere) {
        sel.value = S.voices.indexOf(currentVoice);
        App.ui.log('🔊 ' + currentVoice.name + ' (' + currentVoice.lang + ')');
      }
    }
  }

  function showAll() {
    var S = App.state, sel = App.elements.voiceSelect;
    var currentVoice = S.voices[sel.value];
    sel.innerHTML = '';
    S.voices.forEach(function (v, i) { sel.appendChild(new Option(v.name + ' (' + v.lang + ')' + (v.localService ? '' : ' · Cloud'), i)); });
    if (currentVoice) {
      var idx = S.voices.findIndex(function (v) { return v.name === currentVoice.name && v.lang === currentVoice.lang; });
      if (idx >= 0) sel.value = idx;
    }
  }

  return { fillVoiceList: fillVoiceList, autoSelectVoice: autoSelectVoice, filterToLang: filterToLang, showAll: showAll };
})();