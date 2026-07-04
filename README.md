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


## v4.5 除權息 / 股利 MVP

本版新增「權息管理」手動版：

- 新增 `corporateActions` 權息事件資料層，資料儲存在 `tw_stock_corporate_actions_v1`。
- 支援現金股利：除息後列為應收，發放日進入股利現金流，不列入本金入金。
- 支援股票股利：股票發放日增加庫存股數，總成本不變，平均成本會自然攤低。
- Dashboard 新增已入帳股利、應收現金股利、應收股票股利估值與含股利資產計算。
- 資金流新增股利流水與「只看股利」篩選。
- 歷史帳務新增權息紀錄摘要。
- 本機備份 / 還原與 Google Drive 備份會包含權息事件。

權利股數計算採用除權息日前持股數；除權息日當天買進不列入，當天賣出仍保留權利。

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
