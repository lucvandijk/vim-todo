const listEl = document.getElementById('list');
const emptyStateEl = document.getElementById('emptyState');
const insertBarEl = document.getElementById('insertBar');
const insertInputEl = document.getElementById('insertInput');
const modeBadgeEl = document.getElementById('modeBadge');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const shortcutCapture = document.getElementById('shortcutCapture');
const cancelShortcutBtn = document.getElementById('cancelShortcutBtn');
const saveShortcutBtn = document.getElementById('saveShortcutBtn');
const quitOverlay = document.getElementById('quitOverlay');
const insertCaret = document.getElementById('insertCaret');

let todos = [];
let selectedIndex = 0;
let mode = 'normal'; // 'normal' | 'insert' | 'settings'
let editingIndex = -1;
let pendingAccelerator = null;
let pendingDeleteId = null;
let pendingDeleteTimer = null;
let pendingQuit = false;
let pendingQuitTimer = null;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadTodos() {
  todos = (await window.vimTodo.getTodos()) || [];
  selectedIndex = todos.length ? 0 : -1;
  render();
}

function saveTodos() {
  window.vimTodo.setTodos(todos);
}

function render() {
  listEl.innerHTML = '';

  if (!todos.length) {
    emptyStateEl.classList.add('visible');
  } else {
    emptyStateEl.classList.remove('visible');
  }

  todos.forEach((todo, index) => {
    const isPendingDelete = todo.id === pendingDeleteId;
    const li = document.createElement('li');
    li.className = 'item'
      + (todo.done ? ' done' : '')
      + (index === selectedIndex ? ' selected' : '')
      + (isPendingDelete ? ' confirm-delete' : '');

    const check = document.createElement('span');
    check.className = 'check';
    check.textContent = todo.done ? '✓' : '';

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = isPendingDelete ? 'Press d again to confirm delete' : todo.text;

    li.appendChild(check);
    li.appendChild(text);
    li.addEventListener('click', () => {
      clearPendingDelete();
      selectedIndex = index;
      render();
    });

    listEl.appendChild(li);
  });

  const selectedEl = listEl.children[selectedIndex];
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

function setMode(next) {
  mode = next;
  modeBadgeEl.textContent = next.toUpperCase();
  modeBadgeEl.classList.toggle('insert', next === 'insert');
}

function clearPendingDelete() {
  pendingDeleteId = null;
  if (pendingDeleteTimer) {
    clearTimeout(pendingDeleteTimer);
    pendingDeleteTimer = null;
  }
}

function armPendingDelete(id) {
  pendingDeleteId = id;
  if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
  pendingDeleteTimer = setTimeout(() => {
    clearPendingDelete();
    render();
  }, 2500);
}

function clearPendingQuit() {
  pendingQuit = false;
  if (pendingQuitTimer) {
    clearTimeout(pendingQuitTimer);
    pendingQuitTimer = null;
  }
  quitOverlay.classList.remove('visible');
}

function armPendingQuit() {
  pendingQuit = true;
  quitOverlay.classList.add('visible');
  if (pendingQuitTimer) clearTimeout(pendingQuitTimer);
  pendingQuitTimer = setTimeout(() => {
    clearPendingQuit();
  }, 2500);
}

function handleQuitKey() {
  if (pendingQuit) {
    clearPendingQuit();
    window.vimTodo.quitApp();
    return;
  }
  clearPendingDelete();
  render();
  armPendingQuit();
}

function moveSelection(delta) {
  if (!todos.length) return;
  clearPendingDelete();
  clearPendingQuit();
  selectedIndex = Math.min(todos.length - 1, Math.max(0, selectedIndex + delta));
  render();
}

function toggleSelected() {
  if (selectedIndex < 0 || !todos[selectedIndex]) return;
  clearPendingDelete();
  clearPendingQuit();
  todos[selectedIndex].done = !todos[selectedIndex].done;
  saveTodos();
  render();
}

function deleteSelected() {
  if (selectedIndex < 0 || !todos[selectedIndex]) return;
  const todo = todos[selectedIndex];

  if (pendingDeleteId !== todo.id) {
    armPendingDelete(todo.id);
    render();
    return;
  }

  clearPendingDelete();
  todos.splice(selectedIndex, 1);
  if (selectedIndex >= todos.length) {
    selectedIndex = todos.length - 1;
  }
  saveTodos();
  render();
}

function resort() {
  clearPendingDelete();
  clearPendingQuit();
  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const previousId = selectedIndex >= 0 && todos[selectedIndex] ? todos[selectedIndex].id : null;
  todos = [...pending, ...done];
  if (previousId) {
    const newIndex = todos.findIndex((t) => t.id === previousId);
    selectedIndex = newIndex >= 0 ? newIndex : (todos.length ? 0 : -1);
  }
  saveTodos();
  render();
}

function enterInsertMode() {
  clearPendingDelete();
  clearPendingQuit();
  editingIndex = -1;
  insertCaret.textContent = '＋';
  insertInputEl.placeholder = 'Type a task and press Enter…';
  setMode('insert');
  insertBarEl.classList.add('visible');
  insertInputEl.value = '';
  insertInputEl.focus();
}

function enterEditMode() {
  if (selectedIndex < 0 || !todos[selectedIndex]) return;
  clearPendingDelete();
  clearPendingQuit();
  editingIndex = selectedIndex;
  insertCaret.textContent = '✎';
  insertInputEl.placeholder = 'Edit task and press Enter…';
  setMode('insert');
  insertBarEl.classList.add('visible');
  insertInputEl.value = todos[selectedIndex].text;
  insertInputEl.focus();
  insertInputEl.select();
}

function exitInsertMode() {
  setMode('normal');
  editingIndex = -1;
  insertBarEl.classList.remove('visible');
  insertInputEl.blur();
  listEl.parentElement.focus();
}

function commitInsert() {
  const value = insertInputEl.value.trim();

  if (editingIndex >= 0 && todos[editingIndex]) {
    if (value) {
      todos[editingIndex].text = value;
      saveTodos();
    }
    exitInsertMode();
    render();
    return;
  }

  if (value) {
    const todo = { id: uid(), text: value, done: false };
    if (selectedIndex >= 0) {
      todos.splice(selectedIndex + 1, 0, todo);
      selectedIndex += 1;
    } else {
      todos.push(todo);
      selectedIndex = 0;
    }
    saveTodos();
  }
  exitInsertMode();
  render();
}

function openSettings() {
  clearPendingDelete();
  clearPendingQuit();
  setMode('settings');
  pendingAccelerator = null;
  shortcutCapture.textContent = 'Press keys…';
  settingsOverlay.classList.add('visible');
}

function closeSettings() {
  setMode('normal');
  settingsOverlay.classList.remove('visible');
}

async function saveShortcut() {
  if (!pendingAccelerator) {
    closeSettings();
    return;
  }
  const result = await window.vimTodo.setShortcut(pendingAccelerator);
  if (result.ok) {
    closeSettings();
  } else {
    shortcutCapture.textContent = 'That combo is unavailable — try another';
    pendingAccelerator = null;
  }
}

function acceleratorFromEvent(e) {
  const parts = [];
  if (e.metaKey) parts.push('Command');
  if (e.ctrlKey) parts.push('Control');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  const key = e.key;
  const modifierKeys = ['Meta', 'Control', 'Alt', 'Shift'];
  if (modifierKeys.includes(key)) return null;

  let mainKey = key.length === 1 ? key.toUpperCase() : key;
  const specialMap = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Escape'
  };
  mainKey = specialMap[key] || mainKey;

  if (!parts.length) return null; // require at least one modifier
  parts.push(mainKey);
  return parts.join('+');
}

document.addEventListener('keydown', (e) => {
  if (mode === 'settings') {
    e.preventDefault();
    if (e.key === 'Escape') {
      closeSettings();
      return;
    }
    const accelerator = acceleratorFromEvent(e);
    if (accelerator) {
      pendingAccelerator = accelerator;
      shortcutCapture.textContent = accelerator.replace(/Command/g, '⌘').replace(/Control/g, 'Ctrl').replace(/Shift/g, '⇧').replace(/Alt/g, '⌥').replace(/\+/g, ' + ');
    }
    return;
  }

  if (mode === 'insert') {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInsert();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exitInsertMode();
      render();
    }
    return;
  }

  // normal mode
  if (e.key !== 'd' && pendingDeleteId !== null) {
    clearPendingDelete();
    render();
  }
  if (e.key !== 'q' && pendingQuit) {
    clearPendingQuit();
  }

  switch (e.key) {
    case 'j':
    case 'l':
      e.preventDefault();
      moveSelection(1);
      break;
    case 'k':
    case 'h':
      e.preventDefault();
      moveSelection(-1);
      break;
    case ' ':
      e.preventDefault();
      toggleSelected();
      break;
    case 'i':
      e.preventDefault();
      enterInsertMode();
      break;
    case 'e':
      e.preventDefault();
      enterEditMode();
      break;
    case 'd':
      e.preventDefault();
      deleteSelected();
      break;
    case 's':
      e.preventDefault();
      resort();
      break;
    case 'q':
      e.preventDefault();
      handleQuitKey();
      break;
    case 'Escape':
      e.preventDefault();
      clearPendingDelete();
      clearPendingQuit();
      window.vimTodo.hideWindow();
      break;
    default:
      break;
  }
});

settingsBtn.addEventListener('click', openSettings);
cancelShortcutBtn.addEventListener('click', closeSettings);
saveShortcutBtn.addEventListener('click', saveShortcut);

window.vimTodo.onWindowShown(() => {
  clearPendingDelete();
  clearPendingQuit();
  if (mode === 'insert') {
    exitInsertMode();
  }
  if (mode === 'settings') {
    closeSettings();
  }
  render();
});

setMode('normal');
loadTodos();
