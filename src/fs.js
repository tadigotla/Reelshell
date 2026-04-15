(function(NX) {
  var FS = {
    '~': {
      type: 'dir',
      children: {
        'readme.txt': { type: 'file', content: 'Welcome to NEXTERM v3.2\nA web-based terminal emulator.\nType "help" for available commands.' },
        'notes.txt': { type: 'file', content: 'TODO:\n- Finish the project\n- Deploy to production\n- Celebrate' },
        'projects': {
          type: 'dir',
          children: {
            'alpha.log': { type: 'file', content: '[LOG] Project Alpha initialized.\n[LOG] Build successful.\n[LOG] Tests passed: 42/42' },
            'beta.conf': { type: 'file', content: 'name=beta\nversion=2.1\nstatus=active\nport=8080' },
          }
        },
        'secret': {
          type: 'dir',
          children: {
            '.hidden': { type: 'file', content: 'You found the hidden file! Nice exploration skills.' }
          }
        }
      }
    }
  };

  function resolvePath(pathStr) {
    var parts;
    if (pathStr.startsWith('~') || pathStr.startsWith('/')) {
      parts = pathStr.replace(/^~\/?/, '').split('/').filter(Boolean);
    } else {
      var cwdParts = NX.State.cwd.replace(/^~\/?/, '').split('/').filter(Boolean);
      parts = cwdParts.concat(pathStr.split('/').filter(Boolean));
    }
    var resolved = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '..') resolved.pop();
      else if (p !== '.') resolved.push(p);
    }
    return resolved;
  }

  function getNode(pathParts) {
    var node = FS['~'];
    for (var i = 0; i < pathParts.length; i++) {
      var part = pathParts[i];
      if (!node || node.type !== 'dir' || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function getAbsPath(parts) {
    return parts.length ? '~/' + parts.join('/') : '~';
  }

  function setFS(newFS) {
    if (newFS && newFS['~'] && newFS['~'].type === 'dir' && newFS['~'].children) {
      FS = newFS;
    }
  }

  NX.FS = {
    get FS() { return FS; },
    setFS: setFS,
    resolvePath: resolvePath,
    getNode: getNode,
    getAbsPath: getAbsPath,
  };
})(window.NX = window.NX || {});
