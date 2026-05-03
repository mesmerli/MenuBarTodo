const translations = {
  'en': {
    'tab-day': 'Today',
    'tab-week': 'Incoming',
    'tab-month': 'Future',
    'input-placeholder': 'Type a task and press Enter...',
    'history-title': 'Task Management',
    'btn-undo': 'Undo',
    'btn-redo': 'Redo',
    'btn-history': 'Task History',
    'btn-clear': 'Clear All Completed',
    'col-text': 'Task',
    'col-status': 'Status',
    'col-dim': 'Dimension',
    'col-created': 'Created At',
    'col-due': 'Due Date',
    'dim-day': 'Today',
    'dim-week': 'Incoming',
    'dim-month': 'Future',
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
    'setting-auto-launch': 'Launch at login',
    'setting-widget-mode': 'Desktop Widget Mode',
    'archive-title': 'Archived Tasks',
    'btn-archive': 'Open Archive',
    'col-deleted': 'Archived At',
    'tray-show': 'Show Main Window',
    'tray-about': 'About',
    'tray-exit': 'Exit'
  },
  'zh-TW': {
    'tab-day': '今天',
    'tab-week': '近期',
    'tab-month': '未來',
    'input-placeholder': '輸入待辦事項，按下 Enter 建立...',
    'history-title': '任務管理',
    'btn-undo': '復原',
    'btn-redo': '重做',
    'btn-history': '任務歷史紀錄',
    'btn-clear': '清除所有已完成紀錄',
    'col-text': '任務內容',
    'col-status': '狀態',
    'col-dim': '維度',
    'col-created': '建立時間',
    'col-due': '到期時間',
    'dim-day': '今天',
    'dim-week': '近期',
    'dim-month': '未來',
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
    'setting-auto-launch': '開機時自動啟動',
    'setting-widget-mode': '桌面小工具模式',
    'archive-title': '封存任務',
    'btn-archive': '開啟封存庫',
    'col-deleted': '封存時間',
    'tray-show': '顯示主視窗',
    'tray-about': '關於',
    'tray-exit': '結束'
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
        if (el.tagName.toLowerCase() === 'th') {
          const arrowMatch = el.textContent.match(/[↑↓]/);
          const arrow = arrowMatch ? ` ${arrowMatch[0]}` : '';
          el.textContent = this.t(key) + arrow;
        } else {
          el.textContent = this.t(key);
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
    });
  }
};
