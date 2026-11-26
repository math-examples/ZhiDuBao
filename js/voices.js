window.App = window.App || {};
App.voices = (function () {
  const synth = window.APP_CONFIG.synth;

  function normalizeLang(lang) { return (lang || '').toLowerCase().replace(/_/g, '-').replace(/\s.*$/, ''); }
  function getLangPrefix(lang) { return (lang || '').toLowerCase().split(/[-_]/)[0]; }
  function getBrowserLang() {
    const preferred = (navigator.languages || []).filter(Boolean);
    const raw = preferred[0] || navigator.language || navigator.userLanguage || 'en-US';
    return { full: normalizeLang(raw), prefix: getLangPrefix(raw) };
  }
  function findBestVoice(list, full, prefix) {
    return list.find(v => normalizeLang(v.lang) === full) || list.find(v => getLangPrefix(v.lang) === prefix) || null;
  }

  function loadVoices(timeout = 3000) {
    return new Promise(resolve => {
      let list = synth.getVoices();
      if (list.length) return resolve(list);
      const done = () => { list = synth.getVoices(); if (list.length) { synth.removeEventListener('voiceschanged', done); resolve(list); } };
      synth.addEventListener('voiceschanged', done);
      setTimeout(() => resolve(synth.getVoices()), timeout);
    });
  }

  function fillVoiceList() {
    const S = App.state, sel = App.elements.voiceSelect;
    loadVoices().then(list => {
      S.voices = list;
      const prev = S.userSelectedVoiceRef ? list.find(v => v.name === S.userSelectedVoiceRef.name && v.lang === S.userSelectedVoiceRef.lang) : null;
      sel.innerHTML = '';
      if (!list.length) { sel.appendChild(new Option('No voices detected', '')); return; }
      list.forEach((v, i) => sel.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, i)));
      if (!S.userHasPickedVoice && !S.autoSelectDone) autoSelectVoice();
      else if (prev) { sel.value = list.indexOf(prev); App.ui.log('🔊 ' + prev.name + ' (' + prev.lang + ')'); }
    });
  }

  function autoSelectVoice() {
    const S = App.state;
    if (S.userHasPickedVoice || S.autoSelectDone || !S.voices.length) return;
    const { full, prefix } = getBrowserLang();
    const best = findBestVoice(S.voices, full, prefix);
    if (best) { applyVoice(best); }
    else {
      S.autoSelectRetries++;
      if (S.autoSelectRetries < S.MAX_AUTO_RETRIES) setTimeout(autoSelectVoice, Math.min(300 * S.autoSelectRetries, 2000));
      else { const en = S.voices.find(v => getLangPrefix(v.lang) === 'en') || S.voices[0]; if (en) applyVoice(en); }
    }
  }

  function applyVoice(v) {
    const S = App.state, sel = App.elements.voiceSelect;
    S.autoSelectDone = true; sel.value = S.voices.indexOf(v);
    S.userSelectedVoiceRef = { name: v.name, lang: v.lang };
    App.ui.log('🔊 ' + v.name + ' (' + v.lang + ')');
    filterToLang(v.lang);
  }

  function filterToLang(targetLang) {
    const S = App.state, sel = App.elements.voiceSelect;
    if (!targetLang || !S.voices.length) return;
    const prefix = getLangPrefix(targetLang);
    const matching = S.voices.filter(v => getLangPrefix(v.lang) === prefix);
    if (matching.length <= 1) return;
    const current = S.voices[sel.value];
    sel.innerHTML = '';
    matching.forEach(v => sel.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, S.voices.indexOf(v))));
    if (current) { const still = matching.find(v => v.name === current.name && v.lang === current.lang); if (still) sel.value = S.voices.indexOf(current); }
  }

  function showAll() {
    const S = App.state, sel = App.elements.voiceSelect;
    const current = S.voices[sel.value];
    sel.innerHTML = '';
    S.voices.forEach((v, i) => sel.appendChild(new Option(`${v.name} (${v.lang})${v.localService ? '' : ' · Cloud'}`, i)));
    if (current) { const idx = S.voices.findIndex(v => v.name === current.name && v.lang === current.lang); if (idx >= 0) sel.value = idx; }
  }

  return { fillVoiceList, autoSelectVoice, filterToLang, showAll };
})();