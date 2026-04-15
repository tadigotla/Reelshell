(function(NX) {
  var MAX_HISTORY = 500;
  var history = [];
  var historyIdx = -1;

  function push(cmd) {
    history.push(cmd);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    historyIdx = history.length;
  }

  function back() {
    if (historyIdx > 0) { historyIdx--; return history[historyIdx]; }
    return undefined;
  }

  function forward() {
    if (historyIdx < history.length - 1) { historyIdx++; return history[historyIdx]; }
    historyIdx = history.length;
    return '';
  }

  function all() { return history.slice(); }

  function replaceAll(newHistory) {
    history = Array.isArray(newHistory) ? newHistory.slice() : [];
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    historyIdx = history.length;
  }

  NX.History = { push: push, back: back, forward: forward, all: all, replaceAll: replaceAll, MAX: MAX_HISTORY };
})(window.NX = window.NX || {});
