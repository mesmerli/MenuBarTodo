// DOM Hooks for the Task Management Interface
const tbody = document.getElementById('history-tbody');
const filterBtns = document.querySelectorAll('.filters .tab');
const clearAllBtn = document.getElementById('clear-all-btn');
const undoBtn = document.getElementById('undo-btn');
const langBtn = document.getElementById('lang-btn');
const searchInput = document.getElementById('search-input');
const todoInput = document.getElementById('todo-input');
const sortHeaders = document.querySelectorAll('th[data-sort]');

// Local component state management
let todos = [];
let currentFilter = 'all';
let searchQuery = '';
let sortColumn = 'createdAt';
let sortAsc = false;
let archiveHistory = []; // Stack of recently archived tasks for quick Undo retrieval
let isSaving = false;

/**
 * Helper to scan task texts and transform standard links into interactive clickables
 * @param {HTMLElement} container Task row target cell
 * @param {string} text Task label string
 */
function renderTaskText(container, text) {
  container.innerHTML = '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  parts.forEach(part => {
    if (part.match(urlRegex)) {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'task-link';
      a.textContent = part;
      a.style.color = 'var(--accent)';
      a.style.textDecoration = 'underline';
      a.style.cursor = 'pointer';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.api.openUrl(part);
      });
      container.appendChild(a);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });
}

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
    const now = Date.now();
    const dim = currentFilter === 'all' ? 'day' : currentFilter;
    let dueOffset = 24 * 60 * 60 * 1000;
    if (dim === 'week') dueOffset = 7 * 24 * 60 * 60 * 1000;
    if (dim === 'month') dueOffset = 30 * 24 * 60 * 60 * 1000;

    const newTodo = {
      id: now,
      text,
      completed: false,
      dimension: dim,
      createdAt: now,
      dueDate: now + dueOffset
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
  // Offline Voice Recognition with Vosk-WASM
  let model = null;
  let recognizer = null;
  let audioContext = null;
  let source = null;
  let processor = null;

  async function startVosk() {
    try {
      if (!model) {
        voiceBtn.style.opacity = '0.5';
        const modelPath = window.i18n.lang === 'zh-TW' ? 'local-model://models/zh.tar.gz' : 'local-model://models/en.tar.gz';
        console.log('History Vosk: Starting model load from', modelPath);
        model = await Vosk.createModel(modelPath);
        console.log('History Vosk: Model loaded successfully!');
        voiceBtn.style.opacity = '1';
      }

      if (!recognizer) {
        recognizer = new model.KaldiRecognizer(16000);
        recognizer.setWords(true);
        
        recognizer.on("result", (message) => {
          const result = message.result;
          if (result.text) {
            todoInput.value = result.text;
            setTimeout(async () => {
              const text = todoInput.value.trim();
              if (text) {
                todoInput.value = '';
                stopVosk();
                await handleNewHistoryTodo(text);
              }
            }, 800);
          }
        });

        recognizer.on("partialresult", (message) => {
          const partial = message.result.partial;
          if (partial) {
            todoInput.value = partial;
          }
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        recognizer.acceptWaveform(event.inputBuffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      
      voiceBtn.classList.add('listening');
    } catch (err) {
      console.error('Vosk Start Error:', err);
      alert('Failed to start voice recognition. Please ensure models are installed in /models folder.');
      voiceBtn.classList.remove('listening');
    }
  }

  function stopVosk() {
    if (processor) {
      processor.disconnect();
      processor = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    voiceBtn.classList.remove('listening');
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (voiceBtn.classList.contains('listening')) {
        stopVosk();
      } else {
        await startVosk();
      }
    });
  }
  
  clearAllBtn.addEventListener('click', async () => {
    const completedTodos = todos.filter(t => t.completed);
    if (completedTodos.length > 0) {
      window.api.archiveTodos(completedTodos);
      archiveHistory.push(completedTodos);
      if (archiveHistory.length > 100) archiveHistory.shift();
      undoBtn.disabled = false;
      
      todos = todos.filter(t => !t.completed);
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    }
  });

  undoBtn.addEventListener('click', async () => {
    if (archiveHistory.length > 0) {
      const lastArchived = archiveHistory.pop();
      
      // Remove these restored tasks from rotation archives
      window.api.removeFromArchive(lastArchived);
      
      todos = [...todos, ...lastArchived];
      undoBtn.disabled = archiveHistory.length === 0;
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    }
  });

  const archiveBtn = document.getElementById('archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', () => {
      window.api.openArchiveWindow();
    });
  }

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
      case 'dueDate':
        valA = a.dueDate || (a.createdAt + (a.dimension === 'week' ? 7*24*60*60*1000 : (a.dimension === 'month' ? 30*24*60*60*1000 : 24*60*60*1000)));
        valB = b.dueDate || (b.createdAt + (b.dimension === 'week' ? 7*24*60*60*1000 : (b.dimension === 'month' ? 30*24*60*60*1000 : 24*60*60*1000)));
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

    // Archive item btn
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'delete-icon-btn';
    archiveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <polyline points="10 12 12 14 14 12"></polyline>
        <line x1="12" y1="8" x2="12" y2="14"></line>
      </svg>
    `;
    archiveBtn.addEventListener('click', async () => {
      window.api.archiveTodos([todo]);
      archiveHistory.push([todo]);
      if (archiveHistory.length > 100) archiveHistory.shift();
      undoBtn.disabled = false;
      
      todos = todos.filter(t => t.id !== todo.id);
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    });

    const dueDateVal = todo.dueDate || (todo.createdAt + (todo.dimension === 'week' ? 7*24*60*60*1000 : (todo.dimension === 'month' ? 30*24*60*60*1000 : 24*60*60*1000)));
    const isOverdue = !todo.completed && Date.now() > dueDateVal;

    tr.innerHTML = `
      <td class="status-cell"></td>
      <td class="text-cell"></td>
      <td>${getDimensionLabel(todo.dimension || 'day')}</td>
      <td>${formatDate(todo.createdAt)}</td>
      <td class="due-cell ${isOverdue ? 'overdue' : ''}" style="cursor: pointer; ${isOverdue ? 'color: var(--danger); font-weight: bold;' : ''}">
        ${formatDate(dueDateVal)}${isOverdue ? ' !' : ''}
      </td>
      <td class="action-cell"></td>
    `;

    const dueCell = tr.querySelector('.due-cell');
    dueCell.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = new Date(dueDateVal);
      const y = current.getFullYear();
      const m = (current.getMonth() + 1).toString().padStart(2, '0');
      const d = current.getDate().toString().padStart(2, '0');
      const h = current.getHours().toString().padStart(2, '0');
      const min = current.getMinutes().toString().padStart(2, '0');
      
      const input = document.createElement('input');
      input.type = 'datetime-local';
      input.className = 'edit-input';
      input.value = `${y}-${m}-${d}T${h}:${min}`;
      input.style.width = '180px';
      input.style.color = 'var(--text-primary)';
      input.style.background = 'rgba(0,0,0,0.3)';
      input.style.border = '1px solid var(--accent)';
      input.style.borderRadius = '4px';
      
      const saveDue = async () => {
        if (input.value) {
          const newDate = new Date(input.value);
          if (!isNaN(newDate.getTime())) {
            const idx = todos.findIndex(t => t.id === todo.id);
            if (idx !== -1) {
              todos[idx].dueDate = newDate.getTime();
              isSaving = true;
              await window.api.saveTodos(todos);
              isSaving = false;
            }
          }
        }
        renderTable();
      };

      input.addEventListener('blur', saveDue);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.removeEventListener('blur', saveDue);
          renderTable();
        }
      });

      dueCell.innerHTML = '';
      dueCell.appendChild(input);
      if (input.showPicker) input.showPicker();
      input.focus();
    });

    const textCell = tr.querySelector('.text-cell');
    renderTaskText(textCell, todo.text);
    textCell.style.cursor = 'text';
    textCell.addEventListener('click', (e) => {
      // Don't trigger if clicking a link
      if (e.target.tagName === 'A') return;
      
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
    tr.querySelector('.action-cell').appendChild(archiveBtn);
  });
}

init();
