# 如何在本地開發環境模擬微軟商店 (MSIX) 試用期

本文件說明如何在本地開發環境中，模擬測試 `MenuBar Todo` 應用程式在 Microsoft Store 試用期（Trial）的各種狀態。

由於 Windows 商店的授權 API (`Windows.Services.Store`) 需要應用程式正式上架並部署於使用者電腦上才能抓取到真實的試用授權，在本地開發環境中執行時會預設返回 `isTrial = false`。因此，若要測試「試用中」與「試用已過期」的行為，請依下方步驟修改前端代碼進行模擬。

---

## 模擬 1：主視窗 (Todo Menu 主畫面)

主視窗的試用期限制與邏輯寫在 [renderer.js](file:///c:/Users/mesme/workspace/todoMenu/renderer.js) 中。

### 步驟：
1. 開啟 [renderer.js](file:///c:/Users/mesme/workspace/todoMenu/renderer.js) 找到 `fnCheckTrialLicense()` 函數。
2. 找到內建的 **測試模擬區塊**，將下方四行程式碼的註解（`//`）移除：

```javascript
// 移除註解前：
// const jsEpochTicks = 11644473600000;
// const oneDayAgoMs = -1 * 24 * 60 * 60 * 1000;
// const mockExpirationTicks = (Date.now() + oneDayAgoMs + jsEpochTicks) * 10000;
// status = { isTrial: true, expirationDate: mockExpirationTicks };

// 移除註解後：
const jsEpochTicks = 11644473600000;
const oneDayAgoMs = -1 * 24 * 60 * 60 * 1000; // 過期天數 (負值為已過期，正值為未過期剩餘天數)
const mockExpirationTicks = (Date.now() + oneDayAgoMs + jsEpochTicks) * 10000;
status = { isTrial: true, expirationDate: mockExpirationTicks };
```

### 測試情境：
* **模擬「已過期」**：將 `oneDayAgoMs` 設為負值（例如 `-1 * 24 * 60 * 60 * 1000`）。存檔後開啟主視窗，輸入框將被鎖定，並顯示 `試用期已結束 (請至 Microsoft Store 購買完整版)`。
* **模擬「試用中 (未過期)」**：將 `oneDayAgoMs` 設為正值（例如 `7 * 24 * 60 * 60 * 1000` 模擬剩餘 7 天）。存檔後主畫面仍可正常新增待辦事項。

---

## 模擬 2：關於視窗 (About Window)

關於視窗的試用剩餘天數顯示邏輯寫在 [about.html](file:///c:/Users/mesme/workspace/todoMenu/about.html) 中。

### 步驟：
1. 開啟 [about.html](file:///c:/Users/mesme/workspace/todoMenu/about.html) 找到 `Check Microsoft Store trial status` 區塊。
2. 將對應的模擬區塊註解拿掉：

```javascript
// 啟用此模擬區塊：
const jsEpochTicks = 11644473600000;
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 模擬剩餘 7 天 (改為負數則模擬過期)
const mockExpirationTicks = (Date.now() + sevenDaysMs + jsEpochTicks) * 10000;

let status = { isTrial: true, expirationDate: mockExpirationTicks };
```

### 測試情境：
* 當剩餘天數為正數時，關於視窗中會額外顯示紫色標記：`試用版：剩餘 7 天`。
* 當時間過期時，關於視窗中會顯示紅色字樣：`試用期已結束 (請至 Microsoft Store 購買完整版)`。

---

> [!NOTE]
> 測試完畢後，請記得將代碼還原（重新加回註解），以確保正式建置打包上傳至 Microsoft Store 的安裝包能夠使用微軟商店原生的 `Windows.Services.Store` API。
