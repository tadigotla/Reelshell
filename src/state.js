(function(NX) {
  NX.State = {
    currentUser: 'guest',
    cwd: '~',
    commandCount: 0,
    sessionStart: Date.now(),
    activeThemeName: 'GREEN',
    firstBootSeen: false,
    FORTUNES: [
      'The best time to plant a tree was 20 years ago. The second best time is now.',
      'Simplicity is the ultimate sophistication.',
      'In the middle of difficulty lies opportunity.',
    ],
  };
})(window.NX = window.NX || {});
