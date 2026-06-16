# 台股損益管理 - Dashboard 與獲利用途分類版

本版本新增：

- Dashboard 總覽頁：總資產、現金餘額、庫存市值、已實現損益、未實現損益、可用獲利、總報酬率。
- 獲利管理升級：獲利提領 / 補回可選用途分類。
- 用途分類：生活費、旅遊、稅金、再投入其他資產、其他。
- Dashboard 顯示獲利用途分類統計與占比。

資料仍以 localStorage 儲存，獲利提領 / 補回使用：

```text
tw_stock_profit_adjustments_v1
```

備份 / 還原與 Google Drive 備份會包含獲利調整紀錄。

## v4.4 UI 修正
- 修正桌機版 Header 在帳戶名稱較長時擠壓、換行、破版問題。
- 帳戶名稱改為單行省略號顯示。
- 手機版帳戶切換按鈕加入截斷保護。
- Dashboard 帳戶名稱標籤加入長文字保護。


## Google Drive 備份：預設 OAuth Client ID

若要把網站分享給其他人使用自己的 Google 帳號備份，請先到 Google Cloud 建立 OAuth 2.0 Web Client ID，並把正式站網址加入 Authorized JavaScript origins。

接著在 `index.html` 找到：

```html
window.STOCK_TRACKER_GOOGLE_CLIENT_ID = '';
```

把空字串改成你的 Client ID，例如：

```html
window.STOCK_TRACKER_GOOGLE_CLIENT_ID = 'xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com';
```

設定後，一般使用者不用再自行填 Client ID；資料會備份到登入者自己的 Google Drive AppDataFolder。安全性設定中仍保留自訂 Client ID，供進階使用者覆蓋預設值。

## 智慧族群分類 v2：族群資料庫匯入 / 匯出

本版新增「族群資料庫」管理，可在右上角的圖層圖示開啟：

- 合併匯入內建台股熱門族群表：不覆蓋你已手動設定的股票。
- 覆蓋匯入內建台股熱門族群表：以熱門族群表重建目前族群資料庫。
- 匯入外部 JSON：支援 `{ meta, categoryMaster, stocks }` 格式。
- 匯出我的族群資料庫：只匯出個股族群資料與下拉選單，不包含交易與資金資料。

專案根目錄附有：`taiwan_hot_stock_category_database_2026.json`，可直接匯入網站使用。


## 2026-06-16 modalfix2

修正手機版「市場觀察」與「全球指數（夜）」彈窗底部被底部導航列遮住的問題：

- 彈窗 z-index 提升到 9999。
- 手機版彈窗預留底部導航列高度，避免關閉按鈕被蓋住。
- 開啟彈窗時隱藏底部導航列、右下角新增按鈕與浮動更新按鈕。
- Service Worker 版本更新並改成同站 JS/CSS 優先網路，避免 PWA 快取吃到舊版檔案。
- index.html 對 app.js 與 services 加上版本參數，強制瀏覽器載入新版。
