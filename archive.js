const tbody = document.getElementById('archive-tbody');
const searchInput = document.getElementById('search-input');
const undoBtn = document.getElementById('undo-btn');
const sortHeaders = document.querySelectorAll('th[data-sort]');

let archives = [];
let deletedHistory = [];
let searchQuery = '';
let currentFilter = 'all';
let sortColumn = 'deletedAt';
let sortAsc = false;

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
  
  window.api.onLanguageChanged((lang) => {
    window.i18n.lang = lang;
    window.i18n.applyTranslations();
    renderTable();
  });
  
  window.api.onArchivesUpdated(() => {
    loadData();
  });

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
      if (deletedHistory.length > 0) {
        const lastDeleted = deletedHistory.pop();
        const success = await window.api.restoreArchiveItem(lastDeleted.item, lastDeleted.fileIndex);
        if (success) {
          undoBtn.disabled = deletedHistory.length === 0;
          await loadData();
        }
      }
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
      case 'deletedAt':
        valA = a.deletedAt || 0;
        valB = b.deletedAt || 0;
        break;
      default:
        valA = a.deletedAt || 0;
        valB = b.deletedAt || 0;
    }
    
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  displayArchives.forEach(item => {
    const tr = document.createElement('tr');
    
    const textCell = document.createElement('td');
    textCell.className = 'text-cell';
    renderTaskText(textCell, item.text);
    
    const dimCell = document.createElement('td');
    dimCell.textContent = getDimensionLabel(item.dimension || 'day');
    
    const createdCell = document.createElement('td');
    createdCell.textContent = formatDate(item.createdAt);
    
    const deletedCell = document.createElement('td');
    deletedCell.textContent = formatDate(item.deletedAt);
    
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-perm-btn';
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
        deletedHistory.push({ item: { ...item }, fileIndex: item._fileIndex });
        if (deletedHistory.length > 10) deletedHistory.shift();
        undoBtn.disabled = false;
        await loadData();
      }
    });
    
    actionCell.appendChild(deleteBtn);
    
    tr.appendChild(textCell);
    tr.appendChild(dimCell);
    tr.appendChild(createdCell);
    tr.appendChild(deletedCell);
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
