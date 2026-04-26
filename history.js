const tbody = document.getElementById('history-tbody');
const filterBtns = document.querySelectorAll('.filters .tab');
const clearAllBtn = document.getElementById('clear-all-btn');
const undoBtn = document.getElementById('undo-btn');
const langBtn = document.getElementById('lang-btn');
const searchInput = document.getElementById('search-input');
const todoInput = document.getElementById('todo-input');
const sortHeaders = document.querySelectorAll('th[data-sort]');

let todos = [];
let currentFilter = 'all';
let searchQuery = '';
let sortColumn = 'completedAt';
let sortAsc = false;
let deletedHistory = []; // Stack of deleted tasks (up to 10)
let isSaving = false;

async function init() {
  await window.i18n.init();
  await loadData();
  
  window.api.onTodosUpdated(async () => {
    if (!isSaving) {
      await loadData();
    }
  });

  const autoLaunchCheckbox = document.getElementById('auto-launch-checkbox');
  if (autoLaunchCheckbox) {
    const isAutoLaunch = await window.api.getAutoLaunch();
    autoLaunchCheckbox.checked = isAutoLaunch;
    
    autoLaunchCheckbox.addEventListener('change', async () => {
      await window.api.setAutoLaunch(autoLaunchCheckbox.checked);
    });
  }
  
  window.api.onLanguageChanged((lang) => {
    window.i18n.lang = lang;
    window.i18n.applyTranslations();
    renderTable(); // Re-render to update dynamic JS text
  });
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });
  }

  async function handleNewHistoryTodo(text) {
    if (!text) return;
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
      dimension: currentFilter === 'all' ? 'day' : currentFilter,
      createdAt: Date.now()
    };
    todos.unshift(newTodo);
    isSaving = true;
    await window.api.saveTodos(todos);
    isSaving = false;
    renderTable();
  }

  if (todoInput) {
    todoInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const text = todoInput.value.trim();
        if (text) {
          todoInput.value = '';
          await handleNewHistoryTodo(text);
        }
      }
    });
  }

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
        todoInput.value = transcript;
        setTimeout(async () => {
          todoInput.value = '';
          await handleNewHistoryTodo(transcript);
        }, 800);
      }
    };

    voiceBtn.addEventListener('click', () => {
      recognition.lang = window.i18n.lang === 'zh-TW' ? 'zh-TW' : 'en-US';
      recognition.start();
    });
  }
  
  clearAllBtn.addEventListener('click', async () => {
    const completedTodos = todos.filter(t => t.completed);
    if (completedTodos.length > 0) {
      window.api.backupTodos(completedTodos);
      deletedHistory.push(completedTodos);
      if (deletedHistory.length > 10) deletedHistory.shift();
      undoBtn.disabled = false;
      
      todos = todos.filter(t => !t.completed);
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    }
  });

  undoBtn.addEventListener('click', async () => {
    if (deletedHistory.length > 0) {
      const lastDeleted = deletedHistory.pop();
      todos = [...todos, ...lastDeleted];
      undoBtn.disabled = deletedHistory.length === 0;
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    }
  });

  langBtn.addEventListener('click', async () => {
    const newLang = window.i18n.lang === 'zh-TW' ? 'en' : 'zh-TW';
    await window.i18n.setLang(newLang);
  });

  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortAsc = !sortAsc;
      } else {
        sortColumn = col;
        sortAsc = false;
      }
      renderTable();
    });
  });
}

async function loadData() {
  todos = await window.api.loadTodos();
  renderTable();
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${date.getFullYear()}/${m}/${d} ${h}:${min}`;
}

function getDimensionLabel(dim) {
  return window.i18n.t('dim-' + dim) || window.i18n.t('dim-day');
}

function renderTable() {
  tbody.innerHTML = '';
  
  // Update sort indicators
  sortHeaders.forEach(th => {
    const col = th.dataset.sort;
    let label = th.textContent.replace(/[↑↓]/g, '').trim();
    if (sortColumn === col) {
      th.textContent = `${label} ${sortAsc ? '↑' : '↓'}`;
    } else {
      th.textContent = label;
    }
  });

  let displayTodos = todos.filter(t => {
    // Dimension filter
    if (currentFilter !== 'all' && (t.dimension || 'day') !== currentFilter) {
      return false;
    }
    // Search query filter
    if (searchQuery && !t.text.toLowerCase().includes(searchQuery)) {
      return false;
    }
    return true;
  });
  
  // Sort displayTodos
  displayTodos.sort((a, b) => {
    let valA, valB;
    switch(sortColumn) {
      case 'text':
        valA = a.text.toLowerCase();
        valB = b.text.toLowerCase();
        break;
      case 'status':
        valA = a.completed ? 1 : 0;
        valB = b.completed ? 1 : 0;
        break;
      case 'dimension':
        valA = a.dimension || 'day';
        valB = b.dimension || 'day';
        break;
      case 'createdAt':
        valA = a.createdAt || a.id;
        valB = b.createdAt || b.id;
        break;
      case 'completedAt':
        valA = a.completedAt || 0;
        valB = b.completedAt || 0;
        break;
      default:
        valA = a.completedAt || a.createdAt || a.id;
        valB = b.completedAt || b.createdAt || b.id;
    }
    
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  displayTodos.forEach(todo => {
    const tr = document.createElement('tr');
    if (todo.completed) tr.classList.add('completed');
    
    // Checkbox status
    const statusCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener('change', async () => {
      const idx = todos.findIndex(t => t.id === todo.id);
      if (idx !== -1) {
        todos[idx].completed = checkbox.checked;
        if (checkbox.checked) {
          todos[idx].completedAt = Date.now();
        } else {
          delete todos[idx].completedAt;
        }
        isSaving = true;
        await window.api.saveTodos(todos);
        isSaving = false;
        renderTable();
      }
    });
    statusCell.appendChild(checkbox);

    // Delete btn
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-icon-btn';
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', async () => {
      window.api.backupTodos([todo]);
      deletedHistory.push([todo]);
      if (deletedHistory.length > 10) deletedHistory.shift();
      undoBtn.disabled = false;
      
      todos = todos.filter(t => t.id !== todo.id);
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    });

    tr.innerHTML = `
      <td class="status-cell"></td>
      <td class="text-cell"></td>
      <td>${getDimensionLabel(todo.dimension || 'day')}</td>
      <td>${formatDate(todo.createdAt)}</td>
      <td>${formatDate(todo.completedAt)}</td>
      <td class="action-cell"></td>
    `;

    const textCell = tr.querySelector('.text-cell');
    textCell.textContent = todo.text;
    textCell.style.cursor = 'text';
    textCell.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = todo.text;
      
      const saveEdit = async () => {
        const newText = input.value.trim();
        if (newText && newText !== todo.text) {
          const idx = todos.findIndex(t => t.id === todo.id);
          if (idx !== -1) {
            todos[idx].text = newText;
            isSaving = true;
            await window.api.saveTodos(todos);
            isSaving = false;
          }
        }
        renderTable();
      };

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.removeEventListener('blur', saveEdit);
          renderTable();
        }
      });

      textCell.innerHTML = '';
      textCell.appendChild(input);
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
    
    tbody.appendChild(tr);
    tr.querySelector('.status-cell').appendChild(checkbox);
    tr.querySelector('.action-cell').appendChild(deleteBtn);
  });
}

init();
