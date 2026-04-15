(function(NX) {
  var MAX_SNAPSHOTS = 200;
  var snapshots = [];
  var snapshotIdx = -1;
  var isPlaying = false;
  var playTimer = null;
  var recordingEnabled = true;
  var PLAY_INTERVAL = 1200;

  function takeSnapshot() {
    if (!recordingEnabled) return;
    snapshots.push({ html: NX.DOM.output.innerHTML });
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
    if (snapshotIdx === -1) updateProgress();
  }

  function setSnapshots(newSnapshots) {
    snapshots = Array.isArray(newSnapshots) ? newSnapshots.slice() : [];
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
    snapshotIdx = -1;
    updateProgress();
    updatePlaybackUI();
  }

  function setRecording(value) {
    recordingEnabled = !!value;
    if (NX.DOM.btnRecord) NX.DOM.btnRecord.classList.toggle('active', recordingEnabled);
  }

  function goToSnapshot(idx) {
    if (snapshots.length === 0) return;
    idx = Math.max(0, Math.min(idx, snapshots.length - 1));
    snapshotIdx = idx;
    NX.DOM.output.innerHTML = snapshots[idx].html;
    NX.DOM.output.scrollTop = NX.DOM.output.scrollHeight;
    updateProgress();
    updatePlaybackUI();
  }

  function goLive() {
    if (snapshots.length === 0) return;
    snapshotIdx = -1;
    NX.DOM.output.innerHTML = snapshots[snapshots.length - 1].html;
    NX.DOM.output.scrollTop = NX.DOM.output.scrollHeight;
    stopPlayback();
    updateProgress();
    updatePlaybackUI();
  }

  function updateProgress() {
    var total = snapshots.length;
    var current = snapshotIdx === -1 ? total : snapshotIdx + 1;
    var pct = total === 0 ? 100 : (current / total) * 100;
    NX.DOM.progressFill.style.width = pct + '%';
    NX.DOM.progressLabel.textContent = current + ' / ' + total;
  }

  function updatePlaybackUI() {
    var inPlayback = snapshotIdx !== -1;
    NX.DOM.playbackBadge.classList.toggle('show', inPlayback || isPlaying);
    NX.DOM.statusDot.classList.toggle('playback', inPlayback);
    NX.DOM.statusMode.textContent = isPlaying ? 'PLAYING' : inPlayback ? 'PLAYBACK' : 'ACTIVE';
    NX.DOM.cmdInput.disabled = inPlayback;
    NX.DOM.cmdInput.placeholder = inPlayback ? '── playback mode ── press ⏩ to return to live' : "type 'help' to get started...";
    NX.DOM.btnPlay.classList.toggle('active', isPlaying);
    NX.DOM.btnPlay.classList.toggle('is-play', isPlaying);
    NX.DOM.btnPause.classList.toggle('active', inPlayback && !isPlaying);
  }

  function startPlayback() {
    if (snapshots.length === 0) return;
    if (snapshotIdx === -1) snapshotIdx = 0;
    isPlaying = true;
    updatePlaybackUI();
    playTimer = setInterval(function() {
      if (snapshotIdx >= snapshots.length - 1) { stopPlayback(); return; }
      snapshotIdx++;
      goToSnapshot(snapshotIdx);
    }, PLAY_INTERVAL);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    updatePlaybackUI();
  }

  function wireTransport() {
    NX.DOM.btnRewind.addEventListener('click', function() { stopPlayback(); goToSnapshot(0); });
    NX.DOM.btnBack.addEventListener('click', function() {
      stopPlayback();
      var idx = snapshotIdx === -1 ? snapshots.length - 2 : snapshotIdx - 1;
      goToSnapshot(Math.max(0, idx));
    });
    NX.DOM.btnPlay.addEventListener('click', function() { if (isPlaying) stopPlayback(); else startPlayback(); });
    NX.DOM.btnPause.addEventListener('click', function() { if (isPlaying) stopPlayback(); });
    NX.DOM.btnAhead.addEventListener('click', function() {
      stopPlayback();
      if (snapshotIdx === -1) return;
      if (snapshotIdx >= snapshots.length - 1) { goLive(); return; }
      goToSnapshot(snapshotIdx + 1);
    });
    NX.DOM.btnFastFwd.addEventListener('click', function() { stopPlayback(); goLive(); });
    NX.DOM.btnStop.addEventListener('click', function() {
      if (snapshotIdx === -1 && !isPlaying) return;
      goLive();
    });
    NX.DOM.btnRecord.addEventListener('click', function() {
      recordingEnabled = !recordingEnabled;
      NX.DOM.btnRecord.classList.toggle('active', recordingEnabled);
      if (NX.Persist) NX.Persist.savePrefsSync();
    });

    NX.DOM.progressTrack.addEventListener('click', function(e) {
      if (snapshots.length === 0) return;
      stopPlayback();
      var rect = NX.DOM.progressTrack.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      goToSnapshot(Math.round(pct * (snapshots.length - 1)));
    });
  }

  NX.DVR = {
    takeSnapshot: takeSnapshot,
    goToSnapshot: goToSnapshot,
    goLive: goLive,
    updateProgress: updateProgress,
    updatePlaybackUI: updatePlaybackUI,
    startPlayback: startPlayback,
    stopPlayback: stopPlayback,
    wireTransport: wireTransport,
    setSnapshots: setSnapshots,
    setRecording: setRecording,
    MAX: MAX_SNAPSHOTS,
    get snapshotIdx() { return snapshotIdx; },
    get snapshotCount() { return snapshots.length; },
    get snapshots() { return snapshots; },
    get isPlaying() { return isPlaying; },
    get recordingEnabled() { return recordingEnabled; },
  };
})(window.NX = window.NX || {});
