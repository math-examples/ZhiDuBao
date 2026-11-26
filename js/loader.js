(function() {
  var cfg = window.__APP_CONFIG__;
  var base = cfg.base + cfg.version + '/js/';
  var loaded = 0;

  function initVersionTag() {
    var tag = document.getElementById('versionTag');
    if (!tag) return;
    tag.textContent = cfg.version.replace(/^v/, '');
    tag.addEventListener('click', function() {
      navigator.clipboard.writeText(cfg.version).then(function() {
        var old = tag.textContent;
        tag.textContent = 'copied!';
        setTimeout(function() { tag.textContent = old; }, 1000);
      });
    });
  }

  function loadScript(file, retry) {
    retry = retry || 0;
    var s = document.createElement('script');
    s.src = cfg.cdns[retry] + base + file;
    if (cfg.sriHashes[file]) {
      s.integrity = cfg.sriHashes[file];
      s.crossOrigin = 'anonymous';
    }
    s.onload = function() {
      loaded++;
      if (loaded === cfg.files.length) {
        initVersionTag();
        if (window.fillVoiceList) window.fillVoiceList();
      }
    };
    s.onerror = function() {
      if (retry < cfg.cdns.length - 1) {
        loadScript(file, retry + 1);
      }
    };
    document.head.appendChild(s);
  }

  cfg.files.forEach(loadScript);
})();