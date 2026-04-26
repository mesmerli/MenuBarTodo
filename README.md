# MenuBar Todo 📝

[![Electron](https://img.shields.io/badge/Electron-41.3.0-blue.svg)](https://electronjs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**MenuBar Todo** 是一款專為追求效率的開發者與專業人士設計的極簡系統列待辦清單。常駐於您的 Windows 選單列，隨時隨地記錄您的靈感與任務。

---

## ✨ 核心特色

- 🚀 **極速召喚**：使用 `Ctrl + Shift + Space` 全域快捷鍵瞬間顯示/隱藏視窗。
- 🎙️ **語音輸入**：內建智慧語音辨識，動口就能建立待辦事項。
- 📅 **多維度管理**：支援「日、週、月」時間維度，讓短期任務與長期規劃一覽無遺。
- 🎨 **現代化視覺**：霓虹暗黑風格設計，搭配毛玻璃特效與流暢微動畫。
- 🛠️ **強大管理中心**：專屬任務管理視窗，支援即時搜尋、行內編輯與多欄位排序。
- 💾 **自動備份**：具備 5 檔案循環自動備份機制，資料安全不遺失。
- 🛡️ **隱私守護**：資料 100% 儲存於本地端，不經任何伺服器。
- 🌐 **多國語言**：完整支援繁體中文與英文。

---

## ⌨️ 快捷鍵說明

| 動作 | 快捷鍵 |
| :--- | :--- |
| **顯示 / 隱藏主視窗** | `Ctrl + Shift + Space` |
| **快速建立任務** | `Enter` (在輸入框中) |
| **取消編輯 / 隱藏** | `Esc` |

---

## 🛠️ 開發與安裝

### 1. 安裝環境
確保您的電腦已安裝 [Node.js](https://nodejs.org/)。

### 2. 下載與安裝依賴
```bash
git clone https://github.com/mesmerli/MenuBarTodo.git
cd MenuBarTodo
npm install
```

### 3. 開發模式執行
```bash
npm start
```

### 4. 打包執行檔 (Production Build)
```bash
# 打包為免安裝與安裝檔
npm run dist
```

### 5. 執行自動化測試 (E2E)
本專案使用 Playwright 進行自動化測試：
```bash
npm test
```

---

## 📦 技術棧

- **核心**: Electron, Node.js
- **介面**: HTML5, Vanilla CSS, JavaScript
- **測試**: Playwright
- **打包**: Electron Builder

---

## 📄 授權協議

本專案採用 [ISC License](LICENSE) 授權。

---

**Developed with ❤️ by [mesmerli](https://github.com/mesmerli)**
