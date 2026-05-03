/**
 * APP_CONSTANTS
 * Centralized configuration for default values shared across Main and Renderer processes.
 */
const APP_CONSTANTS = {
  // Localization
  DEFAULT_LANG: 'zh-TW',
  
  // Pomodoro Timer
  DEFAULT_POMO_DURATION: 25, // minutes
  AUTO_RESET_POMO_MS: 5 * 60 * 1000, // 5 minutes idle at zero
  
  // Window Dimensions
  MAIN_WIDTH: 420,
  MAIN_HEIGHT: 450,
  TASK_MANAGER_WIDTH: 900,
  TASK_MANAGER_HEIGHT: 600,
  ARCHIVE_WIDTH: 900,
  ARCHIVE_HEIGHT: 600,
  ABOUT_WIDTH: 300,
  ABOUT_HEIGHT: 380,
  
  // History
  MAX_UNDO_STACK: 100
};

// Support Node.js require() in Main process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONSTANTS;
}

// Support browser-style access in Renderer process
if (typeof window !== 'undefined') {
  window.APP_CONSTANTS = APP_CONSTANTS;
}
