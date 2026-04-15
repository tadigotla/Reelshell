(function(NX) {
  async function start() {
    var lines = [
      'BIOS POST... OK',
      'Detecting hardware... CPU: WebCore vHost',
      'Memory test: 512 MB ... PASS',
      'Loading kernel modules...',
      'Mounting filesystem... /dev/vfs0',
      'Initializing NEXTERM shell v3.2...',
      'Starting DVR subsystem... OK',
      '',
      'SYSTEM READY',
    ];

    for (var i = 0; i < lines.length; i++) {
      await new Promise(function(r) { setTimeout(r, 120 + Math.random() * 80); });
      NX.DOM.bootTxt.innerHTML += lines[i] + '\n';
    }

    await new Promise(function(r) { setTimeout(r, 400); });
    NX.DOM.bootOvl.classList.add('done');
    await new Promise(function(r) { setTimeout(r, 500); });
    NX.DOM.bootOvl.remove();

    var loaded = false;
    if (NX.Persist && NX.Persist.loadSessionAsync) {
      try { loaded = await NX.Persist.loadSessionAsync(); } catch (e) { loaded = false; }
    }

    if (!loaded) {
      NX.Commands.execute('banner', true);
      NX.Output.print('');
      NX.Output.print('Welcome to <span style="color:var(--term-green)">NEXTERM</span> — your browser-based terminal.', 'line-system');
      NX.Output.print('');
    }

    if (!NX.State.firstBootSeen) {
      NX.Output.print('  <span style="color:var(--term-amber)">PERSISTENCE: ENABLED</span>  ·  type <span style="color:var(--term-green)">wipe</span> to clear', 'line-system');
      NX.Output.print('');
      NX.State.firstBootSeen = true;
      if (NX.Persist && NX.Persist.savePrefsSync) NX.Persist.savePrefsSync();
    }

    if (!loaded) NX.DVR.takeSnapshot();
    NX.DVR.updatePlaybackUI();
    NX.DOM.cmdInput.focus();
  }

  NX.Boot = { start: start };
})(window.NX = window.NX || {});
