// DOM Hooks for the Archive system
const tbody = document.getElementById('archive-tbody');
const searchInput = document.getElementById('search-input');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const sortHeaders = document.querySelectorAll('th[data-sort]');

// Internal state for filtering, sorting, and managing data
let archives = [];
let searchQuery = '';
let currentFilter = 'all';
let sortColumn = 'archiveAt';
let sortAsc = false;

/**
 * Safely parses text and creates clickable HTML anchor tags for URLs
 * @param {HTMLElement} container The wrapper to append text/links to
 * @param {string} text Raw task text content
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
        window.api.openUrl(part); // Safe sandbox URL launch via IPC
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
  
  window.api.onLanguageChanged((lang) => {
    window.i18n.lang = lang;
    window.i18n.applyTranslations();
    renderTable();
  });
  
  window.api.onArchivesUpdated(() => {
    loadData();
  });

  window.api.onUndoStateUpdated((state) => {
    if (undoBtn) undoBtn.disabled = !state.canUndo;
    if (redoBtn) redoBtn.disabled = !state.canRedo;
  });

  const undoState = await window.api.getUndoState();
  if (undoBtn) undoBtn.disabled = !undoState.canUndo;
  if (redoBtn) redoBtn.disabled = !undoState.canRedo;

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTable();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', async () => {
      await window.api.performUndo();
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', async () => {
      await window.api.performRedo();
    });
  }

  sortHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const col = header.dataset.sort;
      if (sortColumn === col) {
        sortAsc = !sortAsc;
      } else {
        sortColumn = col;
        sortAsc = false;
      }
      
      sortHeaders.forEach(h => h.textContent = h.textContent.replace(/[↑↓]/, '').trim());
      header.textContent += sortAsc ? ' ↑' : ' ↓';
      
      renderTable();
    });
  });

  renderTable();
}

async function loadData() {
  archives = await window.api.loadArchives();
  renderTable();
}

function renderTable() {
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const displayArchives = archives.filter(t => {
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
  
  displayArchives.sort((a, b) => {
    let valA, valB;
    switch(sortColumn) {
      case 'completed':
        valA = a.completed ? 1 : 0;
        valB = b.completed ? 1 : 0;
        break;
      case 'text':
        valA = a.text.toLowerCase();
        valB = b.text.toLowerCase();
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
        valA = a.dueDate || 0;
        valB = b.dueDate || 0;
        break;
      case 'archiveAt':
      default:
        valA = a.archiveAt || a.id;
        valB = b.archiveAt || b.id;
    }
    
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  displayArchives.forEach(item => {
    const tr = document.createElement('tr');
    
    const statusCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = !!item.completed;
    checkbox.disabled = true;
    checkbox.style.cursor = 'not-allowed';
    statusCell.appendChild(checkbox);
    
    const textCell = document.createElement('td');
    textCell.className = 'text-cell';
    renderTaskText(textCell, item.text);
    
    const dimCell = document.createElement('td');
    dimCell.textContent = getDimensionLabel(item.dimension || 'day');
    
    const dueCell = document.createElement('td');
    dueCell.textContent = item.dueDate ? formatDate(item.dueDate) : '-';
    
    tr.appendChild(statusCell);
    tr.appendChild(textCell);
    tr.appendChild(dimCell);
    tr.appendChild(dueCell);
    
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'restore-btn';
    restoreBtn.title = 'Restore Task';
    restoreBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <polyline points="10 14 12 12 14 14"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
      </svg>
    `;
    restoreBtn.addEventListener('click', async () => {
      const success = await window.api.restoreArchiveItem(item, item._fileIndex);
      if (success) {
        window.api.pushUndoAction({ type: 'RESTORE', items: [item], fileIndex: item._fileIndex });
        await loadData();
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-perm-btn';
    deleteBtn.title = 'Delete Permanently';
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', async () => {
      const success = await window.api.deleteArchiveItem(item.id, item._fileIndex);
      if (success) {
        window.api.pushUndoAction({ type: 'DELETE_PERM', item: { ...item }, fileIndex: item._fileIndex });
        await loadData();
      }
    });
    
    actionCell.appendChild(restoreBtn);
    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);
    
    tbody.appendChild(tr);
  });
}

function getDimensionLabel(dim) {
  return window.i18n.t(`dim-${dim}`);
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

init();
