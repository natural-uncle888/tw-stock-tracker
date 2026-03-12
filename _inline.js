const { createApp } = Vue;
let __gdriveTokenClient = null;
let __gdriveTokenClientCid = null;
const __GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

createApp({
    data() {
        return {
            showGDriveModal: false, gdriveBusy: false, gdriveBusyText: '', gdriveCloudMeta: (() => { try { return JSON.parse(localStorage.getItem('tw_stock_cloud_meta_v1') || '{}'); } catch(e){ return {}; } })(),
            gdriveClientId: localStorage.getItem('tw_stock_gdrive_client_id_v1') || '', gdriveClientIdInput: localStorage.getItem('tw_stock_gdrive_client_id_v1') || '',
            isLoggedIn: false, authMode: 'login', authInput: { username: '', password: '', confirmPassword: '' }, rememberUser: false, authError: '', securityConfig: { enabled: true, username: '', passwordHash: '' }, showSecurityModal: false, showChangePasswordModal: false, changePassInput: { old: '', new: '' },
            currentTab: 'inventory', showStockDetails: false, selectedStock: null,
            transactions: [], newTx: { date: new Date().toISOString().split('T')[0], code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 1000, category: 'core', dayTradeEligible: false },
            showSellModal: false, sellTx: { date: '', code: '', name: '', price: 0, qty: 0, maxQty: 0, category: '', mode: 'cash', dayTradeEligible: false },
            showEditBuyModal: false, editBuyTx: { id: null, date: '', code: '', name: '', price: null, qty: 0, category: 'core' },
            showEditTxModal: false, editTx: { id: null, date: '', code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 0, category: 'core', dayTradeEligible: false },
            showAddModal: false, searchText: '', isSearching: false,
            settings: { feeRate: 0.1425, discount: 1, taxRate: 0.3, dayTradeTaxRate: 0.15, minFee: 20 },
            showSettings: false, showExportModal: false, backupTab: 'download', exportFileName: '', restoreFileName: '', restoreFileObject: null, restoreBusy: false,
            showInfoModal: false, infoTitle: '', infoMessage: '', showConfirmModal: false, confirmTitle: '', confirmMessage: '', confirmCallback: null,
            showGlobalIndices: false, isGlobalLoading: false, isTaiexNightLoading: false, globalIndices: [],
            globalIndicesLastTs: Number(localStorage.getItem('tw_stock_global_time_ts_v1')) || null,
            globalIndicesError: (localStorage.getItem('tw_stock_global_update_error_v1') === '1'), globalIndicesPartial: (localStorage.getItem('tw_stock_global_update_partial_v1') === '1'), globalIndicesMissingCount: Number(localStorage.getItem('tw_stock_global_update_missing_count_v1') || '0') || 0, globalIndicesAttemptTs: Number(localStorage.getItem('tw_stock_global_update_attempt_ts_v1')) || null,
            showHelpModal: false,
            filter: 'all', suggestions: [], showSuggestions: false, customStocks: [], 
            latestPrices: {}, latestStatus: {}, lastUpdateTime: '',
            lastUpdateTimestamp: Number(localStorage.getItem('tw_stock_time_ts_v6') || 0) || 0, lastPriceUpdateError: localStorage.getItem('tw_stock_price_update_error_v1') || '', lastPriceUpdateAttemptTs: Number(localStorage.getItem('tw_stock_price_update_attempt_ts_v1') || 0) || 0, lastPriceUpdatePartial: (localStorage.getItem('tw_stock_price_update_partial_v1') === '1'), lastPriceUpdateMissingCount: Number(localStorage.getItem('tw_stock_price_update_missing_count_v1') || 0) || 0, priceStaleThresholdMinutes: 180, isLoading: false,
            dateFilterMode: 'month', filterStart: '', filterEnd: '', historyTypeFilter: 'all',
            contextMenu: { visible: false, x: 0, y: 0, stock: null },
            rawStockData: ["2330:台積電","2317:鴻海","2454:聯發科","2603:長榮","2609:陽明","2615:萬海","0050:元大台灣50","0056:元大高股息","00878:國泰永續高股息"], baseStockMap: [],
            
            // --- NEW: History Analysis State ---
            historyMode: 'list', // 'list' | 'analysis'
            showRealizedDetail: false, realizedDetailCode: ''
        }
    },
    mounted() {
        this.gdriveClientId = localStorage.getItem('tw_stock_gdrive_client_id_v1') || ''; this.gdriveClientIdInput = this.gdriveClientId;
        this.baseStockMap = this.rawStockData.map(s => { const [code, name] = s.split(':'); return { code, name }; });
        const savedTx = localStorage.getItem('tw_stock_tx_v6'); if (savedTx) this.transactions = JSON.parse(savedTx);
        const savedSettings = localStorage.getItem('tw_stock_settings_v6'); if (savedSettings) this.settings = JSON.parse(savedSettings);
        if (this.settings == null || typeof this.settings !== 'object') this.settings = { feeRate: 0.1425, discount: 1, taxRate: 0.3, dayTradeTaxRate: 0.15, minFee: 20 };
        if (this.settings.dayTradeTaxRate == null || isNaN(Number(this.settings.dayTradeTaxRate))) this.settings.dayTradeTaxRate = 0.15;
        if (this.settings.feeRate == null || isNaN(Number(this.settings.feeRate))) this.settings.feeRate = 0.1425;
        if (this.settings.taxRate == null || isNaN(Number(this.settings.taxRate))) this.settings.taxRate = 0.3;
        if (this.settings.minFee == null || isNaN(Number(this.settings.minFee))) this.settings.minFee = 20;
        if (this.settings.discount == null || isNaN(Number(this.settings.discount)) || Number(this.settings.discount) <= 0) this.settings.discount = 1;
        const looksLikeLegacyDefault = Number(this.settings.feeRate) === 0.1425 && Number(this.settings.discount) === 0.28 && Number(this.settings.taxRate) === 0.3 && Number(this.settings.dayTradeTaxRate) === 0.15 && Number(this.settings.minFee) === 20;
        if (looksLikeLegacyDefault) {
            this.settings.discount = 1;
            localStorage.setItem('tw_stock_settings_v6', JSON.stringify(this.settings));
        }
        const savedCustom = localStorage.getItem('tw_stock_custom_v6'); if (savedCustom) this.customStocks = JSON.parse(savedCustom);
        const savedPrices = localStorage.getItem('tw_stock_prices_v6'); if (savedPrices) this.latestPrices = JSON.parse(savedPrices);
        const savedStatus = localStorage.getItem('tw_stock_status_v6'); if (savedStatus) this.latestStatus = JSON.parse(savedStatus);
        const savedTime = localStorage.getItem('tw_stock_time_v6'); if (savedTime) this.lastUpdateTime = savedTime;
        const savedTimeTs = localStorage.getItem('tw_stock_time_ts_v6'); if (savedTimeTs) this.lastUpdateTimestamp = Number(savedTimeTs) || 0;
        try { this.recomputeAllTradesAndValidate(); } catch (_) {}
        const savedAuth = localStorage.getItem('tw_stock_auth_v1'); const savedUser = localStorage.getItem('tw_stock_saved_username');
        if (savedUser) { this.authInput.username = savedUser; this.rememberUser = true; }
        if (savedAuth) { this.securityConfig = JSON.parse(savedAuth); if (this.securityConfig.enabled) { this.authMode = 'login'; this.isLoggedIn = false; } else { this.isLoggedIn = true; } } else { this.authMode = 'setup'; this.isLoggedIn = false; }
        window.addEventListener('click', this.handleGlobalClick, true); window.addEventListener('resize', this.closeContextMenu); window.addEventListener('scroll', this.closeContextMenu, true);
        this.setDateFilter('month');
    },
    beforeUnmount() { window.removeEventListener('click', this.handleGlobalClick, true); window.removeEventListener('resize', this.closeContextMenu); window.removeEventListener('scroll', this.closeContextMenu, true); },
    computed: {
        // --- NEW: Analysis Computed Properties ---
        realizedAnalysisList() {
            // Use existing filteredTransactions (so date filter works)
            const realized = this.filteredTransactions.filter(tx => tx.realizedPnL !== null && tx.realizedPnL !== undefined);

            const groups = {};
            realized.forEach(tx => {
                if (!groups[tx.code]) {
                    groups[tx.code] = {
                        code: tx.code,
                        name: tx.name,
                        totalClosedQty: 0,
                        totalClosedBase: 0,
                        totalPnL: 0,
                        weightedExitPriceSum: 0,
                        latestDate: tx.date
                    };
                }
                const closedQty = Number(tx.closedQty ?? tx.qty) || 0;
                const closedBase = Number(tx.closedBase ?? 0) || 0;
                groups[tx.code].totalClosedQty += closedQty;
                groups[tx.code].totalClosedBase += closedBase;
                groups[tx.code].totalPnL += Number(tx.realizedPnL) || 0;
                groups[tx.code].weightedExitPriceSum += (Number(tx.price) || 0) * closedQty;
                if (new Date(tx.date) > new Date(groups[tx.code].latestDate)) groups[tx.code].latestDate = tx.date;
            });

            return Object.values(groups).map(g => {
                const avgExitPrice = g.totalClosedQty > 0 ? g.weightedExitPriceSum / g.totalClosedQty : 0;
                const roi = g.totalClosedBase > 0 ? ((g.totalPnL / g.totalClosedBase) * 100).toFixed(2) : 0;
                return {
                    code: g.code,
                    name: g.name,
                    totalQty: g.totalClosedQty,
                    totalPnL: g.totalPnL,
                    avgPrice: avgExitPrice,
                    roi,
                    latestDate: g.latestDate
                };
            }).sort((a,b) => new Date(b.latestDate) - new Date(a.latestDate));
        },
        realizedDetailTransactions() {
            if (!this.realizedDetailCode) return [];
            // Show all history for this stock to trace P&L source
            return this.sortedTransactions.filter(tx => tx.code === this.realizedDetailCode);
        },

        // --- Existing Computed ---
        priceUpdateAgeMinutes() { if (!this.lastUpdateTimestamp) return null; const diff = Date.now() - this.lastUpdateTimestamp; return diff < 0 ? 0 : Math.floor(diff / 60000); },
        priceUpdateAgeText() { const m = this.priceUpdateAgeMinutes; if (m === null) return ''; if (m < 60) return `${m} 分鐘前`; const h = Math.floor(m / 60); const mm = m % 60; if (h < 24) return mm === 0 ? `${h} 小時前` : `${h} 小時 ${mm} 分鐘前`; const d = Math.floor(h / 24); const hh = h % 24; return hh === 0 ? `${d} 天前` : `${d} 天 ${hh} 小時前`; },
        isPriceUpdateStale() { const m = this.priceUpdateAgeMinutes; return m === null ? false : m >= (this.priceStaleThresholdMinutes || 180); },
        priceUpdateHintLevel() { if (this.lastPriceUpdateError) return 'error'; if (this.lastPriceUpdatePartial && this.lastUpdateTimestamp) return 'partial'; if (!this.lastUpdateTimestamp) return 'never'; if (this.isPriceUpdateStale) return 'stale'; return 'ok'; },
        priceUpdateHintIcon() { const lv = this.priceUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'fa-solid fa-triangle-exclamation'; if (lv === 'ok') return 'fa-solid fa-circle-check'; return 'fa-regular fa-clock'; },
        priceUpdateHintClass() { const lv = this.priceUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'text-amber-700'; if (lv === 'ok') return 'text-emerald-700'; return 'text-slate-500'; },
        priceUpdateHintText() { const lv = this.priceUpdateHintLevel; if (lv === 'never') return '尚未更新股價'; if (lv === 'error') return '，沿用上次價格'; if (lv === 'partial') { const miss = this.lastPriceUpdateMissingCount || 0; return miss > 0 ? `部分更新成功：${miss} 檔未更新（沿用上次價格）` : '部分更新成功（部分資料沿用上次價格）'; } if (lv === 'stale') return `價格（${this.priceUpdateAgeText}）`; if (lv === 'ok') return `價格（${this.priceUpdateAgeText}）`; return ''; },
        globalUpdateAgeMinutes() { if (!this.globalIndicesLastTs) return null; const diff = Date.now() - this.globalIndicesLastTs; return diff < 0 ? 0 : Math.floor(diff / 60000); },
        globalUpdateAgeText() { const m = this.globalUpdateAgeMinutes; if (m === null) return ''; if (m < 60) return `${m} 分鐘前`; const h = Math.floor(m / 60); const mm = m % 60; if (h < 24) return mm === 0 ? `${h} 小時前` : `${h} 小時 ${mm} 分鐘前`; const d = Math.floor(h / 24); const hh = h % 24; return hh === 0 ? `${d} 天前` : `${d} 天 ${hh} 小時前`; },
        isGlobalUpdateStale() { const m = this.globalUpdateAgeMinutes; return m === null ? false : m >= 180; },
        globalUpdateHintLevel() { if (this.globalIndicesError) return 'error'; if (this.globalIndicesPartial && this.globalIndicesLastTs) return 'partial'; if (!this.globalIndicesLastTs) return 'never'; if (this.isGlobalUpdateStale) return 'stale'; return 'ok'; },
        globalUpdateHintIcon() { const lv = this.globalUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'fa-solid fa-triangle-exclamation'; if (lv === 'ok') return 'fa-solid fa-circle-check'; return 'fa-regular fa-clock'; },
        globalUpdateHintClass() { const lv = this.globalUpdateHintLevel; if (lv === 'error' || lv === 'partial' || lv === 'stale') return 'text-amber-700'; if (lv === 'ok') return 'text-emerald-700'; return 'text-slate-500'; },
        globalUpdateHintText() { const lv = this.globalUpdateHintLevel; if (lv === 'never') return '尚未更新全球指數（夜）'; if (lv === 'error') return '，沿用上次資料'; if (lv === 'partial') { const miss = this.globalIndicesMissingCount || 0; return miss > 0 ? `部分更新成功：${miss} 檔未更新（沿用上次資料）` : '部分更新成功（部分資料沿用上次資料）'; } if (lv === 'stale') return `指數（${this.globalUpdateAgeText}）`; if (lv === 'ok') return `指數（${this.globalUpdateAgeText}）`; return ''; },
        gdriveLastActionLabel() { const a = (this.gdriveCloudMeta && this.gdriveCloudMeta.lastAction) ? this.gdriveCloudMeta.lastAction : ''; if (a === 'upload') return '雲端上傳'; if (a === 'restore') return '雲端回復'; if (a === 'download') return '本機下載'; return '—'; },
        fullStockMap() { return [...this.baseStockMap, ...this.customStocks]; },
        sortedTransactions() { return [...this.transactions].sort((a, b) => (new Date(b.date) - new Date(a.date)) || (Number(b.id || 0) - Number(a.id || 0))); },
        filteredTransactions() { if (this.dateFilterMode === 'all') return this.sortedTransactions; const start = new Date(this.filterStart).setHours(0,0,0,0); const end = new Date(this.filterEnd).setHours(23,59,59,999); return this.sortedTransactions.filter(tx => { const txDate = new Date(tx.date).getTime(); return txDate >= start && txDate <= end; }); },
        displayedHistoryTransactions() { if (this.historyTypeFilter === 'all') return this.filteredTransactions; return this.filteredTransactions.filter(tx => tx.type === this.historyTypeFilter); },
        filteredStats() { let realizedPnL = 0, fees = 0, buyAmount = 0, sellAmount = 0; this.filteredTransactions.forEach(tx => { fees += (Number(tx.fee || 0) + Number(tx.tax || 0)); if (tx.type === 'buy') buyAmount += Number(tx.totalAmount || 0); else if (tx.type === 'sell') sellAmount += Number(tx.totalAmount || 0); if (tx.realizedPnL !== null && tx.realizedPnL !== undefined) realizedPnL += Number(tx.realizedPnL) || 0; }); return { realizedPnL, fees, buyAmount, sellAmount }; },
        holdings() { const ordered = [...this.transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); const state = {}; const realized = {}; ordered.forEach(tx => { if (!tx || !tx.code) return; const code = String(tx.code).trim(); if (!state[code]) state[code] = { qty: 0, cost: 0, category: tx.category, name: tx.name }; if (!realized[code]) realized[code] = 0; realized[code] += (tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? Number(tx.realizedPnL) : 0; const qty = Number(tx.posQty ?? tx.qty) || 0; const totalAmount = Number(tx.posAmount ?? tx.totalAmount) || 0; if (qty <= 0 || totalAmount < 0) return; // should already be normalized by recompute
                // Update open position state (supports long & short)
                if (tx.type === 'buy') { if (state[code].qty >= 0) { state[code].qty += qty; state[code].cost += totalAmount; } else { const absShort = Math.abs(state[code].qty); const coverQty = Math.min(qty, absShort); const avgEntry = state[code].cost / state[code].qty; const coverAmount = totalAmount * (coverQty / qty); state[code].qty += coverQty; state[code].cost += avgEntry * coverQty; const remain = qty - coverQty; if (remain > 0) { const remainAmount = totalAmount - coverAmount; state[code].qty += remain; state[code].cost += remainAmount; } } } else if (tx.type === 'sell') { if (state[code].qty <= 0) { state[code].qty -= qty; state[code].cost -= totalAmount; } else { const closeQty = Math.min(qty, state[code].qty); const avgEntry = state[code].cost / state[code].qty; const closeAmount = totalAmount * (closeQty / qty); state[code].qty -= closeQty; state[code].cost -= avgEntry * closeQty; const remain = qty - closeQty; if (remain > 0) { const remainAmount = totalAmount - closeAmount; state[code].qty -= remain; state[code].cost -= remainAmount; } } } if (Math.abs(state[code].qty) < 1e-9) { state[code].qty = 0; state[code].cost = 0; } state[code].category = tx.category || state[code].category; state[code].name = tx.name || state[code].name; }); return Object.entries(state).filter(([code, s]) => s.qty !== 0).map(([code, s]) => { const entryAvgPrice = s.cost / s.qty; const currentPrice = this.latestPrices[code] || entryAvgPrice; const absQty = Math.abs(s.qty); const marketValueAbs = currentPrice * absQty; let unrealizedPnL = 0; if (s.qty > 0) { unrealizedPnL = (currentPrice * s.qty) - s.cost; } else { unrealizedPnL = (-s.cost) - marketValueAbs; } const investedBase = Math.abs(s.cost); const roi = investedBase > 0 ? ((unrealizedPnL / investedBase) * 100).toFixed(2) : 0; const status = this.latestStatus[code] || { isWarning: false, disposition: 0 }; return { code, name: s.name, qty: s.qty, category: s.category || 'core', realizedPnL: (realized[code] || 0), totalCost: s.cost, buyAvgPrice: entryAvgPrice, entryAvgPrice, investedBase, currentPrice, unrealizedPnL, roi, isWarning: status.isWarning, disposition: status.disposition }; }).sort((a,b) => (b.category || '').localeCompare(a.category || '') || a.code.localeCompare(b.code)); },
        filteredHoldings() { return this.filter === 'all' ? this.holdings : this.holdings.filter(h => h.category === this.filter); },
        totalInvestedCost() { return this.holdings.reduce((sum, h) => sum + (h.investedBase || 0), 0); },
        estimatedMarketValue() { return this.holdings.reduce((sum, h) => { const price = this.latestPrices[h.code] || h.currentPrice || h.buyAvgPrice || 0; return sum + Math.abs(price * h.qty); }, 0); },
        totalUnrealizedPnL() { return this.holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0); },
        totalRealizedPnL() { return this.transactions.reduce((sum, tx) => sum + ((tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? Number(tx.realizedPnL) : 0), 0); },
        selectedStockBuys() { if (!this.selectedStock) return []; return this.sortedTransactions.filter(tx => tx.code === this.selectedStock.code && tx.type === 'buy').map(tx => ({ id: tx.id, date: tx.date, qty: tx.qty, price: tx.price, category: tx.category })); }
    },
    methods: {
        txTypeLabel(tx) {
            if (!tx) return '';
            const mode = String(tx.mode || 'cash');
            const isDT = !!tx.isDayTrade;

            if (tx.type === 'buy') {
                const isCover = (typeof tx.flow === 'string' && tx.flow.startsWith('cover'));
                let label = '';
                if (isCover || mode === 'short') {
                    label = (mode === 'short') ? '融券回補' : '回補';
                } else {
                    label = (mode === 'margin') ? '融資買入' : '買入';
                }
                if (isDT) label += '(當沖)';
                return label;
            }

            if (tx.type === 'sell') {
                const isShortSell = (mode === 'short') || (typeof tx.flow === 'string' && tx.flow.includes('short') && tx.flow !== 'sell');
                let label = '';
                if (isShortSell) label = '融券賣出';
                else label = (mode === 'margin') ? '融資賣出' : '賣出';
                if (isDT) label += '(當沖)';
                return label;
            }

            return String(tx.type || '');
        },
        // --- NEW: Analysis Methods ---
        openRealizedDetail(code) { this.realizedDetailCode = code; this.showRealizedDetail = true; },
        closeRealizedDetail() { this.showRealizedDetail = false; this.realizedDetailCode = ''; },

        // --- Existing Methods (Exactly Preserved) ---
        openStockDetails(stock) { if (!stock || !stock.code) return; this.selectedStock = { code: stock.code, name: stock.name }; this.showStockDetails = true; this.currentTab = 'inventory'; window.scrollTo({ top: 0, behavior: 'smooth' }); },
        closeStockDetails() { this.showStockDetails = false; this.selectedStock = null; },
        openEditBuyModal(row) { if (!row || !row.id) { this.openInfoModal('無法編輯', '找不到這筆買入紀錄的識別碼'); return; } const tx = this.transactions.find(t => t.id === row.id); if (!tx) { this.openInfoModal('無法編輯', '找不到對應的交易紀錄'); return; } if (tx.type !== 'buy') { this.openInfoModal('無法編輯', '目前僅支援編輯「買入」紀錄'); return; } this.editBuyTx = { id: tx.id, date: tx.date, code: tx.code, name: tx.name, price: tx.price, qty: tx.qty, category: tx.category || 'core' }; this.showEditBuyModal = true; },
        closeEditBuyModal() { this.showEditBuyModal = false; this.editBuyTx = { id: null, date: '', code: '', name: '', price: null, qty: 0, category: 'core' }; },
        calcBrokerFee(subTotal) { const grossFee = Number(subTotal || 0) * (Number(this.settings.feeRate || 0) / 100) * Number(this.settings.discount || 1); return Math.max(Math.floor(grossFee), Math.round(this.settings.minFee || 0)); },
        calcBrokerTax(subTotal, taxRatePercent) { return Math.floor(Number(subTotal || 0) * (Number(taxRatePercent || 0) / 100)); },
        saveEditedBuy() {
            if (!this.editBuyTx.id || !this.editBuyTx.code || !this.editBuyTx.date || !this.editBuyTx.price || !this.editBuyTx.qty) { this.openInfoModal('資料不完整', '請輸入日期、價格與股數'); return; }
            if (this.editBuyTx.qty <= 0 || this.editBuyTx.price <= 0) { this.openInfoModal('資料不正確', '價格與股數需大於 0'); return; }
            const idx = this.transactions.findIndex(t => t.id === this.editBuyTx.id);
            if (idx === -1) { this.openInfoModal('無法儲存', '找不到對應的交易紀錄'); return; }

            const backup = JSON.parse(JSON.stringify(this.transactions));

            const subTotal = this.editBuyTx.price * this.editBuyTx.qty;
            const fee = this.calcBrokerFee(subTotal);
            this.transactions[idx] = { ...this.transactions[idx], date: this.editBuyTx.date, price: this.editBuyTx.price, qty: this.editBuyTx.qty, category: this.editBuyTx.category, fee, tax: 0, totalAmount: subTotal + fee, realizedPnL: null };

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return; }

            this.saveData();
            this.closeEditBuyModal();
            this.openInfoModal('', '買入紀錄已成功更新。');
        },
        openEditTxModal(tx) { if (!tx || !tx.id) { this.openInfoModal('無法編輯', '找不到這筆交易紀錄'); return; } this.editTx = { id: tx.id, date: tx.date, code: tx.code, name: tx.name, type: tx.type, mode: (tx.mode || 'cash'), price: Number(tx.price), qty: Number(tx.qty), category: tx.category || 'core', dayTradeEligible: !!(tx.dayTradeEligible ?? tx.isDayTrade) }; this.showEditTxModal = true; },
        closeEditTxModal() { this.showEditTxModal = false; this.editTx = { id: null, date: '', code: '', name: '', type: 'buy', mode: 'cash', price: null, qty: 0, category: 'core', dayTradeEligible: false }; },
        saveEditedTxFromHistory() { if (!this.editTx.id || !this.editTx.date || !this.editTx.code || !this.editTx.name) { this.openInfoModal('資料不完整', '請輸入日期、股票代號與名稱'); return; } if (!this.editTx.price || !this.editTx.qty || this.editTx.price <= 0 || this.editTx.qty <= 0) { this.openInfoModal('資料不正確', '價格與股數需大於 0'); return; } const idx = this.transactions.findIndex(t => t.id === this.editTx.id); if (idx === -1) { this.openInfoModal('無法儲存', '找不到對應的交易紀錄'); return; } const backup = JSON.parse(JSON.stringify(this.transactions)); this.transactions[idx] = { ...this.transactions[idx], date: this.editTx.date, code: String(this.editTx.code).trim(), name: String(this.editTx.name).trim(), category: this.editTx.category || this.transactions[idx].category || 'core', price: Number(this.editTx.price), qty: Number(this.editTx.qty), mode: (this.editTx.mode || this.transactions[idx].mode || 'cash'), dayTradeEligible: !!this.editTx.dayTradeEligible }; const ok = this.recomputeAllTradesAndValidate(); if (!ok) { this.transactions = backup; return; } this.saveData(); this.closeEditTxModal(); this.openInfoModal('', '交易紀錄已成功更新。'); },
        recomputeAllTradesAndValidate() {
            // Chronological order (oldest -> newest), stable within the same day
            const ordered = [...this.transactions].sort((a, b) => {
                const da = new Date(a.date).getTime();
                const db = new Date(b.date).getTime();
                if (da !== db) return da - db;
                return (Number(a.id || 0) - Number(b.id || 0));
            });

            const state = {}; // per code: { qty, cost }

            // -------- Pass 1: normalize + compute subtotal/fee --------
            for (const tx of ordered) {
                if (!tx || !tx.code) continue;
                const code = String(tx.code).trim();
                tx.code = code;

                if (tx.type !== 'buy' && tx.type !== 'sell') tx.type = 'buy';

                // mode: cash | margin | short
                if (!tx.mode) tx.mode = 'cash';
                tx.mode = String(tx.mode || 'cash');
                if (!['cash', 'margin', 'short'].includes(tx.mode)) tx.mode = 'cash';

                // dayTradeEligible: user intent (NOT whether day trade actually成立)
                if (tx.dayTradeEligible === undefined || tx.dayTradeEligible === null) {
                    tx.dayTradeEligible = !!tx.isDayTrade; // backward compatibility
                }
                tx.dayTradeEligible = !!tx.dayTradeEligible;

                const qty = Number(tx.qty) || 0;
                const price = Number(tx.price) || 0;
                if (qty <= 0 || price <= 0) {
                    this.openInfoModal('資料錯誤', `交易資料不正確：${tx.name || code} ${tx.date}`);
                    return false;
                }

                const subTotal = price * qty;
                const fee = Math.max(
                    Math.round(subTotal * (this.settings.feeRate / 100) * this.settings.discount),
                    Math.round(this.settings.minFee || 0)
                );

                tx._subTotal = subTotal;
                tx.fee = fee;

                // init derived
                tx.dayTradeMatchedQty = 0;
                tx.isDayTrade = false;
                tx.tax = 0;
                tx.totalAmount = 0;
                tx.posQty = qty;
                tx.posAmount = 0;

                // Reset derived fields (recomputed)
                tx.realizedPnL = null;
                tx.flow = null;
                tx.closedQty = null;
                tx.closedBase = null;
            }

            const dtTaxRate = Number(this.settings.dayTradeTaxRate ?? 0.15);
            const normalTaxRate = Number(this.settings.taxRate ?? 0.3);

            // helpers (proportional fee allocation)
            const buyCostChunk = (tx, q) => (tx.price * q) + (tx.fee * (q / tx.qty));
            const sellNetChunk = (tx, q, taxRatePercent) => (tx.price * q) - (tx.fee * (q / tx.qty)) - (tx.price * q * (taxRatePercent / 100));

            // -------- Pass 2: same-day day-trade matching (supports buy-first & sell-first) --------
            const groups = new Map();
            for (const tx of ordered) {
                if (!tx || !tx.code) continue;
                if (!tx.dayTradeEligible) continue;
                const key = `${tx.code}|${tx.date}|${tx.mode}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(tx);
            }

            for (const [, list] of groups.entries()) {
                const pendingBuys = [];  // { tx, remain }
                const pendingSells = []; // { tx, remain }

                for (const tx of list) {
                    let remaining = (Number(tx.qty) || 0) - (Number(tx.dayTradeMatchedQty) || 0);
                    if (remaining <= 0) continue;

                    if (tx.type === 'buy') {
                        // match with earlier sells (sell-first day trade)
                        while (remaining > 0 && pendingSells.length) {
                            const ps = pendingSells[0];
                            const m = Math.min(remaining, ps.remain);

                            tx.dayTradeMatchedQty += m;
                            ps.tx.dayTradeMatchedQty += m;

                            const pnl = sellNetChunk(ps.tx, m, dtTaxRate) - buyCostChunk(tx, m);

                            // closing leg = current buy
                            tx.realizedPnL = (tx.realizedPnL == null ? 0 : Number(tx.realizedPnL)) + pnl;
                            tx.closedQty = (tx.closedQty == null ? 0 : Number(tx.closedQty)) + m;
                            tx.closedBase = (tx.closedBase == null ? 0 : Number(tx.closedBase)) + Math.abs(sellNetChunk(ps.tx, m, dtTaxRate));

                            if (tx.flow == null) tx.flow = 'cover';

                            remaining -= m;
                            ps.remain -= m;
                            if (ps.remain <= 0) pendingSells.shift();
                        }

                        if (remaining > 0) {
                            pendingBuys.push({ tx, remain: remaining });
                        }
                    } else {
                        // sell: match with earlier buys (buy-first day trade)
                        while (remaining > 0 && pendingBuys.length) {
                            const pb = pendingBuys[0];
                            const m = Math.min(remaining, pb.remain);

                            tx.dayTradeMatchedQty += m;
                            pb.tx.dayTradeMatchedQty += m;

                            const pnl = sellNetChunk(tx, m, dtTaxRate) - buyCostChunk(pb.tx, m);

                            // closing leg = current sell
                            tx.realizedPnL = (tx.realizedPnL == null ? 0 : Number(tx.realizedPnL)) + pnl;
                            tx.closedQty = (tx.closedQty == null ? 0 : Number(tx.closedQty)) + m;
                            tx.closedBase = (tx.closedBase == null ? 0 : Number(tx.closedBase)) + Math.abs(buyCostChunk(pb.tx, m));

                            if (tx.flow == null) tx.flow = 'sell';

                            remaining -= m;
                            pb.remain -= m;
                            if (pb.remain <= 0) pendingBuys.shift();
                        }

                        if (remaining > 0) {
                            pendingSells.push({ tx, remain: remaining });
                        }
                    }
                }
            }

            // -------- Pass 3: compute tax/totalAmount + position-effective qty/amount --------
            for (const tx of ordered) {
                if (!tx || !tx.code) continue;
                const qty = Number(tx.qty) || 0;
                const matched = Math.max(0, Math.min(qty, Number(tx.dayTradeMatchedQty) || 0));
                const subTotal = Number(tx._subTotal) || 0;
                const fee = Number(tx.fee) || 0;

                tx.isDayTrade = matched > 0;

                if (tx.type === 'buy') {
                    tx.tax = 0;
                    tx.totalAmount = subTotal + fee;
                } else {
                    // split tax: matched part uses day-trade tax rate; rest uses normal
                    const dtTax = tx.price * matched * (dtTaxRate / 100);
                    const normalQty = qty - matched;
                    const normalTax = tx.price * normalQty * (normalTaxRate / 100);
                    tx.tax = this.calcBrokerTax(tx.price * matched, dtTaxRate) + this.calcBrokerTax(tx.price * normalQty, normalTaxRate);
                    tx.totalAmount = subTotal - fee - tx.tax;
                }

                const posQty = qty - matched;
                if (posQty <= 0) {
                    tx.posQty = 0;
                    tx.posAmount = 0;
                } else {
                    const feePart = fee * (posQty / qty);
                    if (tx.type === 'buy') {
                        tx.posQty = posQty;
                        tx.posAmount = (tx.price * posQty) + feePart;
                    } else {
                        const taxPart = tx.price * posQty * (normalTaxRate / 100);
                        tx.posQty = posQty;
                        tx.posAmount = (tx.price * posQty) - feePart - taxPart;
                    }
                }
            }

            // -------- Pass 4: apply position state (avg cost) using posQty/posAmount --------
            for (const tx of ordered) {
                if (!tx || !tx.code) continue;
                const code = tx.code;
                if (!state[code]) state[code] = { qty: 0, cost: 0 };

                const qty = Number(tx.posQty) || 0;
                if (qty <= 0) continue; // no position impact (pure day-trade matched)

                const amount = Number(tx.posAmount) || 0;

                const basePnL = (tx.realizedPnL == null ? 0 : Number(tx.realizedPnL));
                const baseClosedQty = (tx.closedQty == null ? 0 : Number(tx.closedQty));
                const baseClosedBase = (tx.closedBase == null ? 0 : Number(tx.closedBase));

                if (tx.type === 'buy') {
                    if (state[code].qty >= 0) {
                        state[code].qty += qty;
                        state[code].cost += amount;
                        if (tx.flow == null) tx.flow = 'buy';
                    } else {
                        const absShort = Math.abs(state[code].qty);
                        const coverQty = Math.min(qty, absShort);
                        const avgEntry = state[code].cost / state[code].qty; // positive
                        const coverAmount = amount * (coverQty / qty);

                        const pnl = (avgEntry * coverQty) - coverAmount;
                        tx.realizedPnL = basePnL + pnl;
                        tx.closedQty = baseClosedQty + coverQty;
                        tx.closedBase = baseClosedBase + (avgEntry * coverQty);
                        tx.flow = (qty > coverQty) ? 'cover+buy' : 'cover';

                        state[code].qty += coverQty;
                        state[code].cost += avgEntry * coverQty;

                        const remain = qty - coverQty;
                        if (remain > 0) {
                            const remainAmount = amount - coverAmount;
                            state[code].qty += remain;
                            state[code].cost += remainAmount;
                        }
                    }
                } else {
                    // sell
                    if (state[code].qty <= 0) {
                        // opening/increasing short is only allowed if mode is 'short'
                        if (tx.mode !== 'short') {
                            this.openInfoModal('庫存不足', `${tx.name || code} ${tx.date}：賣出會造成（或增加）空單。請改選『融券』或取消『當沖』勾選/補上同日回補。`);
                            return false;
                        }
                        state[code].qty -= qty;
                        state[code].cost -= amount;
                        if (tx.flow == null) tx.flow = 'short';
                    } else {
                        const closeQty = Math.min(qty, state[code].qty);
                        const avgEntry = state[code].cost / state[code].qty;
                        const closeAmount = amount * (closeQty / qty);

                        const pnl = closeAmount - (avgEntry * closeQty);
                        tx.realizedPnL = basePnL + pnl;
                        tx.closedQty = baseClosedQty + closeQty;
                        tx.closedBase = baseClosedBase + (avgEntry * closeQty);

                        state[code].qty -= closeQty;
                        state[code].cost -= avgEntry * closeQty;

                        const remain = qty - closeQty;
                        if (remain > 0) {
                            if (tx.mode !== 'short') {
                                this.openInfoModal('庫存不足', `${tx.name || code} ${tx.date}：賣出超過庫存，剩餘部分會變成空單。請改選『融券』或分拆交易。`);
                                return false;
                            }
                            const remainAmount = amount - closeAmount;
                            state[code].qty -= remain;
                            state[code].cost -= remainAmount;
                            tx.flow = 'sell+short';
                        } else {
                            if (tx.flow == null) tx.flow = 'sell';
                        }
                    }
                }

                if (Math.abs(state[code].qty) < 1e-9) {
                    state[code].qty = 0;
                    state[code].cost = 0;
                }
            }

            return true;
        },
        handleAuthAction() { this.authError = ''; if (!this.authInput.username || !this.authInput.password) { this.authError = '請輸入帳號與密碼'; return; } if (this.authMode === 'setup') { if (this.authInput.password !== this.authInput.confirmPassword) { this.authError = '兩次密碼輸入不一致'; return; } this.securityConfig = { enabled: true, username: this.authInput.username, passwordHash: btoa(this.authInput.password) }; localStorage.setItem('tw_stock_auth_v1', JSON.stringify(this.securityConfig)); this.isLoggedIn = true; localStorage.setItem('tw_stock_help_autopen_v1', '1'); this.openInfoModal('設定成功', '您的帳號保護已啟用。'); } else { if (this.authInput.username === this.securityConfig.username && btoa(this.authInput.password) === this.securityConfig.passwordHash) { this.isLoggedIn = true; } else { this.authError = '帳號或密碼錯誤'; } } if (this.isLoggedIn) { if (this.rememberUser) { localStorage.setItem('tw_stock_saved_username', this.authInput.username); } else { localStorage.removeItem('tw_stock_saved_username'); } this.authInput.password = ''; this.authInput.confirmPassword = ''; if (!this.rememberUser) this.authInput.username = ''; const shouldAutoOpenHelp = localStorage.getItem('tw_stock_help_autopen_v1') === '1'; const hasSeenHelp = localStorage.getItem('tw_stock_help_seen_v1') === '1'; if (shouldAutoOpenHelp && !hasSeenHelp) { this.showHelpModal = true; localStorage.setItem('tw_stock_help_seen_v1', '1'); localStorage.removeItem('tw_stock_help_autopen_v1'); } } },
        logout() { this.isLoggedIn = false; this.authMode = 'login'; this.showSecurityModal = false; const savedUser = localStorage.getItem('tw_stock_saved_username'); this.authInput.username = savedUser || ''; this.authInput.password = ''; },
        updateSecurityConfig() { localStorage.setItem('tw_stock_auth_v1', JSON.stringify(this.securityConfig)); },
        handleChangePassword() { if (!this.changePassInput.old || !this.changePassInput.new) { this.openInfoModal('錯誤', '欄位不可為空'); return; } if (btoa(this.changePassInput.old) !== this.securityConfig.passwordHash) { this.openInfoModal('錯誤', '舊密碼不正確'); return; } this.securityConfig.passwordHash = btoa(this.changePassInput.new); localStorage.setItem('tw_stock_auth_v1', JSON.stringify(this.securityConfig)); this.changePassInput = { old: '', new: '' }; this.showChangePasswordModal = false; this.openInfoModal('成功', '密碼已變更'); },
        triggerClearAuth() { this.confirmTitle = '清除密碼'; this.confirmMessage = '確定要移除帳號保護嗎？這將會刪除您儲存的登入憑證，下次進入時需重新設定。'; this.confirmCallback = () => { localStorage.removeItem('tw_stock_auth_v1'); localStorage.removeItem('tw_stock_saved_username'); location.reload(); }; this.showConfirmModal = true; },
        forgotPassword() { if(confirm("您確定要重置應用程式並清除密碼嗎？(交易資料保留，但需重新設定帳號)")) { localStorage.removeItem('tw_stock_auth_v1'); location.reload(); } },
        openInfoModal(title, msg) { this.infoTitle = title; this.infoMessage = msg; this.showInfoModal = true; },
        openContextMenu(e, stock) { if (e && typeof e.preventDefault === 'function') e.preventDefault(); this.contextMenu.visible = true; this.contextMenu.x = e?.clientX ?? 0; this.contextMenu.y = e?.clientY ?? 0; this.contextMenu.stock = stock; this.$nextTick(() => { const el = this.$refs.contextMenuEl; if (!el) return; const padding = 8; const vw = window.innerWidth || 0; const vh = window.innerHeight || 0; const rect = el.getBoundingClientRect(); const maxX = Math.max(padding, vw - rect.width - padding); const maxY = Math.max(padding, vh - rect.height - padding); this.contextMenu.x = Math.min(Math.max(this.contextMenu.x, padding), maxX); this.contextMenu.y = Math.min(Math.max(this.contextMenu.y, padding), maxY); }); },
        closeContextMenu() { this.contextMenu.visible = false; },
        handleGlobalClick(e) { if (!this.contextMenu.visible) return; const el = this.$refs.contextMenuEl; if (!el || !el.contains(e.target)) { this.closeContextMenu(); } },
        setManualStatus(disp, warning) { if (!this.contextMenu.stock) return; const code = this.contextMenu.stock.code; this.latestStatus[code] = { isWarning: warning, disposition: disp }; localStorage.setItem('tw_stock_status_v6', JSON.stringify(this.latestStatus)); this.closeContextMenu(); },
        triggerClearHistory() { if (this.transactions.length === 0) { this.openInfoModal('無資料', '目前沒有任何交易紀錄。'); return; } this.confirmTitle = '清空所有紀錄'; this.confirmMessage = '⚠️ 危險操作：您確定要「永久刪除」所有的歷史交易紀錄嗎？此動作執行後將無法復原！'; this.confirmCallback = this.deleteAllTransactions; this.showConfirmModal = true; },
        deleteAllTransactions() { this.transactions = []; this.saveData(); this.openInfoModal('已清空', '所有交易紀錄已成功刪除。'); },
        deleteTransaction(id) { this.confirmTitle = '刪除交易'; this.confirmMessage = '確定要刪除此筆交易紀錄嗎？'; this.confirmCallback = () => { this.transactions = this.transactions.filter(t => t.id !== id); this.saveData(); }; this.showConfirmModal = true; },
        confirmAction() { if (this.confirmCallback) this.confirmCallback(); this.showConfirmModal = false; },
        setDateFilter(mode) { this.dateFilterMode = mode; const today = new Date(); const format = d => d.toISOString().split('T')[0]; this.filterEnd = format(today); if (mode === 'today') this.filterStart = format(today); else if (mode === 'yesterday') { const y = new Date(); y.setDate(y.getDate() - 1); this.filterStart = format(y); this.filterEnd = format(y); } else if (mode === 'week') { const d = new Date(); d.setDate(d.getDate() - 6); this.filterStart = format(d); } else if (mode === 'month') { const d = new Date(); d.setMonth(d.getMonth() - 1); this.filterStart = format(d); } else if (mode === 'all') this.filterStart = '2000-01-01'; },

async fetchStockPrices() {
    if (this.holdings.length === 0) {
        this.openInfoModal('無庫存可更新', '目前沒有持倉股票，請先新增交易。');
        return;
    }
    this.isLoading = true;
    this.lastPriceUpdateError = '';
    this.lastPriceUpdateAttemptTs = Date.now();
    localStorage.setItem('tw_stock_price_update_attempt_ts_v1', String(this.lastPriceUpdateAttemptTs));
    localStorage.setItem('tw_stock_price_update_error_v1', '');

    const proxyUrl = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? "https://corsproxy.io/?"
        : "/.netlify/functions/yahoo?u=";

    const promises = this.holdings.map(async (stock) => {
        const code = stock.code;
        let price = null;
        let status = this.latestStatus[code] || { isWarning: false, disposition: 0 };

        try {
            const res = await fetch(proxyUrl + encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.TW?interval=1d`));
            const data = await res.json();
            if (data.chart && data.chart.result) price = data.chart.result[0].meta.regularMarketPrice;
        } catch (e) {}

        if (price === null) {
            try {
                const res = await fetch(proxyUrl + encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.TWO?interval=1d`));
                const data = await res.json();
                if (data.chart && data.chart.result) price = data.chart.result[0].meta.regularMarketPrice;
            } catch (e) {}
        }

        try {
            const pageRes = await fetch(proxyUrl + encodeURIComponent(`https://tw.stock.yahoo.com/quote/${code}`));
            const htmlText = await pageRes.text();
            if (htmlText.match(/處置|彈性處置/)) {
                status.disposition = 5;
                if (htmlText.match(/20分鐘|二十分鐘|20分/)) {
                    status.disposition = 20;
                }
            }
            if (htmlText.match(/注意|警示/)) {
                status.isWarning = true;
            }
        } catch (e) {
            console.log('Status fetch failed for', code, e);
        }

        return { code, price, status };
    });

    try {
        const results = await Promise.all(promises);
        let updatedCount = 0;
        let missingCount = 0;

        results.forEach(res => {
            if (res.price !== null && res.price !== undefined && !Number.isNaN(Number(res.price))) {
                this.latestPrices[res.code] = Number(res.price);
                updatedCount += 1;
            } else {
                missingCount += 1;
            }
            this.latestStatus[res.code] = res.status;
        });

        if (updatedCount === 0) throw new Error('NO_PRICE_UPDATED');

        const now = new Date();
        this.lastUpdateTime = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        this.lastUpdateTimestamp = now.getTime();

        localStorage.setItem('tw_stock_prices_v6', JSON.stringify(this.latestPrices));
        localStorage.setItem('tw_stock_status_v6', JSON.stringify(this.latestStatus));
        localStorage.setItem('tw_stock_time_v6', this.lastUpdateTime);
        localStorage.setItem('tw_stock_time_ts_v6', String(this.lastUpdateTimestamp));

        this.lastPriceUpdatePartial = (missingCount > 0);
        this.lastPriceUpdateMissingCount = missingCount;
        localStorage.setItem('tw_stock_price_update_partial_v1', this.lastPriceUpdatePartial ? '1' : '0');
        localStorage.setItem('tw_stock_price_update_missing_count_v1', String(this.lastPriceUpdateMissingCount));

        if (missingCount > 0) {
            this.openInfoModal('部分更新成功', ` ${updatedCount} 檔，${missingCount} 檔未更新（沿用上次價格）。`);
        } else {
            this.openInfoModal('更新成功', '股價與警示狀態已同步！');
        }
    } catch (error) {
        this.lastPriceUpdateError = '連線不穩定或資料來源暫時不可用，已沿用上次價格。';
        localStorage.setItem('tw_stock_price_update_error_v1', this.lastPriceUpdateError);
        this.lastPriceUpdatePartial = false;
        this.lastPriceUpdateMissingCount = 0;
        localStorage.setItem('tw_stock_price_update_partial_v1', '0');
        localStorage.setItem('tw_stock_price_update_missing_count_v1', '0');
        this.openInfoModal('', '連線不穩定，已沿用上次價格。可稍後再試。');
    } finally {
        this.isLoading = false;
    }
},
        async fetchGlobalIndices() { this.isGlobalLoading = true; this.showGlobalIndices = true; this.globalIndices = []; const corsBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? "https://corsproxy.io/?" : "/.netlify/functions/yahoo?u="; const cors = (url) => `${corsBase}${encodeURIComponent(url)}`; const fetchFromYahooChart = async (symbol) => { const encodedSymbol = encodeURIComponent(symbol); const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json(); const meta = data?.chart?.result?.[0]?.meta; const price = meta?.regularMarketPrice; const prev = meta?.chartPreviousClose ?? meta?.previousClose; if (typeof price !== 'number' || typeof prev !== 'number' || prev === 0) throw new Error('No market meta'); const change = price - prev; const percent = (change / prev) * 100; return { price, change, percent }; }; const fetchTaiexNightFromYahooTW = async () => { const url = `https://tw.stock.yahoo.com/future/futures.html`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const htmlText = await res.text(); const idx = htmlText.indexOf('WTX&'); const idx2 = htmlText.indexOf('WTX&amp;'); const hit = (idx !== -1) ? idx : idx2; if (hit === -1) throw new Error('WTX& not found'); const slice = htmlText.slice(Math.max(0, hit - 4000), Math.min(htmlText.length, hit + 8000)); const textOnly = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); const m = textOnly.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([+-]?\d+(?:\.\d+)?)%/); let change = m ? parseFloat(m[1].replace(/,/g, '')) : null; let percent = m ? parseFloat(m[2]) : null; if (typeof percent === 'number' && !isNaN(percent) && typeof change === 'number' && !isNaN(change)) { if (percent < 0 && change > 0) change = -change; else if (percent > 0 && change < 0) change = Math.abs(change); } const after = textOnly.split(/WTX&|WTX&amp;/).slice(1).join(' ').trim(); const numsAfter = after.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || []; const price = numsAfter.length ? parseFloat(numsAfter[0].replace(/,/g, '')) : null; if (typeof price !== 'number' || isNaN(price)) throw new Error('No price parsed'); return { price, change: (typeof change === 'number' && !isNaN(change)) ? change : 0, percent: (typeof percent === 'number' && !isNaN(percent)) ? percent : 0 }; }; const targets = [ { symbol: '^DJI', name: '道瓊工業', kind: 'chart' }, { symbol: '^IXIC', name: 'NASDAQ', kind: 'chart' }, { symbol: '^GSPC', name: 'S&P 500', kind: 'chart' }, { symbol: '^SOX', name: '費城半導體', kind: 'chart' }, { symbol: 'WTX&', name: '台股指數(夜盤)', kind: 'taiexNight' }, ]; const promises = targets.map(async (t) => { try { const { price, change, percent } = (t.kind === 'taiexNight') ? await fetchTaiexNightFromYahooTW() : await fetchFromYahooChart(t.symbol); return { ...t, price: Number(price).toFixed(2), change, percent }; } catch (e) { return { ...t, price: '-', change: 0, percent: 0 }; } }); const results = await Promise.all(promises); this.globalIndices = results; const missing = results.filter(x => x && x.price === '-').length; const total = results.length; const success = total - missing; this.globalIndicesAttemptTs = Date.now(); localStorage.setItem('tw_stock_global_update_attempt_ts_v1', String(this.globalIndicesAttemptTs)); if (success <= 0) { this.globalIndicesError = true; this.globalIndicesPartial = false; this.globalIndicesMissingCount = total; localStorage.setItem('tw_stock_global_update_error_v1', '1'); localStorage.setItem('tw_stock_global_update_partial_v1', '0'); localStorage.setItem('tw_stock_global_update_missing_count_v1', String(this.globalIndicesMissingCount)); } else { this.globalIndicesLastTs = Date.now(); localStorage.setItem('tw_stock_global_time_ts_v1', String(this.globalIndicesLastTs)); this.globalIndicesError = false; this.globalIndicesPartial = (missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem('tw_stock_global_update_error_v1', '0'); localStorage.setItem('tw_stock_global_update_partial_v1', this.globalIndicesPartial ? '1' : '0'); localStorage.setItem('tw_stock_global_update_missing_count_v1', String(this.globalIndicesMissingCount)); } this.isGlobalLoading = false; },
        async fetchTaiexNightIndex() { this.isTaiexNightLoading = true; this.showGlobalIndices = true; const corsBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? "https://corsproxy.io/?" : "/.netlify/functions/yahoo?u="; const cors = (url) => `${corsBase}${encodeURIComponent(url)}`; try { const url = `https://tw.stock.yahoo.com/future/futures.html`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const htmlText = await res.text(); const idx = htmlText.indexOf('WTX&'); const idx2 = htmlText.indexOf('WTX&amp;'); const hit = (idx !== -1) ? idx : idx2; if (hit === -1) throw new Error('WTX& not found'); const slice = htmlText.slice(Math.max(0, hit - 4000), Math.min(htmlText.length, hit + 8000)); const textOnly = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); const m = textOnly.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([+-]?\d+(?:\.\d+)?)%/); let change = m ? parseFloat(m[1].replace(/,/g, '')) : 0; let percent = m ? parseFloat(m[2]) : 0; if (typeof percent === 'number' && !isNaN(percent) && typeof change === 'number' && !isNaN(change)) { if (percent < 0 && change > 0) change = -change; else if (percent > 0 && change < 0) change = Math.abs(change); } const after = textOnly.split(/WTX&|WTX&amp;/).slice(1).join(' ').trim(); const numsAfter = after.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || []; const price = numsAfter.length ? parseFloat(numsAfter[0].replace(/,/g, '')) : null; if (typeof price !== 'number' || isNaN(price)) throw new Error('No price parsed'); if (!Array.isArray(this.globalIndices) || this.globalIndices.length === 0) { await this.fetchGlobalIndices(); this.isTaiexNightLoading = false; return; } const i = this.globalIndices.findIndex(x => x.kind === 'taiexNight' || x.symbol === 'WTX&'); const item = { symbol: 'WTX&', name: '台股指數(夜盤)', kind: 'taiexNight', price: Number(price).toFixed(2), change: (typeof change === 'number' && !isNaN(change)) ? change : 0, percent: (typeof percent === 'number' && !isNaN(percent)) ? percent : 0 }; if (i >= 0) this.$set ? this.$set(this.globalIndices, i, item) : (this.globalIndices.splice(i, 1, item)); else this.globalIndices.push(item); this.globalIndicesLastTs = Date.now(); localStorage.setItem('tw_stock_global_time_ts_v1', String(this.globalIndicesLastTs)); const missing = (this.globalIndices || []).filter(x => x && x.price === '-').length; const total = (this.globalIndices || []).length; const success = total - missing; this.globalIndicesError = (success <= 0); this.globalIndicesPartial = (!this.globalIndicesError && missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem('tw_stock_global_update_error_v1', this.globalIndicesError ? '1' : '0'); localStorage.setItem('tw_stock_global_update_partial_v1', this.globalIndicesPartial ? '1' : '0'); localStorage.setItem('tw_stock_global_update_missing_count_v1', String(this.globalIndicesMissingCount)); } catch (e) { const i = this.globalIndices.findIndex(x => x.kind === 'taiexNight' || x.symbol === 'WTX&'); if (i >= 0) { const cur = this.globalIndices[i]; const next = { ...cur, price: '-', change: 0, percent: 0 }; this.globalIndices.splice(i, 1, next); } const missing = (this.globalIndices || []).filter(x => x && x.price === '-').length; const total = (this.globalIndices || []).length; const success = total - missing; this.globalIndicesError = (success <= 0); this.globalIndicesPartial = (!this.globalIndicesError && missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem('tw_stock_global_update_error_v1', this.globalIndicesError ? '1' : '0'); localStorage.setItem('tw_stock_global_update_partial_v1', this.globalIndicesPartial ? '1' : '0'); localStorage.setItem('tw_stock_global_update_missing_count_v1', String(this.globalIndicesMissingCount)); } finally { this.isTaiexNightLoading = false; } },
        lookupStock() { const term = this.searchText; if (!term) { this.suggestions = []; this.showSuggestions = false; return; } const localResults = this.fullStockMap.filter(s => s.code.startsWith(term) || s.name.includes(term)); this.suggestions = localResults.slice(0, 6); this.showSuggestions = true; const exact = localResults.find(s => s.code === term || s.name === term); if(exact) { this.newTx.code = exact.code; this.newTx.name = exact.name; } if (term.length > 1 && localResults.length < 3) { if (this.searchTimeout) clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(() => { this.fetchOnlineSuggestions(term); }, 500); } },

async fetchOnlineSuggestions(query) {
    this.isSearching = true;
    try {
        const proxyUrl = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? "https://corsproxy.io/?"
            : "/.netlify/functions/yahoo?u=";

        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=zh-Hant-TW&region=TW&quotesCount=5&newsCount=0`;
        const res = await fetch(proxyUrl + encodeURIComponent(url));
        const data = await res.json();

        if (data.quotes && data.quotes.length > 0) {
            const onlineResults = data.quotes
                .filter(q => q.symbol && (q.symbol.endsWith('.TW') || q.symbol.endsWith('.TWO')))
                .map(q => ({
                    code: q.symbol.replace(/\.TW(O)?$/, ''),
                    name: q.longname || q.shortname || '',
                    isOnline: true
                }));

            const existingCodes = new Set(this.suggestions.map(s => s.code));
            onlineResults.forEach(item => {
                if (!existingCodes.has(item.code)) this.suggestions.push(item);
            });
        }
    } catch (e) {
    } finally {
        this.isSearching = false;
    }
},
        selectSuggestion(stock) { this.searchText = stock.code + " " + stock.name; this.newTx.code = stock.code; this.newTx.name = stock.name; this.showSuggestions = false; },
        addTransaction() {
            if (!this.newTx.code || !this.newTx.price || !this.newTx.qty) { this.openInfoModal('資料不完整', '請輸入代碼、價格與股數'); return; }
            const type = (this.newTx.type === 'sell') ? 'sell' : 'buy';
            const code = String(this.newTx.code).trim();
            const name = String(this.newTx.name || '').trim();
            const price = Number(this.newTx.price);
            const qty = Number(this.newTx.qty);
            if (!price || !qty || price <= 0 || qty <= 0) { this.openInfoModal('資料錯誤', '請輸入正確價格與股數'); return; }

            const exists = this.fullStockMap.find(s => s.code === code);
            if (!exists && name) {
                this.customStocks.push({ code, name });
                localStorage.setItem('tw_stock_custom_v6', JSON.stringify(this.customStocks));
            }
            this.latestPrices[code] = price;

            const subTotal = price * qty;
            const fee = this.calcBrokerFee(subTotal);

            // 當沖是否成立要看同日配對結果；這裡先以一般稅率估算，最終以 recompute 重新計算為準。
            let tax = 0;
            let totalAmount = subTotal + fee;
            if (type === 'sell') {
                const taxRate = this.settings.taxRate;
                tax = this.calcBrokerTax(subTotal, taxRate);
                totalAmount = subTotal - fee - tax;
            }

            const mode = (this.newTx.mode || 'cash');
            const dayTradeEligible = !!this.newTx.dayTradeEligible;

            const backup = JSON.parse(JSON.stringify(this.transactions));
            this.transactions.push({ id: Date.now(), date: this.newTx.date, code, name: name || (exists ? exists.name : code), type, mode, dayTradeEligible, price, qty, category: this.newTx.category, fee, tax, totalAmount, realizedPnL: null });

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return; }

            this.saveData();
            this.newTx.price = null;
            this.searchText = '';
            this.newTx.dayTradeEligible = false;
            this.showAddModal = false;
            this.openInfoModal('新增成功', '交易紀錄已儲存！');
        },
        openSellModal(stock) {
            if (!stock || !stock.code) return;
            // Inventory sell modal is for closing long positions. For shorts, use the top trade form.
            if (Number(stock.qty) <= 0) {
                this.openInfoModal('空單持倉', '此標的是空單（負庫存）。回補請用上方「新增交易紀錄」選買入/回補；要加空請選賣出/做空。');
                return;
            }
                        const defaultModeTx = [...this.transactions].sort((a,b) => (new Date(b.date) - new Date(a.date)) || (Number(b.id||0)-Number(a.id||0)))
                .find(t => t && t.code === stock.code && t.type === 'buy' && ((t.mode === 'margin') || (t.mode === 'cash')));
            const defaultMode = (defaultModeTx && defaultModeTx.mode) ? defaultModeTx.mode : 'cash';
            this.sellTx = {
                date: new Date().toISOString().split('T')[0],
                code: stock.code,
                name: stock.name,
                price: this.latestPrices[stock.code] || stock.currentPrice || null,
                qty: Math.abs(stock.qty),
                maxQty: Math.abs(stock.qty),
                category: stock.category,
                                mode: defaultMode,
                dayTradeEligible: false
            };
            this.showSellModal = true;
        },
        confirmSell() {
            if(!this.sellTx.price || !this.sellTx.qty || this.sellTx.qty <= 0) { this.openInfoModal('資料錯誤', '請輸入正確價格與股數'); return; }
            if(this.sellTx.maxQty && this.sellTx.qty > this.sellTx.maxQty) { this.openInfoModal('庫存不足', '賣出股數不可大於庫存'); return; }

            const subTotal = this.sellTx.price * this.sellTx.qty;
            const fee = this.calcBrokerFee(subTotal);
            // 當沖是否成立要看同日配對結果；這裡先以一般稅率估算，最終以 recompute 重新計算為準。
            const taxRate = this.settings.taxRate;
            const tax = this.calcBrokerTax(subTotal, taxRate);
            const totalAmount = subTotal - fee - tax;

            const backup = JSON.parse(JSON.stringify(this.transactions));
            this.transactions.push({ id: Date.now(), date: this.sellTx.date, code: this.sellTx.code, name: this.sellTx.name, type: 'sell', mode: (this.sellTx.mode || 'cash'), dayTradeEligible: !!this.sellTx.dayTradeEligible, price: Number(this.sellTx.price), qty: Number(this.sellTx.qty), category: this.sellTx.category, fee, tax, totalAmount, realizedPnL: null });

            const ok = this.recomputeAllTradesAndValidate();
            if (!ok) { this.transactions = backup; return; }

            this.saveData();
            this.showSellModal = false;
        },
        applyKangHePreset() { this.settings.feeRate = 0.1425; this.settings.discount = 1; this.settings.taxRate = 0.3; this.settings.dayTradeTaxRate = 0.15; this.settings.minFee = 20; },
        saveSettings() { localStorage.setItem('tw_stock_settings_v6', JSON.stringify(this.settings)); this.showSettings = false; },
        saveData() { localStorage.setItem('tw_stock_tx_v6', JSON.stringify(this.transactions)); },
        exportData() { const dateStr = new Date().toISOString().split('T')[0]; this.exportFileName = `stock_backup_${dateStr}`; this.backupTab = 'download'; this.restoreFileName = ''; this.restoreFileObject = null; this.showExportModal = true; },
        confirmExport() { const dataStr = JSON.stringify({ tx: this.transactions, settings: this.settings, custom: this.customStocks, prices: this.latestPrices, time: this.lastUpdateTime }); const blob = new Blob([dataStr], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${this.exportFileName || 'backup'}.json`; a.click(); this.showExportModal = false; },
        onRestoreBackupFileChange(e) { const file = e?.target?.files?.[0]; if (!file) return; this.restoreFileName = file.name || ''; this.restoreFileObject = file; },
        async confirmRestoreFromBackupFile() { if (!this.restoreFileObject) return; this.restoreBusy = true; try { const file = this.restoreFileObject; const text = await file.text(); let payload; try { payload = JSON.parse(text); } catch (err) { throw new Error('備份檔案不是有效的 JSON 格式。'); } this._applyBackupPayload(payload); this.openInfoModal('還原成功', '已從備份檔案還原資料，將重新整理以套用所有狀態。'); setTimeout(() => window.location.reload(), 600); } catch (e) { this.openInfoModal('還原失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.restoreBusy = false; } },
        _applyBackupPayload(payload) { if (!payload || typeof payload !== 'object') throw new Error('備份檔內容格式不正確。'); const tx = Array.isArray(payload.tx) ? payload.tx : []; const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : this.settings; const custom = Array.isArray(payload.custom) ? payload.custom : []; const prices = payload.prices && typeof payload.prices === 'object' ? payload.prices : {}; const status = payload.status && typeof payload.status === 'object' ? payload.status : (this.latestStatus || {}); const time = typeof payload.time === 'string' ? payload.time : ''; this.transactions = tx; this.settings = settings; this.customStocks = custom; this.latestPrices = prices; this.latestStatus = status; this.lastUpdateTime = time; localStorage.setItem('tw_stock_tx_v6', JSON.stringify(tx)); localStorage.setItem('tw_stock_settings_v6', JSON.stringify(settings)); localStorage.setItem('tw_stock_custom_v6', JSON.stringify(custom)); localStorage.setItem('tw_stock_prices_v6', JSON.stringify(prices)); localStorage.setItem('tw_stock_status_v6', JSON.stringify(status)); localStorage.setItem('tw_stock_time_v6', time); try { this.recomputeAllTradesAndValidate(); } catch (_) {} },
        _readCloudMeta() { try { return JSON.parse(localStorage.getItem('tw_stock_cloud_meta_v1') || '{}') || {}; } catch(e) { return {}; } },
        _writeCloudMeta(patch) { const cur = this._readCloudMeta(); const next = Object.assign({}, cur, patch || {}); localStorage.setItem('tw_stock_cloud_meta_v1', JSON.stringify(next)); this.gdriveCloudMeta = next; },
        formatDateTime(ts) { if (!ts) return '—'; const d = new Date(ts); if (isNaN(d.getTime())) return '—'; try { return d.toLocaleString('zh-TW', { hour12: false }); } catch (_) { return d.toLocaleString(); } },
        async refreshGDriveCloudMeta() { this.gdriveBusy = true; this.gdriveBusyText = '正在取得雲端狀態…'; try { const accessToken = await this._ensureGDriveAccessToken(); const info = await this._findBackupFileId(accessToken); if (!info) { this._writeCloudMeta({ cloudFileModifiedTime: '', cloudFileExists: false }); this.openInfoModal('雲端狀態', '雲端目前沒有找到備份檔（tw_stock_backup.json）。'); return; } this._writeCloudMeta({ cloudFileExists: true, cloudFileModifiedTime: info.modifiedTime || '' }); this.openInfoModal('雲端狀態', '雲端最後修改時間。'); } catch(e) { this.openInfoModal('雲端狀態', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
        saveGDriveClientId() { const cid = (this.gdriveClientIdInput || '').trim(); if (!cid) { this.openInfoModal('提示', '請先輸入 Google OAuth Client ID。'); return; } localStorage.setItem('tw_stock_gdrive_client_id_v1', cid); this.gdriveClientId = cid; this.openInfoModal('已儲存', 'Google OAuth Client ID 已儲存。'); },
        clearGDriveClientId() { localStorage.removeItem('tw_stock_gdrive_client_id_v1'); this.gdriveClientId = ''; this.gdriveClientIdInput = ''; this.openInfoModal('已清除', '已清除 Google OAuth Client ID。'); },
        async _ensureGDriveAccessToken() { const cid = (this.gdriveClientId || '').trim(); if (!cid) throw new Error('缺少 Google OAuth Client ID。'); if (!window.google || !google.accounts || !google.accounts.oauth2) { throw new Error('Google Identity Services 尚未載入，請稍後再試。'); } if (!__gdriveTokenClient || __gdriveTokenClientCid !== cid) { __gdriveTokenClient = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: __GDRIVE_SCOPE, callback: () => {} }); __gdriveTokenClientCid = cid; } const token = await new Promise((resolve, reject) => { let finished = false; const timer = setTimeout(() => { if (finished) return; finished = true; reject(new Error('授權逾時。請確認已允許彈出視窗（Popup），並在 https 網域下使用。')); }, 10000); __gdriveTokenClient.callback = (resp) => { if (finished) return; finished = true; clearTimeout(timer); if (resp && resp.access_token) resolve(resp.access_token); else reject(new Error(resp?.error_description || resp?.error || '授權失敗')); }; try { __gdriveTokenClient.requestAccessToken({ prompt: 'consent' }); } catch (e) { if (finished) return; finished = true; clearTimeout(timer); reject(new Error('無法啟動授權流程。請允許彈出視窗（Popup）後再試一次。')); } }); return token; },
        async _findBackupFileId(accessToken) { const q = encodeURIComponent("name='tw_stock_backup.json' and 'appDataFolder' in parents and trashed=false"); const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`; const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }}); if (!res.ok) throw new Error(`Drive 查詢失敗（${res.status}）`); const j = await res.json(); return (j.files && j.files[0] && j.files[0].id) ? { id: j.files[0].id, modifiedTime: j.files[0].modifiedTime || '' } : null; },
        _buildBackupPayload() { return { tx: this.transactions, settings: this.settings, custom: this.customStocks, prices: this.latestPrices, status: this.latestStatus, time: this.lastUpdateTime, version: 1, exportedAt: new Date().toISOString() }; },
        async uploadToGDrive() { this.gdriveBusy = true; this.gdriveBusyText = '正在授權／連線…'; try { const accessToken = await this._ensureGDriveAccessToken(); const payload = this._buildBackupPayload(); const fileInfo = await this._findBackupFileId(accessToken); const fileId = fileInfo && fileInfo.id ? fileInfo.id : null; const boundary = '-------314159265358979323846'; const metadata = fileId ? { name: 'tw_stock_backup.json' } : { name: 'tw_stock_backup.json', parents: ['appDataFolder'] }; const multipartBody = `--${boundary}\r\n` + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + `${JSON.stringify(metadata)}\r\n` + `--${boundary}\r\n` + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + `${JSON.stringify(payload)}\r\n` + `--${boundary}--`; const uploadUrl = fileId ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,modifiedTime` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`; const method = fileId ? 'PATCH' : 'POST'; const res = await fetch(uploadUrl, { method, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipartBody }); if (!res.ok) { const t = await res.text().catch(()=>''); throw new Error(`上傳失敗（${res.status}）${t ? '：' + t : ''}`); } let uploadInfo = null; try { uploadInfo = await res.json(); } catch(_) { uploadInfo = null; } const nowIso = new Date().toISOString(); this._writeCloudMeta({ lastCloudUploadAt: nowIso, lastAction: 'upload', cloudFileExists: true, cloudFileModifiedTime: (uploadInfo && uploadInfo.modifiedTime) ? uploadInfo.modifiedTime : (fileInfo && fileInfo.modifiedTime ? fileInfo.modifiedTime : '') }); this.openInfoModal('上傳成功', '已將資料備份到 Google 雲端。'); } catch (e) { this.openInfoModal('上傳失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
        async restoreFromGDrive() { this.gdriveBusy = true; this.gdriveBusyText = '正在授權／下載備份…'; try { const accessToken = await this._ensureGDriveAccessToken(); const fileInfo = await this._findBackupFileId(accessToken); const fileId = fileInfo && fileInfo.id ? fileInfo.id : null; if (!fileId) { this.openInfoModal('回復失敗', '雲端找不到備份檔案（tw_stock_backup.json）。'); return; } const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`; const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }}); if (!res.ok) throw new Error(`下載失敗（${res.status}）`); const payload = await res.json(); if (!payload || typeof payload !== 'object') throw new Error('備份檔內容格式不正確。'); const tx = Array.isArray(payload.tx) ? payload.tx : []; const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : this.settings; const custom = Array.isArray(payload.custom) ? payload.custom : []; const prices = payload.prices && typeof payload.prices === 'object' ? payload.prices : {}; const status = payload.status && typeof payload.status === 'object' ? payload.status : {}; const time = typeof payload.time === 'string' ? payload.time : ''; this.transactions = tx; this.settings = settings; this.customStocks = custom; this.latestPrices = prices; this.latestStatus = status; this.lastUpdateTime = time; localStorage.setItem('tw_stock_tx_v6', JSON.stringify(tx)); localStorage.setItem('tw_stock_settings_v6', JSON.stringify(settings)); localStorage.setItem('tw_stock_custom_v6', JSON.stringify(custom)); localStorage.setItem('tw_stock_prices_v6', JSON.stringify(prices)); localStorage.setItem('tw_stock_status_v6', JSON.stringify(status)); localStorage.setItem('tw_stock_time_v6', time); const nowIso = new Date().toISOString(); this._writeCloudMeta({ lastCloudRestoreAt: nowIso, lastAction: 'restore', cloudFileExists: true, cloudFileModifiedTime: (fileInfo && fileInfo.modifiedTime) ? fileInfo.modifiedTime : (this.gdriveCloudMeta && this.gdriveCloudMeta.cloudFileModifiedTime ? this.gdriveCloudMeta.cloudFileModifiedTime : '') }); this.openInfoModal('回復成功', '已從雲端回復資料，將重新整理以套用所有狀態。'); setTimeout(() => window.location.reload(), 600); } catch (e) { this.openInfoModal('回復失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
        formatPrice2(val) { const num = Number(val); if (!Number.isFinite(num)) return '0.00'; const fixed = num.toFixed(2); const parts = fixed.split('.'); const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return intPart + '.' + (parts[1] || '00'); },
        formatCurrency(val) { return Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    }
}).mount('#app');

