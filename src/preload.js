const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vimTodo', {
  getTodos: () => ipcRenderer.invoke('todos:get'),
  setTodos: (todos) => ipcRenderer.invoke('todos:set', todos),
  getShortcut: () => ipcRenderer.invoke('shortcut:get'),
  setShortcut: (accelerator) => ipcRenderer.invoke('shortcut:set', accelerator),
  hideWindow: () => ipcRenderer.send('window:hide'),
  quitApp: () => ipcRenderer.send('app:quit'),
  onWindowShown: (callback) => ipcRenderer.on('window-shown', callback)
});
