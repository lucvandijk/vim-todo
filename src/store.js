const Store = require('electron-store');

const store = new Store({
  defaults: {
    todos: [],
    shortcut: 'Control+Space',
    windowSize: { width: 420, height: 480 }
  }
});

module.exports = store;
