(function(NX) {
  function print(html, className) {
    var div = document.createElement('div');
    div.className = ('line ' + (className || '')).trim();
    div.innerHTML = html;
    NX.DOM.output.appendChild(div);
    NX.DOM.output.scrollTop = NX.DOM.output.scrollHeight;
  }

  function printPromptEcho(cmd) {
    print(
      '<span class="prompt-user">' + NX.State.currentUser + '@nexterm</span><span class="prompt-separator">:</span><span class="prompt-user">' + NX.State.cwd + '$</span> <span class="prompt-cmd">' + escapeHtml(cmd) + '</span>',
      'line-prompt-echo'
    );
  }

  function printTable(headers, rows) {
    var html = '<table class="output-table"><thead><tr>';
    headers.forEach(function(h) { html += '<th>' + escapeHtml(h) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function(row) { html += '<tr>'; row.forEach(function(cell) { html += '<td>' + cell + '</td>'; }); html += '</tr>'; });
    html += '</tbody></table>';
    print(html);
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function updatePrompt() {
    NX.DOM.promptLbl.textContent = NX.State.currentUser + '@nexterm:' + NX.State.cwd + '$';
  }

  function updateStatus() {
    var elapsed = Math.floor((Date.now() - NX.State.sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    NX.DOM.statusL.textContent = 'CMD: ' + NX.State.commandCount;
    NX.DOM.statusR.textContent = 'SESSION ' + String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0') + ' | UTF-8';
  }

  NX.Output = { print: print, printPromptEcho: printPromptEcho, printTable: printTable, escapeHtml: escapeHtml, updatePrompt: updatePrompt, updateStatus: updateStatus };
})(window.NX = window.NX || {});
