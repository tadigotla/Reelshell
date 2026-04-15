(function(NX) {
  var SCHEMA_VERSION = 1;
  var PREFS_KEY = 'nexterm:prefs:v1';
  var DB_NAME = 'nexterm';
  var STORE = 'session';
  var RECORD_ID = 'current';
  var SAVE_DEBOUNCE_MS = 500;
  var FONT_MIN = 11;
  var FONT_MAX = 22;

  var saveTimer = null;
  var lastSaved = null;
  var lastSavedBytes = 0;
  var dbPromise = null;
  var loading = false;

  function warn(msg, err) {
    if (typeof console !== 'undefined' && console.warn) console.warn('[persist] ' + msg, err || '');
  }

  // ── Tier 1: localStorage (synchronous) ────────
  function loadPrefsSync() {
    loading = true;
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || data.schemaVersion !== SCHEMA_VERSION) return;

      if (data.theme && NX.Themes) NX.Themes.apply(data.theme);
      if (data.mode === 'light' || data.mode === 'dark') {
        document.documentElement.dataset.mode = data.mode;
      }
      if (typeof data.fontSize === 'number' && data.fontSize >= FONT_MIN && data.fontSize <= FONT_MAX) {
        document.documentElement.style.setProperty('--output-font-size', data.fontSize + 'px');
      }
      if (typeof data.user === 'string' && data.user.length && data.user.length <= 16) {
        NX.State.currentUser = data.user;
      }
      if (typeof data.cwd === 'string') {
        NX.State.cwd = data.cwd;
      }
      if (typeof data.recording === 'boolean' && NX.DVR && NX.DVR.setRecording) {
        NX.DVR.setRecording(data.recording);
      }
      NX.State.firstBootSeen = !!data.firstBootSeen;

      if (NX.Output && NX.Output.updatePrompt) NX.Output.updatePrompt();
    } catch (e) {
      warn('loadPrefsSync failed', e);
    } finally {
      loading = false;
    }
  }

  function savePrefsSync() {
    if (loading) return;
    try {
      var fontSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--output-font-size')) || 13.5;
      var payload = {
        schemaVersion: SCHEMA_VERSION,
        theme: (NX.State.activeThemeName || 'GREEN').toLowerCase(),
        mode: document.documentElement.dataset.mode || 'dark',
        fontSize: fontSize,
        user: NX.State.currentUser,
        cwd: NX.State.cwd,
        recording: !!(NX.DVR && NX.DVR.recordingEnabled),
        firstBootSeen: !!NX.State.firstBootSeen,
      };
      localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
    } catch (e) {
      warn('savePrefsSync failed', e);
    }
  }

  // ── Tier 2: IndexedDB (asynchronous) ──────────
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function(resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function() {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function() {
        if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
          navigator.storage.persist().catch(function() {});
        }
        resolve(req.result);
      };
      req.onerror = function() { reject(req.error); };
      req.onblocked = function() { reject(new Error('IndexedDB open blocked')); };
    }).catch(function(err) {
      warn('openDB failed', err);
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  }

  function loadSessionAsync() {
    return openDB().then(function(db) {
      return new Promise(function(resolve) {
        var tx = db.transaction(STORE, 'readonly');
        var store = tx.objectStore(STORE);
        var req = store.get(RECORD_ID);
        req.onsuccess = function() {
          var data = req.result;
          if (!data || data.schemaVersion !== SCHEMA_VERSION) {
            resolve(false);
            return;
          }
          try {
            if (data.fs && NX.FS && NX.FS.setFS) NX.FS.setFS(data.fs);
            if (Array.isArray(data.history) && NX.History.replaceAll) NX.History.replaceAll(data.history);
            if (Array.isArray(data.snapshots) && NX.DVR.setSnapshots) NX.DVR.setSnapshots(data.snapshots);
            if (typeof data.currentScreen === 'string') {
              NX.DOM.output.innerHTML = data.currentScreen;
              NX.DOM.output.scrollTop = NX.DOM.output.scrollHeight;
            }
            if (typeof data.sessionStart === 'number') NX.State.sessionStart = data.sessionStart;
            if (typeof data.commandCount === 'number') NX.State.commandCount = data.commandCount;
            resolve(true);
          } catch (e) {
            warn('loadSessionAsync apply failed', e);
            resolve(false);
          }
        };
        req.onerror = function() { warn('loadSessionAsync read failed', req.error); resolve(false); };
      });
    }).catch(function(err) {
      warn('loadSessionAsync failed', err);
      return false;
    });
  }

  function queueSessionSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      saveTimer = null;
      doSessionSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function doSessionSave() {
    openDB().then(function(db) {
      var payload = {
        id: RECORD_ID,
        schemaVersion: SCHEMA_VERSION,
        fs: NX.FS.FS,
        history: NX.History.all(),
        snapshots: NX.DVR.snapshots.slice(),
        currentScreen: NX.DOM.output.innerHTML,
        sessionStart: NX.State.sessionStart,
        commandCount: NX.State.commandCount,
      };
      try { lastSavedBytes = JSON.stringify(payload).length; } catch (e) { lastSavedBytes = 0; }
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload);
      tx.oncomplete = function() { lastSaved = Date.now(); };
      tx.onerror = function() { warn('session save tx failed', tx.error); };
    }).catch(function(err) {
      warn('doSessionSave failed', err);
    });
  }

  function wipeAll() {
    return new Promise(function(resolve) {
      try { localStorage.removeItem(PREFS_KEY); } catch (e) { warn('wipe localStorage failed', e); }
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      dbPromise = null;
      if (typeof indexedDB === 'undefined') { resolve(); return; }
      var req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { warn('wipe IDB failed', req.error); resolve(); };
      req.onblocked = function() { warn('wipe IDB blocked'); resolve(); };
    });
  }

  function stats() {
    var tier1Bytes = 0;
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (raw) tier1Bytes = raw.length;
    } catch (e) {}
    return {
      tier1Bytes: tier1Bytes,
      tier2Bytes: lastSavedBytes,
      schemaVersion: SCHEMA_VERSION,
      lastSaved: lastSaved,
    };
  }

  NX.Persist = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    loadPrefsSync: loadPrefsSync,
    savePrefsSync: savePrefsSync,
    loadSessionAsync: loadSessionAsync,
    queueSessionSave: queueSessionSave,
    wipeAll: wipeAll,
    stats: stats,
  };
})(window.NX = window.NX || {});
