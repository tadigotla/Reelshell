(function(NX) {
  // Apply Tier 1 prefs BEFORE first paint so theme/mode/font are right from frame 1
  if (NX.Persist && NX.Persist.loadPrefsSync) NX.Persist.loadPrefsSync();

  setInterval(NX.Output.updateStatus, 1000);

  NX.DVR.wireTransport();

  NX.DOM.cmdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      NX.Autocomplete.hide();
      NX.Commands.execute(NX.DOM.cmdInput.value);
      NX.DOM.cmdInput.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      var back = NX.History.back();
      if (back !== undefined) NX.DOM.cmdInput.value = back;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      var fwd = NX.History.forward();
      if (fwd !== undefined) NX.DOM.cmdInput.value = fwd;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      var partial = NX.DOM.cmdInput.value.trim().toLowerCase();
      var matches = Object.keys(NX.Commands.COMMANDS).filter(function(c) { return c.startsWith(partial); });
      if (matches.length === 1) { NX.DOM.cmdInput.value = matches[0] + ' '; NX.Autocomplete.hide(); }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      NX.DOM.output.innerHTML = '';
    }
  });

  NX.DOM.cmdInput.addEventListener('input', function() {
    NX.Autocomplete.show(NX.DOM.cmdInput.value.split(' ')[0]);
  });

  NX.DOM.terminal.addEventListener('click', function(e) {
    if (!e.target.closest('.playback-surface')) NX.DOM.cmdInput.focus();
  });

  document.addEventListener('keydown', function(e) {
    if (document.activeElement === NX.DOM.cmdInput && NX.DVR.snapshotIdx === -1) return;
    if (e.key === 'Home') { e.preventDefault(); NX.DVR.stopPlayback(); NX.DVR.goToSnapshot(0); }
    if (e.key === 'End') { e.preventDefault(); NX.DVR.goLive(); }
    if (e.key === 'ArrowLeft' && document.activeElement !== NX.DOM.cmdInput) {
      e.preventDefault(); NX.DVR.stopPlayback();
      var idx = NX.DVR.snapshotIdx === -1 ? NX.DVR.snapshotCount - 2 : NX.DVR.snapshotIdx - 1;
      NX.DVR.goToSnapshot(Math.max(0, idx));
    }
    if (e.key === 'ArrowRight' && document.activeElement !== NX.DOM.cmdInput) {
      e.preventDefault(); NX.DVR.stopPlayback();
      if (NX.DVR.snapshotIdx === -1) return;
      if (NX.DVR.snapshotIdx >= NX.DVR.snapshotCount - 1) NX.DVR.goLive();
      else NX.DVR.goToSnapshot(NX.DVR.snapshotIdx + 1);
    }
    if (e.key === ' ' && NX.DVR.snapshotIdx !== -1) {
      e.preventDefault();
      NX.DVR.isPlaying ? NX.DVR.stopPlayback() : NX.DVR.startPlayback();
    }
  });

  NX.DOM.modeToggle.addEventListener('click', NX.Themes.toggleMode);

  var FONT_MIN = 11;
  var FONT_MAX = 22;
  var WHEEL_SCROLL_PER_PX = 12;
  var currentFontSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--output-font-size')) || 13.5;
  var dragStartY = 0;
  var dragStartSize = 0;

  var fontSaveTimer = null;
  function queueFontSave() {
    if (fontSaveTimer) clearTimeout(fontSaveTimer);
    fontSaveTimer = setTimeout(function() {
      fontSaveTimer = null;
      if (NX.Persist) NX.Persist.savePrefsSync();
    }, 200);
  }

  function applyFontSize(size) {
    currentFontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
    document.documentElement.style.setProperty('--output-font-size', currentFontSize + 'px');
    NX.DOM.fontKnobTooltip.textContent = Math.round(currentFontSize) + 'px';
    var offset = (currentFontSize - FONT_MIN) * WHEEL_SCROLL_PER_PX;
    NX.DOM.fontKnob.style.backgroundPositionY = '-' + offset + 'px';
  }
  applyFontSize(currentFontSize);

  function onFontDragMove(e) {
    var delta = dragStartY - e.clientY;
    applyFontSize(dragStartSize + delta * 0.06);
    queueFontSave();
  }
  function onFontDragEnd() {
    window.removeEventListener('mousemove', onFontDragMove);
    window.removeEventListener('mouseup', onFontDragEnd);
    setTimeout(function() { NX.DOM.fontKnobMount.classList.remove('dragging'); }, 600);
    queueFontSave();
  }
  NX.DOM.fontKnob.addEventListener('mousedown', function(e) {
    e.preventDefault();
    dragStartY = e.clientY;
    dragStartSize = currentFontSize;
    NX.DOM.fontKnobMount.classList.add('dragging');
    window.addEventListener('mousemove', onFontDragMove);
    window.addEventListener('mouseup', onFontDragEnd);
  });

  var DAY_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  var clockTimer = null;
  function tickClock() {
    var d = new Date();
    NX.DOM.stardateClock.innerHTML =
      pad2(d.getHours()) +
      '<span class="stardate-clock-colon">:</span>' +
      pad2(d.getMinutes()) +
      '<span class="stardate-clock-colon">:</span>' +
      pad2(d.getSeconds());
    NX.DOM.stardateDow.textContent = DAY_NAMES[d.getDay()];
    NX.DOM.stardateDate.textContent = pad2(d.getDate()) + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
  }
  function startStardateTimers() {
    if (clockTimer === null) clockTimer = setInterval(tickClock, 1000);
  }
  function stopStardateTimers() {
    if (clockTimer !== null) { clearInterval(clockTimer); clockTimer = null; }
  }
  tickClock();
  startStardateTimers();
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      stopStardateTimers();
    } else {
      tickClock();
      startStardateTimers();
    }
  });

  NX.Boot.start();
})(window.NX = window.NX || {});
