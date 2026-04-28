(function(window) {
  'use strict';

  window.StockCashService = {
            cashInitialEntry() {
                const list = (this.portfolioCashBook || []).filter(e => e && String(e.type) === 'initial');
                if (list.length === 0) return null;
                return [...list].sort((a,b) => (new Date(a.date) - new Date(b.date)) || (Number(a.id||0) - Number(b.id||0)))[0];
            },
    
            cashInitialCapital() { return this.cashInitialEntry ? (Number(this.cashInitialEntry.amount) || 0) : 0; },
    
            cashDepositsTotal() { return (this.portfolioCashBook || []).filter(e => e && String(e.type) === 'deposit').reduce((s,e) => s + (Number(e.amount) || 0), 0); },
    
            cashWithdrawalsTotal() { return (this.portfolioCashBook || []).filter(e => e && String(e.type) === 'withdraw').reduce((s,e) => s + (Number(e.amount) || 0), 0); },
    
            profitWithdrawalsTotal() { return (this.portfolioProfitAdjustments || []).filter(e => e && String(e.type) === 'withdraw').reduce((s,e) => s + (Number(e.amount) || 0), 0); },
    
            profitRestoresTotal() { return (this.portfolioProfitAdjustments || []).filter(e => e && String(e.type) === 'restore').reduce((s,e) => s + (Number(e.amount) || 0), 0); },
    
            availableRealizedProfit() { return (Number(this.totalRealizedPnL) || 0) - (Number(this.profitWithdrawalsTotal) || 0) + (Number(this.profitRestoresTotal) || 0); },
    
            sortedProfitAdjustments() { return [...(this.portfolioProfitAdjustments || [])].sort((a,b) => (new Date(b.date) - new Date(a.date)) || (Number(b.id || 0) - Number(a.id || 0))); },
    
            profitWithdrawalCategorySummary() {
                const totals = {};
                (this.portfolioProfitAdjustments || []).forEach(e => {
                    if (!e || String(e.type) !== 'withdraw') return;
                    const key = e.category || 'other';
                    totals[key] = (totals[key] || 0) + (Number(e.amount) || 0);
                });
                const total = Object.values(totals).reduce((a,b) => a + b, 0);
                return Object.keys(totals).map(key => ({ category: key, label: this.profitCategoryLabel(key), amount: totals[key], percent: total > 0 ? Number(((totals[key] / total) * 100).toFixed(1)) : 0 })).sort((a,b) => b.amount - a.amount);
            },
    
            cashNetContribution() { return (this.cashInitialCapital || 0) + (this.cashDepositsTotal || 0) - (this.cashWithdrawalsTotal || 0); },
    
            cashTradeNet() {
                let net = 0;
                (this.portfolioTransactions || []).forEach(tx => {
                    if (!tx) return;
                    const amt = Number(tx.totalAmount) || 0;
                    if (tx.type === 'buy') net -= amt;
                    else if (tx.type === 'sell') net += amt;
                });
                return net;
            },
    
            cashBalance() { return (this.cashNetContribution || 0) + (this.cashTradeNet || 0); },
    
            signedMarketValue() {
                return (this.holdings || []).reduce((sum, h) => {
                    const price = this.latestPrices[h.code] || h.currentPrice || h.buyAvgPrice || 0;
                    return sum + (Number(price) || 0) * (Number(h.qty) || 0);
                }, 0);
            },
    
            netAssetValue() { return (this.cashBalance || 0) + (this.signedMarketValue || 0); },
    
            cashTotalPnL() { return (this.netAssetValue || 0) - (this.cashNetContribution || 0); },
    
            cashRoiPercent() {
                const base = Number(this.cashNetContribution) || 0;
                if (base <= 0) return '0.00';
                return ((Number(this.cashTotalPnL) / base) * 100).toFixed(2);
            },
    
            cashTopUpNeeded() { return (this.cashBalance < 0) ? Math.abs(this.cashBalance) : 0; },
    
            canProceedCashTopUp() { return !!(this.cashShortForm && Number(this.cashShortForm.amount || 0) >= Number(this.cashShortNeeded || 0)); },
    
            cashLedgerRowsAll() {
                const pid = this.currentPortfolioId || 'main';
                const rows = [];
                // Manual cash entries
                (this.cashBook || []).forEach(e => {
                    if (!e) return;
                    if ((e.portfolioId || 'main') !== pid) return;
                    const t = String(e.type || 'deposit');
                    const amtAbs = Math.abs(Number(e.amount) || 0);
                    const signed = (t === 'withdraw') ? -amtAbs : amtAbs;
                    const label = (t === 'initial') ? '期初' : (t === 'deposit' ? '入金' : '出金');
                    rows.push({
                        kind: 'cash',
                        id: `cash_${e.id}`,
                        rawId: e.id,
                        date: e.date,
                        subType: t,
                        label,
                        title: e.note ? e.note : label,
                        note: e.note || '',
                        amount: signed,
                        inAmount: signed > 0 ? signed : 0,
                        outAmount: signed < 0 ? Math.abs(signed) : 0,
                        canDelete: true,
                        sortId: Number(e.id) || 0
                    });
                });
                // Trades
                (this.portfolioTransactions || []).forEach(tx => {
                    if (!tx) return;
                    const amt = Number(tx.totalAmount) || 0;
                    const signed = (tx.type === 'sell') ? amt : -amt;
                    const title = `${this.displayNameOnly(tx.code, tx.name)} (${tx.code})`;
                    rows.push({
                        kind: 'trade',
                        id: `tx_${tx.id}`,
                        rawId: tx.id,
                        date: tx.date,
                        subType: tx.type,
                        label: '交易',
                        txType: this.txTypeLabel(tx),
                        title,
                        note: `費用 ${this.formatCurrency(Number(tx.fee||0) + Number(tx.tax||0))}` + ((tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? `｜已實現 ${(Number(tx.realizedPnL)>0?'+':'')}${this.formatCurrency(tx.realizedPnL)}` : ''),
                        amount: signed,
                        inAmount: signed > 0 ? signed : 0,
                        outAmount: signed < 0 ? Math.abs(signed) : 0,
                        canDelete: false,
                        sortId: Number(tx.id) || 0
                    });
                });
                rows.sort((a,b) => {
                    const da = new Date(a.date).getTime();
                    const db = new Date(b.date).getTime();
                    if (da !== db) return da - db;
                    return (a.sortId || 0) - (b.sortId || 0);
                });
                let bal = 0;
                rows.forEach(r => { bal += (Number(r.amount) || 0); r.balance = bal; });
                return rows;
            },
    
            cashLedgerRowsDisplayed() {
                const mode = this.cashViewMode || 'all';
                const all = this.cashLedgerRowsAll || [];
                if (mode === 'cashOnly') return all.filter(r => r.kind === 'cash');
                if (mode === 'tradesOnly') return all.filter(r => r.kind === 'trade');
                return all;
            },
    
            addCashEntry() {
                const pid = this.currentPortfolioId || 'main';
                const date = String(this.cashEntryForm?.date || '').trim();
                const type = String(this.cashEntryForm?.type || 'deposit').trim();
                const amount = Math.abs(Number(this.cashEntryForm?.amount) || 0);
                const note = String(this.cashEntryForm?.note || '').trim();
    
                if (!date) { this.openInfoModal('資料不完整', '請選擇日期。'); return; }
                if (!['initial','deposit','withdraw'].includes(type)) { this.openInfoModal('資料不正確', '類型不正確。'); return; }
                if (!amount || amount <= 0) { this.openInfoModal('資料不完整', '請輸入大於 0 的金額。'); return; }
    
                if (!Array.isArray(this.cashBook)) this.cashBook = [];
                if (type === 'initial') {
                    // Keep only one initial entry per portfolio
                    this.cashBook = (this.cashBook || []).filter(e => !(e && (e.portfolioId || 'main') === pid && String(e.type) === 'initial'));
                }
    
                this.cashBook.push({ id: Date.now(), portfolioId: pid, date, type, amount, note });
                this.cashEntryForm.amount = null;
                this.cashEntryForm.note = '';
                if (type === 'initial') this.cashEntryForm.type = 'deposit';
    
                this.saveData();
                this.openInfoModal('', type === 'initial' ? '期初資金已設定。' : '資金紀錄已新增。');
            },
    
            deleteCashEntry(id) {
                const raw = Number(id) || 0;
                if (!raw) return;
                this.confirmTitle = '刪除資金紀錄';
                this.confirmMessage = '確定要刪除此筆「期初／入金／出金」紀錄嗎？';
                this.confirmCallback = () => {
                    this.cashBook = (this.cashBook || []).filter(e => Number(e?.id) !== raw);
                    this.saveData();
                };
                this.showConfirmModal = true;
            },
    
            profitCategoryLabel(category) {
                const map = { living: '生活費', travel: '旅遊', tax: '稅金', reinvest: '再投入其他資產', other: '其他' };
                return map[category || 'other'] || '其他';
            },
    
            addProfitAdjustment() {
                const pid = this.currentPortfolioId || 'main';
                const date = String(this.profitAdjustmentForm?.date || '').trim();
                const type = String(this.profitAdjustmentForm?.type || 'withdraw').trim();
                const amount = Math.abs(Number(this.profitAdjustmentForm?.amount) || 0);
                const note = String(this.profitAdjustmentForm?.note || '').trim();
                const category = String(this.profitAdjustmentForm?.category || 'other').trim();
                if (!date) { this.openInfoModal('資料不完整', '請選擇日期。'); return; }
                if (!['withdraw','restore'].includes(type)) { this.openInfoModal('資料不正確', '類型不正確。'); return; }
                if (!amount || amount <= 0) { this.openInfoModal('資料不完整', '請輸入大於 0 的金額。'); return; }
                if (!Array.isArray(this.profitAdjustments)) this.profitAdjustments = [];
                this.profitAdjustments.push({ id: Date.now(), portfolioId: pid, date, type, category, amount, note });
                this.profitAdjustmentForm.amount = null;
                this.profitAdjustmentForm.note = '';
                this.saveData();
                this.openInfoModal('', type === 'withdraw' ? '獲利提領已新增。' : '獲利補回已新增。');
            },
    
            deleteProfitAdjustment(id) {
                const raw = Number(id) || 0;
                if (!raw) return;
                this.confirmTitle = '刪除獲利紀錄';
                this.confirmMessage = '確定要刪除此筆「獲利提領／補回」紀錄嗎？';
                this.confirmCallback = () => {
                    this.profitAdjustments = (this.profitAdjustments || []).filter(e => Number(e?.id) !== raw);
                    this.saveData();
                };
                this.showConfirmModal = true;
            },
    
            deleteCurrentPortfolioCashBookEntries() {
                const pid = this.currentPortfolioId || 'main';
                const name = (this.currentPortfolio && this.currentPortfolio.name) ? this.currentPortfolio.name : pid;
                this.cashBook = (this.cashBook || []).filter(e => (e && (e.portfolioId || 'main') !== pid));
                this.saveData();
                this.openInfoModal('已清空', `「${name}」帳本的入出金（含期初）已清空。`);
            },
    
            triggerClearCashBook() {
                const name = (this.currentPortfolio && this.currentPortfolio.name) ? this.currentPortfolio.name : (this.currentPortfolioId || 'main');
                const count = (this.portfolioCashBook || []).length;
                if (count === 0) { this.openInfoModal('無資料', '目前此帳本沒有任何期初/入金/出金紀錄。'); return; }
                this.confirmTitle = `清空「${name}」入出金`;
                this.confirmMessage = `⚠️ 危險操作：確定要永久刪除「${name}」帳本的 ${count} 筆期初/入金/出金紀錄嗎？（不影響買賣交易）`;
                this.confirmCallback = this.deleteCurrentPortfolioCashBookEntries;
                this.showConfirmModal = true;
            },
    
            prefillCashTopUp() {
                const need = Number(this.cashTopUpNeeded) || 0;
                if (need <= 0) return;
                this.cashEntryForm.type = 'deposit';
                this.cashEntryForm.amount = Math.ceil(need);
                this.cashEntryForm.date = new Date().toISOString().split('T')[0];
                this.cashEntryForm.note = '補入金';
            },
    
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
  };
})(window);
