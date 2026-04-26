const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');

test.describe('MenuBar Todo E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Launch the app
    electronApp = await electron.launch({ args: ['.', '--test'] });
    window = await electronApp.firstWindow();
    // Wait for the app to be ready
    await window.waitForSelector('#todo-input');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should add a new todo item', async () => {
    const input = window.locator('#todo-input');
    const taskText = 'Playwright Test Task ' + Date.now();
    
    await input.fill(taskText);
    await input.press('Enter');

    // Check if the task appears in the list
    const todoList = window.locator('#todo-list');
    await expect(todoList).toContainText(taskText);
  });

  test('should toggle todo status', async () => {
    // Wait for at least one item
    const firstCheckbox = window.locator('.todo-checkbox').first();
    const firstItem = window.locator('.todo-item').first();
    
    const wasCompleted = await firstItem.evaluate(el => el.classList.contains('completed'));
    
    // Use check/uncheck for checkboxes in Playwright
    if (wasCompleted) {
      await firstCheckbox.uncheck();
      await expect(firstItem).not.toHaveClass(/completed/, { timeout: 5000 });
    } else {
      await firstCheckbox.check();
      await expect(firstItem).toHaveClass(/completed/, { timeout: 5000 });
    }
  });

  test('should switch dimensions (tabs)', async () => {
    const weekTab = window.locator('.tab[data-dimension="week"]');
    const dayTab = window.locator('.tab[data-dimension="day"]');

    await weekTab.click();
    await expect(weekTab).toHaveClass(/active/);
    
    await dayTab.click();
    await expect(dayTab).toHaveClass(/active/);
  });

  test('should open task management window', async () => {
    const settingsBtn = window.locator('#settings-btn');
    await settingsBtn.click();
    
    // Electron apps can have multiple windows, get the new one
    const pages = electronApp.windows();
    // Wait a bit for window to open if needed
    let historyWindow;
    for (const p of pages) {
      const title = await p.title();
      if (title.includes('任務') || title.includes('Management')) {
        historyWindow = p;
        break;
      }
    }
    
    // If not found in current pages, wait for it
    if (!historyWindow) {
      historyWindow = await electronApp.waitForEvent('window');
    }
    
    expect(historyWindow).toBeDefined();
    await expect(historyWindow).toHaveTitle(/任務管理|Task Management/);
  });
});
