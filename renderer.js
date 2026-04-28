const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const tabBtns = document.querySelectorAll('.tab');
const settingsBtn = document.getElementById('settings-btn');
const mainUndoBtn = document.getElementById('main-undo-btn');
const pomoTimerDisplay = document.getElementById('pomo-timer');
const pomoBtn = document.getElementById('pomo-btn');

let todos = [];
let deletedHistory = [];
let currentDimension = 'day';

// Pomodoro Logic (Main Process Sync)
let pomoDuration = 30; 
let pomoTime = pomoDuration * 60;
let pomoRunning = false;
let hasPlayedDing = false;

let pomoConfiguredSeconds = 30 * 60;

function playTickSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.error('Failed to play tick sound:', e);
  }
}

function playDingSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.error('Failed to play ding sound:', e);
  }
}

function updatePomoDisplay(state) {
  if (state) {
    pomoTime = state.pomoTime;
    pomoRunning = state.pomoRunning;
    pomoDuration = state.pomoDuration;
    if (state.pomoConfiguredSeconds !== undefined) {
      pomoConfiguredSeconds = state.pomoConfiguredSeconds;
    }
  }
  const m = Math.floor(pomoTime / 60).toString().padStart(2, '0');
  const s = (pomoTime % 60).toString().padStart(2, '0');
  pomoTimerDisplay.textContent = `${m}:${s}`;
  
  if (pomoRunning) {
    pomoBtn.style.color = 'var(--accent)';
    hasPlayedDing = false; 
    if (pomoTime <= 10 && pomoTime > 0) {
      pomoTimerDisplay.classList.add('pomo-flashing');
      playTickSound();
    } else {
      pomoTimerDisplay.classList.remove('pomo-flashing');
    }
  } else {
    pomoBtn.style.color = 'inherit';
    if (pomoTime === 0) {
      pomoTimerDisplay.classList.add('pomo-flashing');
      if (!hasPlayedDing) {
        playDingSound();
        hasPlayedDing = true;
      }
    } else {
      pomoTimerDisplay.classList.remove('pomo-flashing');
    }
  }
}

if (pomoBtn) {
  pomoBtn.addEventListener('click', () => window.api.pomoToggle());
}

if (pomoTimerDisplay) {
  pomoTimerDisplay.addEventListener('click', () => {
    if (pomoRunning) return; 
    
    const input = document.createElement('input');
    input.type = 'text';
    
    // If countdown reached zero, fallback to last manual duration
    const targetTime = pomoTime === 0 ? pomoConfiguredSeconds : pomoTime;
    const curM = Math.floor(targetTime / 60).toString().padStart(2, '0');
    const curS = (targetTime % 60).toString().padStart(2, '0');
    input.value = `${curM}:${curS}`;
    
    input.style.width = '75px';
    input.style.fontSize = '18px';
    input.style.fontWeight = 'bold';
    input.style.textAlign = 'center';
    input.style.color = 'var(--accent)';
    input.style.background = 'rgba(0, 0, 0, 0.2)';
    input.style.border = '1px solid var(--glass-border)';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';
    input.style.fontFamily = 'monospace';
    
    input.addEventListener('wheel', (e) => {
      e.preventDefault();
      const parts = input.value.trim().split(':');
      let mins = parseInt(parts[0]) || 0;
      let secs = parts[1] !== undefined ? (parseInt(parts[1]) || 0) : 0;
      
      if (e.deltaY < 0) {
        mins += 1;
      } else {
        if (mins > 0) mins -= 1;
      }
      
      input.value = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });
    
    const savePomo = () => {
      const parts = input.value.trim().split(':');
      let mins = 30;
      let secs = 0;
      
      if (parts.length >= 1) {
        mins = parseInt(parts[0]) || 0;
      }
      if (parts.length >= 2) {
        secs = parseInt(parts[1]) || 0;
      }
      
      const totalSeconds = Math.max(1, mins * 60 + secs);
      window.api.pomoSetDuration(totalSeconds);
    };

    input.addEventListener('blur', savePomo);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const parts = input.value.trim().split(':');
        let mins = parseInt(parts[0]) || 0;
        let secs = parts[1] !== undefined ? (parseInt(parts[1]) || 0) : 0;
        
        if (e.key === 'ArrowUp') {
          mins += 1;
        } else {
          if (mins > 0) mins -= 1;
        }
        
        input.value = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return;
      }
      
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.removeEventListener('blur', savePomo);
        updatePomoDisplay();
      }
    });

    pomoTimerDisplay.innerHTML = '';
    pomoTimerDisplay.appendChild(input);
    input.focus();
    input.select();
  });
}

window.api.onPomoTick((state) => updatePomoDisplay(state));
window.api.pomoGetState();

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
    window.api.openTaskManagerWindow();
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
      
      if (window.api.removeFromArchive) {
        window.api.removeFromArchive(lastDeleted);
      }
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
    return dim === currentDimension;
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
    renderTaskText(textSpan, todo.text);
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
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <polyline points="10 12 12 14 14 12"></polyline>
        <line x1="12" y1="8" x2="12" y2="14"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
    
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    
    // Due Date Display
    const dueSpan = document.createElement('span');
    dueSpan.className = 'due-date';
    // Fallback for old tasks without dueDate
    const defaultOffset = todo.dimension === 'week' ? 7*24*60*60*1000 : (todo.dimension === 'month' ? 30*24*60*60*1000 : 24*60*60*1000);
    const dueDateVal = todo.dueDate || (todo.createdAt + defaultOffset);
    const dueDate = new Date(dueDateVal);
    
    const isOverdue = !todo.completed && Date.now() > dueDateVal;
    const month = (dueDate.getMonth() + 1).toString().padStart(2, '0');
    const day = dueDate.getDate().toString().padStart(2, '0');
    const hours = dueDate.getHours().toString().padStart(2, '0');
    const mins = dueDate.getMinutes().toString().padStart(2, '0');
    dueSpan.textContent = `${month}/${day} ${hours}:${mins}${isOverdue ? ' !' : ''}`;
    if (isOverdue) dueSpan.classList.add('overdue');
    
    // Handle inline due date editing on click
    dueSpan.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering parent task click events
      
      // Format existing due date to YYYY-MM-DDTHH:MM for HTML5 input
      const current = new Date(dueDateVal);
      const y = current.getFullYear();
      const m = (current.getMonth() + 1).toString().padStart(2, '0');
      const d = current.getDate().toString().padStart(2, '0');
      const h = current.getHours().toString().padStart(2, '0');
      const min = current.getMinutes().toString().padStart(2, '0');

      // Create datetime-local input overlay
      const input = document.createElement('input');
      input.type = 'datetime-local';
      input.className = 'edit-input';
      input.value = `${y}-${m}-${d}T${h}:${min}`;
      input.style.width = '160px';
      input.style.color = 'var(--text-primary)';
      input.style.background = 'rgba(0,0,0,0.3)';
      input.style.border = '1px solid var(--accent)';
      input.style.borderRadius = '4px';
      
      // Function to save the new due date to disk
      const saveDue = async () => {
        if (input.value) {
          const newDate = new Date(input.value);
          if (!isNaN(newDate.getTime())) {
            const index = todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
              todos[index].dueDate = newDate.getTime();
              await window.api.saveTodos(todos);
            }
          }
        }
        renderTodos(); // Refresh visual states
      };

      // Persist edits on losing focus or confirmation
      input.addEventListener('blur', saveDue);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.removeEventListener('blur', saveDue);
          renderTodos();
        }
      });

      dueSpan.innerHTML = '';
      dueSpan.appendChild(input);
      if (input.showPicker) input.showPicker();
      input.focus();
    });
    li.appendChild(dueSpan);
    
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

async function handleNewTodo(text) {
  if (!text) return;
  const now = Date.now();
  let dueOffset = 24 * 60 * 60 * 1000; // default 1 day
  if (currentDimension === 'week') dueOffset = 7 * 24 * 60 * 60 * 1000;
  if (currentDimension === 'month') dueOffset = 30 * 24 * 60 * 60 * 1000;

  todos.unshift({
    id: now,
    text: text,
    completed: false,
    dimension: currentDimension,
    createdAt: now,
    dueDate: now + dueOffset
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

// Offline Voice Recognition via Vosk-WASM
const voiceBtn = document.getElementById('voice-btn');
let model = null;
let recognizer = null;
let audioContext = null;
let source = null;
let processor = null;

/**
 * Starts audio recording and feeds raw PCM streams into the Vosk engine
 */
async function startVosk() {
  try {
    // Load the respective model dynamically based on locale if not cached
    if (!model) {
      voiceBtn.style.opacity = '0.5';
      const modelPath = window.i18n.lang === 'zh-TW' ? 'local-model://models/zh.tar.gz' : 'local-model://models/en.tar.gz';
      console.log('Vosk: Starting model load from', modelPath);
      model = await Vosk.createModel(modelPath);
      console.log('Vosk: Model loaded successfully!');
      voiceBtn.style.opacity = '1';
    }

    // Initialize inference recognizer at standard 16kHz sample rate
    if (!recognizer) {
      recognizer = new model.KaldiRecognizer(16000);
      recognizer.setWords(true); // Capture precise timestamps per word if needed
      
      // Finalized full phrase detection
      recognizer.on("result", (message) => {
        const result = message.result;
        if (result.text) {
          input.value = result.text;
          // Auto-commit transcribed text into Todo item after a brief pause
          setTimeout(async () => {
            const text = input.value.trim();
            if (text) {
              input.value = '';
              stopVosk(); // Release microphone hardware
              await handleNewTodo(text);
            }
          }, 800);
        }
      });

      // Live ongoing partial speech transcription (real-time updates)
      recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        if (partial) {
          input.value = partial;
        }
      });
    }

    // Connect directly to hardware microphone via browser Media Capture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 16000,
      },
    });

    // Route audio signals: Mic -> AudioContext -> ScriptProcessor -> Vosk Engine
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    // Continually pipe raw PCM audio buffers into standard inference loop
    processor.onaudioprocess = (event) => {
      recognizer.acceptWaveform(event.inputBuffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    
    voiceBtn.classList.add('listening'); // Trigger CSS pulse animations
  } catch (err) {
    console.error('Vosk Start Error:', err);
    alert('Failed to start voice recognition. Please ensure models are installed in /models folder.');
    voiceBtn.classList.remove('listening');
  }
}

/**
 * Safely detaches the audio stream and frees native system resources
 */
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
    
    // Archive and add to history
    window.api.archiveTodos([deleted]);
    deletedHistory.push([deleted]);
    if (deletedHistory.length > 10) deletedHistory.shift();
    if (mainUndoBtn) mainUndoBtn.disabled = false;
    
    renderTodos();
    await window.api.saveTodos(todos);
  }
}

init();
