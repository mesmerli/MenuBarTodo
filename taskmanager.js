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

  const widgetModeBtn = document.getElementById('widget-mode-btn');
  if (widgetModeBtn) {
    const config = await window.api.loadConfig();
    let isWidget = !!config.widgetMode;
    if (isWidget) {
      widgetModeBtn.classList.add('active');
    }
    
    widgetModeBtn.addEventListener('click', async () => {
      const cfg = await window.api.loadConfig();
      isWidget = !isWidget;
      cfg.widgetMode = isWidget;
      await window.api.saveConfig(cfg);
      
      if (isWidget) {
        widgetModeBtn.classList.add('active');
      } else {
        widgetModeBtn.classList.remove('active');
      }
      
      if (window.api.setWidgetMode) {
        window.api.setWidgetMode(isWidget);
      }
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
    let baseTime = now + (24 * 60 * 60 * 1000);
    if (dim === 'day') baseTime = now + (4 * 60 * 60 * 1000);
    if (dim === 'week') baseTime = now + (7 * 24 * 60 * 60 * 1000);
    if (dim === 'month') baseTime = now + (30 * 24 * 60 * 60 * 1000);

    const d = new Date(baseTime);
    const mins = d.getMinutes();
    if (mins === 0) {
      d.setMinutes(0, 0, 0);
    } else if (mins <= 30) {
      d.setMinutes(30, 0, 0);
    } else {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0, 0, 0);
    }
    const dueTime = d.getTime();

    const newTodo = {
      id: now,
      text,
      completed: false,
      dimension: dim,
      createdAt: now,
      dueDate: dueTime
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
      archiveHistory.push({ type: 'ARCHIVE', items: completedTodos });
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
      const lastAction = archiveHistory.pop();
      
      if (Array.isArray(lastAction)) {
        window.api.removeFromArchive(lastAction);
        todos = [...todos, ...lastAction];
      } else if (lastAction.type === 'ARCHIVE') {
        window.api.removeFromArchive(lastAction.items);
        todos = [...todos, ...lastAction.items];
      } else if (lastAction.type === 'TOGGLE') {
        const idx = todos.findIndex(t => t.id === lastAction.id);
        if (idx !== -1) {
          todos[idx].completed = lastAction.wasCompleted;
          if (todos[idx].completed) {
            todos[idx].completedAt = Date.now();
          } else {
            delete todos[idx].completedAt;
          }
        }
      } else if (lastAction.type === 'EDIT_DUEDATE') {
        const idx = todos.findIndex(t => t.id === lastAction.id);
        if (idx !== -1) {
          if (lastAction.wasDueDate) {
            todos[idx].dueDate = lastAction.wasDueDate;
          } else {
            delete todos[idx].dueDate;
          }
        }
      }
      
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
        const wasCompleted = !checkbox.checked;
        todos[idx].completed = checkbox.checked;
        if (checkbox.checked) {
          todos[idx].completedAt = Date.now();
        } else {
          delete todos[idx].completedAt;
        }
        
        archiveHistory.push({ type: 'TOGGLE', id: todo.id, wasCompleted: wasCompleted });
        if (archiveHistory.length > 100) archiveHistory.shift();
        undoBtn.disabled = false;

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
      archiveHistory.push({ type: 'ARCHIVE', items: [todo] });
      if (archiveHistory.length > 100) archiveHistory.shift();
      undoBtn.disabled = false;
      
      todos = todos.filter(t => t.id !== todo.id);
      isSaving = true;
      await window.api.saveTodos(todos);
      isSaving = false;
      renderTable();
    });

    const dueDateVal = todo.dueDate;
    const isOverdue = dueDateVal && !todo.completed && Date.now() > dueDateVal;
    const dueStr = dueDateVal ? formatDate(dueDateVal) : '-';

    tr.innerHTML = `
      <td class="status-cell"></td>
      <td class="text-cell"></td>
      <td>${getDimensionLabel(todo.dimension || 'day')}</td>
      <td class="due-cell ${isOverdue ? 'overdue' : ''}" style="cursor: pointer; ${isOverdue ? 'color: var(--danger); font-weight: bold;' : ''}">
        ${dueStr}${isOverdue ? ' !' : ''}
      </td>
      <td class="action-cell"></td>
    `;

    const dueCell = tr.querySelector('.due-cell');
    dueCell.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = new Date(dueDateVal || Date.now());
      const y = current.getFullYear();
      const m = (current.getMonth() + 1).toString().padStart(2, '0');
      const d = current.getDate().toString().padStart(2, '0');
      const h = current.getHours().toString().padStart(2, '0');
      const min = current.getMinutes().toString().padStart(2, '0');
      
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '6px';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.style.width = '155px';
      input.style.color = 'var(--text-primary)';
      input.style.background = 'rgba(0,0,0,0.3)';
      input.style.border = '1px solid var(--accent)';
      input.style.borderRadius = '4px';
      input.style.textAlign = 'center';

      let currentMs = dueDateVal;
      const updateInputValue = (ms) => {
        const date = new Date(ms);
        const yy = date.getFullYear();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const hh = date.getHours().toString().padStart(2, '0');
        const mn = date.getMinutes().toString().padStart(2, '0');
        input.value = `${yy}/${mm}/${dd} ${hh}:${mn}`;
      };
      updateInputValue(currentMs);

      const adjustDate = (minsOffset) => {
        const parsed = new Date(input.value.replace(/\//g, '-'));
        let baseMs = isNaN(parsed.getTime()) ? currentMs : parsed.getTime();
        baseMs += minsOffset * 60 * 1000;
        currentMs = baseMs;
        updateInputValue(currentMs);
      };

      input.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) adjustDate(30);
        else adjustDate(-30);
      });
      
      let isSavingDue = false;
      const saveDue = async () => {
        if (isSavingDue) return;
        isSavingDue = true;
        if (input.value) {
          const normalizedValue = input.value.trim().replace(/\//g, '-');
          const newDate = new Date(normalizedValue);
          if (!isNaN(newDate.getTime())) {
            const idx = todos.findIndex(t => t.id === todo.id);
            if (idx !== -1) {
              const wasDueDate = todos[idx].dueDate;
              if (wasDueDate !== newDate.getTime()) {
                todos[idx].dueDate = newDate.getTime();
                
                archiveHistory.push({ type: 'EDIT_DUEDATE', id: todo.id, wasDueDate: wasDueDate });
                if (archiveHistory.length > 100) archiveHistory.shift();
                undoBtn.disabled = false;

                isSaving = true;
                await window.api.saveTodos(todos);
                isSaving = false;
              }
            }
          }
        }
        renderTable();
      };

      input.addEventListener('blur', saveDue);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          adjustDate(30);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          adjustDate(-30);
          return;
        }
        if (e.key === 'Enter') saveDue();
        if (e.key === 'Escape') renderTable();
      });

      dueCell.innerHTML = '';
      dueCell.appendChild(input);
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
