(function(NX) {
  var THEMES = {
    green: { main: '#7ed957', glow: 'rgba(126,217,87,0.20)' },
    amber: { main: '#e8a93b', glow: 'rgba(232,169,59,0.20)' },
    cyan:  { main: '#5cc4d6', glow: 'rgba(92,196,214,0.20)' },
    red:   { main: '#e06b6b', glow: 'rgba(224,107,107,0.20)' },
  };

  function apply(name) {
    var t = THEMES[name];
    if (!t) return null;
    document.documentElement.style.setProperty('--term-green', t.main);
    document.documentElement.style.setProperty('--term-green-glow', t.glow);
    NX.State.activeThemeName = name.toUpperCase();
    if (NX.Persist) NX.Persist.savePrefsSync();
    return t;
  }

  function toggleMode() {
    var isLight = document.documentElement.dataset.mode === 'light';
    document.documentElement.dataset.mode = isLight ? 'dark' : 'light';
    if (NX.Persist) NX.Persist.savePrefsSync();
  }

  function names() { return Object.keys(THEMES); }

  NX.Themes = { apply: apply, toggleMode: toggleMode, names: names };
})(window.NX = window.NX || {});
