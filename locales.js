const translations = {
  'en': {
    'tab-day': 'Day',
    'tab-week': 'Week',
    'tab-month': 'Month',
    'input-placeholder': 'Type a task and press Enter...',
    'history-title': 'Task Management',
    'btn-undo': 'Undo Delete',
    'btn-clear': 'Clear All Completed',
    'col-text': 'Task',
    'col-status': 'Status',
    'col-dim': 'Dimension',
    'col-created': 'Created At',
    'col-completed': 'Completed At',
    'dim-day': 'Day',
    'dim-week': 'Week',
    'dim-month': 'Month',
    'status-active': 'Active',
    'status-completed': 'Completed',
    'confirm-delete-all': 'Are you sure you want to delete all completed tasks?',
    'filter-all': 'All',
    'search-placeholder': 'Search tasks...',
    'about-title': 'About MenuBar Todo',
    'about-desc': 'Minimal & Fast Menubar Todo App',
    'about-version': 'Version',
    'about-author': 'Author',
    'btn-close': 'Close',
    'setting-auto-launch': 'Launch at login'
  },
  'zh-TW': {
    'tab-day': '日',
    'tab-week': '週',
    'tab-month': '月',
    'input-placeholder': '輸入待辦事項，按下 Enter 建立...',
    'history-title': '任務管理',
    'btn-undo': '復原刪除',
    'btn-clear': '清除所有已完成紀錄',
    'col-text': '任務內容',
    'col-status': '狀態',
    'col-dim': '維度',
    'col-created': '建立時間',
    'col-completed': '完成時間',
    'dim-day': '日',
    'dim-week': '週',
    'dim-month': '月',
    'status-active': '進行中',
    'status-completed': '已完成',
    'confirm-delete-all': '確定要刪除所有「已完成」的任務嗎？',
    'filter-all': '全部',
    'search-placeholder': '搜尋任務內容...',
    'about-title': '關於 MenuBar Todo',
    'about-desc': '極簡、極速的選單列待辦清單',
    'about-version': '版本',
    'about-author': '作者',
    'btn-close': '關閉',
    'setting-auto-launch': '開機時自動啟動'
  }
};

window.i18n = {
  lang: 'zh-TW',
  init: async function() {
    if (window.api && window.api.loadConfig) {
      const config = await window.api.loadConfig();
      this.lang = config.lang || 'zh-TW';
    }
    this.applyTranslations();
  },
  setLang: async function(lang) {
    this.lang = lang;
    if (window.api && window.api.saveConfig) {
      await window.api.saveConfig({ lang });
    }
    this.applyTranslations();
  },
  t: function(key) {
    return translations[this.lang][key] || key;
  },
  applyTranslations: function() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      
      if (el.tagName.toLowerCase() === 'input' && el.type === 'text') {
        el.placeholder = this.t(key);
      } else {
        // preserve existing icons or inner structures if necessary by replacing only text node
        // but for this app, innerText is mostly fine, or we replace just the text node.
        // If it's a table header with an arrow, we need to handle that carefully.
        if (el.tagName.toLowerCase() === 'th') {
          // preserve sort arrows
          const arrowMatch = el.textContent.match(/[↑↓]/);
          const arrow = arrowMatch ? ` ${arrowMatch[0]}` : '';
          el.textContent = this.t(key) + arrow;
        } else {
          el.textContent = this.t(key);
        }
      }
    });
  }
};
