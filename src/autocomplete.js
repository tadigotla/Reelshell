(function(NX) {
  function show(partial) {
    if (!partial) { NX.DOM.acHint.classList.remove('show'); return; }
    var matches = Object.keys(NX.Commands.COMMANDS).filter(function(c) { return c.startsWith(partial.toLowerCase()); });
    if (matches.length && matches.length <= 8 && partial.length > 0) {
      NX.DOM.acHint.innerHTML = matches.map(function(m) { return '<span>' + m + '</span>'; }).join('');
      NX.DOM.acHint.classList.add('show');
    } else {
      NX.DOM.acHint.classList.remove('show');
    }
  }

  function hide() { NX.DOM.acHint.classList.remove('show'); }

  NX.Autocomplete = { show: show, hide: hide };
})(window.NX = window.NX || {});
