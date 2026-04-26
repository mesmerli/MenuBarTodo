const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const tabBtns = document.querySelectorAll('.tab');
const settingsBtn = document.getElementById('settings-btn');
const mainUndoBtn = document.getElementById('main-undo-btn');

let todos = [];
let deletedHistory = [];
let currentDimension = 'day';

// Set up tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDimension = btn.dataset.dimension;
    renderTodos();
    input.focus();
  });
});

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    window.api.openHistoryWindow();
  });
}

if (mainUndoBtn) {
  mainUndoBtn.addEventListener('click', async () => {
    if (deletedHistory.length > 0) {
      const lastDeleted = deletedHistory.pop();
      todos = [...todos, ...lastDeleted];
      mainUndoBtn.disabled = deletedHistory.length === 0;
      renderTodos();
      await window.api.saveTodos(todos);
    }
  });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function isSameWeek(d1, d2) {
  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  return getStartOfWeek(d1) === getStartOfWeek(d2);
}

function isSameMonth(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth();
}

async function init() {
  await window.i18n.init();
  todos = await window.api.loadTodos();
  renderTodos();
  
  window.api.onWindowShow(() => {
    input.focus();
  });
  
  window.api.onTodosUpdated(async () => {
    todos = await window.api.loadTodos();
    renderTodos();
  });
  
  window.api.onLanguageChanged((lang) => {
    window.i18n.lang = lang;
    window.i18n.applyTranslations();
  });
  
  window.addEventListener('focus', () => {
    input.focus();
  });
  
  input.focus();
}

function renderTodos() {
  list.innerHTML = '';
  const now = new Date();
  
  const filteredTodos = todos.filter(t => {
    const dim = t.dimension || 'day';
    if (dim !== currentDimension) return false;
    
    // Hide completed tasks that exceed their time dimension
    if (t.completed && t.completedAt) {
      const compDate = new Date(t.completedAt);
      if (dim === 'day') return isSameDay(compDate, now);
      if (dim === 'week') return isSameWeek(compDate, now);
      if (dim === 'month') return isSameMonth(compDate, now);
    }
    
    return true;
  });
  
  // Sort: uncompleted first, then by id (newest first)
  filteredTodos.sort((a, b) => {
    if (a.completed === b.completed) {
      return b.id - a.id;
    }
    return a.completed ? 1 : -1;
  });
  
  filteredTodos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', async () => await toggleTodo(todo.id));
    
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;
    textSpan.addEventListener('click', (e) => {
      // Don't trigger if clicking checkbox/delete
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = todo.text;
      
      const saveEdit = async () => {
        const newText = input.value.trim();
        if (newText && newText !== todo.text) {
          const index = todos.findIndex(t => t.id === todo.id);
          if (index !== -1) {
            todos[index].text = newText;
            await window.api.saveTodos(todos);
          }
        }
        renderTodos();
      };

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.removeEventListener('blur', saveEdit);
          renderTodos();
        }
      });

      textSpan.innerHTML = '';
      textSpan.appendChild(input);
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
    
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    
    if (todo.completed && todo.completedAt) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'completed-time';
      const date = new Date(todo.completedAt);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      timeSpan.textContent = `${month}/${day} ${hours}:${mins}`;
      li.appendChild(timeSpan);
    }
    
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

async function handleNewTodo(text) {
  if (!text) return;
  todos.unshift({
    id: Date.now(),
    text: text,
    completed: false,
    dimension: currentDimension,
    createdAt: Date.now()
  });
  renderTodos();
  await window.api.saveTodos(todos);
}

input.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && input.value.trim()) {
    const text = input.value.trim();
    input.value = '';
    await handleNewTodo(text);
  }
});

const voiceBtn = document.getElementById('voice-btn');
if (voiceBtn && ('webkitSpeechRecognition' in window)) {
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onstart = () => {
    voiceBtn.classList.add('listening');
  };

  recognition.onend = () => {
    voiceBtn.classList.remove('listening');
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      input.value = transcript;
      // Auto save after voice recognition
      setTimeout(async () => {
        input.value = '';
        await handleNewTodo(transcript);
      }, 800);
    }
  };

  voiceBtn.addEventListener('click', () => {
    recognition.lang = window.i18n.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
    recognition.start();
  });
}

async function toggleTodo(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    todos[index].completed = !todos[index].completed;
    if (todos[index].completed) {
      todos[index].completedAt = Date.now();
    } else {
      delete todos[index].completedAt;
    }
    renderTodos();
    await window.api.saveTodos(todos);
  }
}

async function deleteTodo(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    const deleted = todos.splice(index, 1)[0];
    
    // Backup and add to history
    window.api.backupTodos([deleted]);
    deletedHistory.push([deleted]);
    if (deletedHistory.length > 10) deletedHistory.shift();
    if (mainUndoBtn) mainUndoBtn.disabled = false;
    
    renderTodos();
    await window.api.saveTodos(todos);
  }
}

init();
