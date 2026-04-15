(function(NX) {
  var COMMANDS = {};

  function register(name, desc, usage, fn) {
    COMMANDS[name] = { description: desc, usage: usage, fn: fn };
  }

  register('help', 'Show available commands', 'help [command]', function(args) {
    if (args.length) {
      var cmd = COMMANDS[args[0]];
      if (!cmd) return NX.Output.print('help: unknown command \'' + NX.Output.escapeHtml(args[0]) + '\'', 'line-error');
      NX.Output.print('<strong style="color:var(--term-cyan)">' + NX.Output.escapeHtml(args[0]) + '</strong> — ' + NX.Output.escapeHtml(cmd.description), 'line-info');
      NX.Output.print('  Usage: ' + NX.Output.escapeHtml(cmd.usage), 'line-system');
      return;
    }
    NX.Output.print('╔══════════════════════════════════════════════╗', 'line-info');
    NX.Output.print('║         NEXTERM — COMMAND REFERENCE          ║', 'line-info');
    NX.Output.print('╚══════════════════════════════════════════════╝', 'line-info');
    NX.Output.print('');
    var sorted = Object.keys(COMMANDS).sort();
    var maxLen = Math.max.apply(null, sorted.map(function(n) { return n.length; }));
    sorted.forEach(function(name) {
      var pad = ' '.repeat(maxLen - name.length + 2);
      NX.Output.print('  <span style="color:var(--term-cyan)">' + name + '</span>' + pad + NX.Output.escapeHtml(COMMANDS[name].description));
    });
    NX.Output.print('');
    NX.Output.print('Tip: use <span style="color:var(--term-amber)">help &lt;command&gt;</span> for detailed usage.', 'line-system');
  });

  register('clear', 'Clear the terminal screen', 'clear', function() { NX.DOM.output.innerHTML = ''; });
  register('echo', 'Print text to the terminal', 'echo <text>', function(args) { NX.Output.print(NX.Output.escapeHtml(args.join(' '))); });
  register('date', 'Show current date and time', 'date', function() { NX.Output.print(new Date().toString(), 'line-info'); });
  register('whoami', 'Display the current user', 'whoami', function() { NX.Output.print(NX.State.currentUser, 'line-success'); });

  register('user', 'Change the active username', 'user <name>', function(args) {
    if (!args.length) return NX.Output.print('Usage: user &lt;name&gt;', 'line-warn');
    var name = args[0].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    if (!name) return NX.Output.print('Invalid username.', 'line-error');
    NX.State.currentUser = name; NX.Output.updatePrompt();
    if (NX.Persist) NX.Persist.savePrefsSync();
    NX.Output.print('User changed to <span style="color:var(--term-green)">' + NX.Output.escapeHtml(name) + '</span>', 'line-success');
  });

  register('uptime', 'Show session uptime', 'uptime', function() {
    var s = Math.floor((Date.now() - NX.State.sessionStart) / 1000);
    NX.Output.print('Session uptime: ' + Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm ' + (s%60) + 's', 'line-info');
  });

  register('ls', 'List directory contents', 'ls [path]', function(args) {
    var target = args[0] || NX.State.cwd;
    var parts = NX.FS.resolvePath(target);
    var node = NX.FS.getNode(parts);
    if (!node) return NX.Output.print('ls: cannot access \'' + NX.Output.escapeHtml(target) + '\': No such file or directory', 'line-error');
    if (node.type !== 'dir') return NX.Output.print(NX.Output.escapeHtml(target), 'line-info');
    var names = Object.keys(node.children).sort();
    if (!names.length) return NX.Output.print('(empty directory)', 'line-system');
    var items = names.map(function(n) {
      var child = node.children[n];
      return child.type === 'dir'
        ? '<span style="color:var(--term-cyan);font-weight:600">' + NX.Output.escapeHtml(n) + '/</span>'
        : '<span style="color:var(--term-text)">' + NX.Output.escapeHtml(n) + '</span>';
    });
    NX.Output.print(items.join('    '));
  });

  register('cd', 'Change directory', 'cd <path>', function(args) {
    if (!args.length || args[0] === '~') {
      NX.State.cwd = '~'; NX.Output.updatePrompt();
      if (NX.Persist) NX.Persist.savePrefsSync();
      return;
    }
    var parts = NX.FS.resolvePath(args[0]);
    var node = NX.FS.getNode(parts);
    if (!node) return NX.Output.print('cd: no such directory: ' + NX.Output.escapeHtml(args[0]), 'line-error');
    if (node.type !== 'dir') return NX.Output.print('cd: not a directory: ' + NX.Output.escapeHtml(args[0]), 'line-error');
    NX.State.cwd = NX.FS.getAbsPath(parts); NX.Output.updatePrompt();
    if (NX.Persist) NX.Persist.savePrefsSync();
  });

  register('pwd', 'Print working directory', 'pwd', function() {
    NX.Output.print('/home/' + NX.State.currentUser + (NX.State.cwd === '~' ? '' : NX.State.cwd.slice(1)), 'line-info');
  });

  register('cat', 'Display file contents', 'cat <file>', function(args) {
    if (!args.length) return NX.Output.print('Usage: cat &lt;file&gt;', 'line-warn');
    var parts = NX.FS.resolvePath(args[0]);
    var node = NX.FS.getNode(parts);
    if (!node) return NX.Output.print('cat: ' + NX.Output.escapeHtml(args[0]) + ': No such file or directory', 'line-error');
    if (node.type === 'dir') return NX.Output.print('cat: ' + NX.Output.escapeHtml(args[0]) + ': Is a directory', 'line-error');
    NX.Output.print(NX.Output.escapeHtml(node.content));
  });

  register('mkdir', 'Create a directory', 'mkdir <name>', function(args) {
    if (!args.length) return NX.Output.print('Usage: mkdir &lt;name&gt;', 'line-warn');
    var cwdParts = NX.FS.resolvePath('.');
    var parent = NX.FS.getNode(cwdParts);
    if (!parent || parent.type !== 'dir') return NX.Output.print('mkdir: cannot create directory', 'line-error');
    var name = args[0].replace(/\//g, '');
    if (parent.children[name]) return NX.Output.print('mkdir: \'' + NX.Output.escapeHtml(name) + '\' already exists', 'line-error');
    parent.children[name] = { type: 'dir', children: {} };
    NX.Output.print('Directory created: ' + NX.Output.escapeHtml(name) + '/', 'line-success');
  });

  register('touch', 'Create an empty file', 'touch <name>', function(args) {
    if (!args.length) return NX.Output.print('Usage: touch &lt;name&gt;', 'line-warn');
    var cwdParts = NX.FS.resolvePath('.');
    var parent = NX.FS.getNode(cwdParts);
    if (!parent || parent.type !== 'dir') return NX.Output.print('touch: cannot create file', 'line-error');
    var name = args[0].replace(/\//g, '');
    if (parent.children[name]) return NX.Output.print('touch: \'' + NX.Output.escapeHtml(name) + '\' already exists', 'line-warn');
    parent.children[name] = { type: 'file', content: '' };
    NX.Output.print('File created: ' + NX.Output.escapeHtml(name), 'line-success');
  });

  register('write', 'Write content to a file', 'write <file> <content>', function(args) {
    if (args.length < 2) return NX.Output.print('Usage: write &lt;file&gt; &lt;content&gt;', 'line-warn');
    var parts = NX.FS.resolvePath(args[0]);
    var node = NX.FS.getNode(parts);
    if (!node) return NX.Output.print('write: ' + NX.Output.escapeHtml(args[0]) + ': No such file', 'line-error');
    if (node.type === 'dir') return NX.Output.print('write: ' + NX.Output.escapeHtml(args[0]) + ': Is a directory', 'line-error');
    node.content = args.slice(1).join(' ');
    NX.Output.print('Written to ' + NX.Output.escapeHtml(args[0]), 'line-success');
  });

  register('rm', 'Remove a file', 'rm <file>', function(args) {
    if (!args.length) return NX.Output.print('Usage: rm &lt;file&gt;', 'line-warn');
    var pathParts = NX.FS.resolvePath(args[0]);
    if (pathParts.length === 0) return NX.Output.print('rm: cannot remove root', 'line-error');
    var parentParts = pathParts.slice(0, -1);
    var parent = NX.FS.getNode(parentParts);
    var name = pathParts[pathParts.length - 1];
    if (!parent || !parent.children[name]) return NX.Output.print('rm: \'' + NX.Output.escapeHtml(args[0]) + '\': not found', 'line-error');
    delete parent.children[name];
    NX.Output.print('Removed: ' + NX.Output.escapeHtml(args[0]), 'line-success');
  });

  register('tree', 'Show directory tree', 'tree [path]', function(args) {
    var target = args[0] || NX.State.cwd;
    var parts = NX.FS.resolvePath(target);
    var node = NX.FS.getNode(parts);
    if (!node || node.type !== 'dir') return NX.Output.print('tree: \'' + NX.Output.escapeHtml(target) + '\' is not a directory', 'line-error');
    function walk(n, prefix) {
      var keys = Object.keys(n.children).sort();
      keys.forEach(function(k, i) {
        var last = i === keys.length - 1;
        var child = n.children[k];
        var label = child.type === 'dir'
          ? '<span style="color:var(--term-cyan)">' + NX.Output.escapeHtml(k) + '/</span>' : NX.Output.escapeHtml(k);
        NX.Output.print(prefix + (last ? '└── ' : '├── ') + label);
        if (child.type === 'dir') walk(child, prefix + (last ? '    ' : '│   '));
      });
    }
    NX.Output.print('<span style="color:var(--term-cyan)">' + NX.Output.escapeHtml(NX.FS.getAbsPath(parts)) + '</span>');
    walk(node, '');
  });

  register('calc', 'Evaluate a math expression', 'calc <expr>', function(args) {
    if (!args.length) return NX.Output.print('Usage: calc &lt;expression&gt;', 'line-warn');
    try {
      var expr = args.join(' ').replace(/[^0-9+\-*/().%\s]/g, '');
      var result = Function('"use strict"; return (' + expr + ')')();
      NX.Output.print('= <span style="color:var(--term-green);font-weight:600">' + result + '</span>', 'line-success');
    } catch(e) { NX.Output.print('calc: invalid expression', 'line-error'); }
  });

  register('weather', 'Mock weather report', 'weather [city]', function(args) {
    var city = args.join(' ') || 'Terminal City';
    var temp = [62,65,70,74,78,82,85,88][Math.floor(Math.random()*8)];
    var conds = ['Clear','Partly Cloudy','Rain','Mostly Sunny'];
    var cond = conds[Math.floor(Math.random()*4)];
    NX.Output.print('┌─────────────────────────────────┐');
    NX.Output.print('│  Weather: <span style="color:var(--term-amber)">' + NX.Output.escapeHtml(city) + '</span>');
    NX.Output.print('│  Temp: <span style="color:var(--term-green)">' + temp + ' F</span>  |  Cond: ' + cond);
    NX.Output.print('│  Wind: ' + (Math.floor(Math.random()*20)+3) + ' mph  |  Humid: ' + (Math.floor(Math.random()*60)+30) + '%');
    NX.Output.print('└─────────────────────────────────┘');
  });

  register('colors', 'Show color palette', 'colors', function() {
    NX.Output.print('<span style="color:var(--term-green)">##</span> Green  <span style="color:var(--term-cyan)">##</span> Cyan  <span style="color:var(--term-amber)">##</span> Amber  <span style="color:var(--term-red)">##</span> Red  <span style="color:var(--term-magenta)">##</span> Magenta');
  });

  register('joke', 'Tell a programming joke', 'joke', function() {
    var jokes = [
      'Why do programmers prefer dark mode?\nBecause light attracts bugs.',
      'A SQL query walks into a bar, sees two tables and asks...\n"Can I JOIN you?"',
      '!false -- It is funny because it is true.',
    ];
    NX.Output.print(jokes[Math.floor(Math.random() * jokes.length)], 'line-info');
  });

  register('fortune', 'Random fortune', 'fortune', function() {
    NX.Output.print('> ' + NX.State.FORTUNES[Math.floor(Math.random() * NX.State.FORTUNES.length)], 'line-accent');
  });

  function humanSince(ts) {
    if (!ts) return '—';
    var elapsed = Math.floor((Date.now() - ts) / 1000);
    if (elapsed < 2) return 'just now';
    if (elapsed < 60) return elapsed + 's ago';
    if (elapsed < 3600) return Math.floor(elapsed / 60) + 'm ago';
    return Math.floor(elapsed / 3600) + 'h ago';
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  register('sysinfo', 'Display system information', 'sysinfo', function() {
    var rows = [
      ['OS', '<span style="color:var(--term-cyan)">NEXTERM/Web 3.2</span>'],
      ['Shell', '<span style="color:var(--term-text)">nxsh 3.2.0</span>'],
      ['User', '<span style="color:var(--term-green)">' + NX.Output.escapeHtml(NX.State.currentUser) + '</span>'],
      ['Resolution', '<span style="color:var(--term-text)">' + window.innerWidth + 'x' + window.innerHeight + '</span>'],
      ['Commands', '<span style="color:var(--term-amber)">' + Object.keys(COMMANDS).length + ' loaded</span>'],
      ['Snapshots', '<span style="color:var(--term-amber)">' + NX.DVR.snapshotCount + ' recorded</span>'],
      ['Recording', '<span style="color:' + (NX.DVR.recordingEnabled ? 'var(--term-green)' : 'var(--term-amber)') + '">' + (NX.DVR.recordingEnabled ? 'ON' : 'OFF') + '</span>'],
    ];
    if (NX.Persist && NX.Persist.stats) {
      var s = NX.Persist.stats();
      rows.push(['Persist', '<span style="color:var(--term-green)">ENABLED</span>']);
      rows.push(['Tier 1', '<span style="color:var(--term-text)">' + formatBytes(s.tier1Bytes) + ' (localStorage)</span>']);
      rows.push(['Tier 2', '<span style="color:var(--term-text)">~' + formatBytes(s.tier2Bytes) + ' (IndexedDB)</span>']);
      rows.push(['Schema', '<span style="color:var(--term-text)">v' + s.schemaVersion + '</span>']);
      rows.push(['Last saved', '<span style="color:var(--term-muted)">' + humanSince(s.lastSaved) + '</span>']);
    }
    NX.Output.printTable(['Property', 'Value'], rows);
  });

  register('history', 'Show command history', 'history', function() {
    var entries = NX.History.all();
    if (!entries.length) return NX.Output.print('No commands in history.', 'line-system');
    entries.forEach(function(cmd, i) {
      NX.Output.print('  <span style="color:var(--term-muted)">' + String(i+1).padStart(4) + '</span>  ' + NX.Output.escapeHtml(cmd));
    });
  });

  register('theme', 'Switch color theme', 'theme <green|amber|cyan|red>', function(args) {
    var t = NX.Themes.apply(args[0]);
    if (!t) return NX.Output.print('Available themes: ' + NX.Themes.names().join(', '), 'line-warn');
    NX.Output.print('Theme changed to <span style="color:' + t.main + '">' + args[0] + '</span>', 'line-success');
  });

  register('banner', 'Display the NEXTERM banner', 'banner', function() {
    NX.Output.print('<span class="nexterm-wordmark">NEXTERM</span> <span style="color:var(--term-muted)">// Web Terminal v3.2</span>');
    NX.Output.print('Type <span style="color:var(--term-amber)">help</span> to begin.', 'line-system');
  });

  register('export', 'Export terminal output', 'export', function() {
    var text = NX.DOM.output.innerText;
    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'nexterm-session.txt'; a.click();
    NX.Output.print('Session exported.', 'line-success');
  });

  var pendingWipe = false;

  register('wipe', 'Erase all persisted state and reload', 'wipe', function() {
    NX.Output.print('⚠  This will erase all persisted state: history, filesystem, DVR timeline,', 'line-warn');
    NX.Output.print('    theme, font size, username, recording flag, and current screen.', 'line-warn');
    NX.Output.print('    Type <span style="color:var(--term-green)">yes</span> to confirm, anything else to cancel.', 'line-warn');
    pendingWipe = true;
  });

  function execute(input, skipSnapshot) {
    var trimmed = input.trim();
    if (!trimmed) return;

    if (NX.DVR.snapshotIdx !== -1) NX.DVR.goLive();

    // Handle pending wipe confirmation before anything else
    if (pendingWipe) {
      pendingWipe = false;
      NX.Output.printPromptEcho(trimmed);
      if (trimmed === 'yes') {
        NX.Output.print('✓  Persisted state wiped. Reloading...', 'line-success');
        if (NX.Persist && NX.Persist.wipeAll) {
          NX.Persist.wipeAll().then(function() { location.reload(); });
        } else {
          location.reload();
        }
      } else {
        NX.Output.print('cancelled', 'line-system');
      }
      if (!skipSnapshot) NX.DVR.takeSnapshot();
      return;
    }

    NX.History.push(trimmed);
    NX.State.commandCount++;

    NX.Output.printPromptEcho(trimmed);

    var parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1).map(function(a) { return a.replace(/^"|"$/g, ''); });

    if (COMMANDS[cmd]) {
      COMMANDS[cmd].fn(args);
    } else {
      NX.Output.print('nexterm: command not found: <span style="color:var(--term-red)">' + NX.Output.escapeHtml(cmd) + '</span>', 'line-error');
      var suggestions = Object.keys(COMMANDS).filter(function(c) { return c.startsWith(cmd.slice(0, 2)); });
      if (suggestions.length) {
        NX.Output.print('Did you mean: ' + suggestions.map(function(s) { return '<span style="color:var(--term-cyan)">' + s + '</span>'; }).join(', ') + '?', 'line-system');
      }
    }

    if (!skipSnapshot) NX.DVR.takeSnapshot();
    if (NX.Persist && NX.Persist.queueSessionSave) NX.Persist.queueSessionSave();
  }

  NX.Commands = { COMMANDS: COMMANDS, register: register, execute: execute };
})(window.NX = window.NX || {});
