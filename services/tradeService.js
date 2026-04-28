(function(window) {
  'use strict';

  window.StockTradeService = {
            holdings() { const ordered = [...this.portfolioTransactions].sort((a, b) => new Date(a.date) - new Date(b.date)); const state = {}; const realized = {}; ordered.forEach(tx => { if (!tx || !tx.code) return; const code = String(tx.code).trim(); if (!state[code]) state[code] = { qty: 0, cost: 0, category: tx.category, name: (this.nameMap && this.nameMap[code]) ? this.nameMap[code] : tx.name }; if (!realized[code]) realized[code] = 0; realized[code] += (tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? Number(tx.realizedPnL) : 0; const qty = Number(tx.posQty ?? tx.qty) || 0; const totalAmount = Number(tx.posAmount ?? tx.totalAmount) || 0; if (qty <= 0 || totalAmount < 0) return; // should already be normalized by recompute
                    // Update open position state (supports long & short)
                    if (tx.type === 'buy') { if (state[code].qty >= 0) { state[code].qty += qty; state[code].cost += totalAmount; } else { const absShort = Math.abs(state[code].qty); const coverQty = Math.min(qty, absShort); const avgEntry = state[code].cost / state[code].qty; const coverAmount = totalAmount * (coverQty / qty); state[code].qty += coverQty; state[code].cost += avgEntry * coverQty; const remain = qty - coverQty; if (remain > 0) { const remainAmount = totalAmount - coverAmount; state[code].qty += remain; state[code].cost += remainAmount; } } } else if (tx.type === 'sell') { if (state[code].qty <= 0) { state[code].qty -= qty; state[code].cost -= totalAmount; } else { const closeQty = Math.min(qty, state[code].qty); const avgEntry = state[code].cost / state[code].qty; const closeAmount = totalAmount * (closeQty / qty); state[code].qty -= closeQty; state[code].cost -= avgEntry * closeQty; const remain = qty - closeQty; if (remain > 0) { const remainAmount = totalAmount - closeAmount; state[code].qty -= remain; state[code].cost -= remainAmount; } } } if (Math.abs(state[code].qty) < 1e-9) { state[code].qty = 0; state[code].cost = 0; } state[code].category = tx.category || state[code].category; state[code].name = tx.name || state[code].name; }); return Object.entries(state).filter(([code, s]) => s.qty !== 0).map(([code, s]) => { const entryAvgPrice = s.cost / s.qty; const currentPrice = this.latestPrices[code] || entryAvgPrice; const absQty = Math.abs(s.qty); const marketValueAbs = currentPrice * absQty; let unrealizedPnL = 0; if (s.qty > 0) { unrealizedPnL = (currentPrice * s.qty) - s.cost; } else { unrealizedPnL = (-s.cost) - marketValueAbs; } const investedBase = Math.abs(s.cost); const roi = investedBase > 0 ? ((unrealizedPnL / investedBase) * 100).toFixed(2) : 0; const status = this.latestStatus[code] || { isWarning: false, disposition: 0 }; return { code, name: (this.nameMap && this.nameMap[code]) ? this.nameMap[code] : (s.name || code), qty: s.qty, category: s.category || 'core', realizedPnL: (realized[code] || 0), totalCost: s.cost, buyAvgPrice: entryAvgPrice, entryAvgPrice, investedBase, currentPrice, unrealizedPnL, roi, isWarning: status.isWarning, disposition: status.disposition }; }).sort((a,b) => (b.category || '').localeCompare(a.category || '') || a.code.localeCompare(b.code)); },
                    filterCategories() {
                const cats = Array.isArray(this.categories) ? this.categories : [];
                // Show only categories that are used in current holdings, excluding 'all'
                const used = new Set((this.holdings || []).map(h => h && h.category).filter(Boolean));
                return cats.filter(c => c && c.id && used.has(c.id));
            },
    
            filteredStats() { let realizedPnL = 0, fees = 0, buyAmount = 0, sellAmount = 0; this.filteredTransactions.forEach(tx => { fees += (Number(tx.fee || 0) + Number(tx.tax || 0)); if (tx.type === 'buy') buyAmount += Number(tx.totalAmount || 0); else if (tx.type === 'sell') sellAmount += Number(tx.totalAmount || 0); if (tx.realizedPnL !== null && tx.realizedPnL !== undefined) realizedPnL += Number(tx.realizedPnL) || 0; }); return { realizedPnL, fees, buyAmount, sellAmount }; },
    
            calcBrokerFee(subTotal) { const grossFee = Number(subTotal || 0) * (Number(this.settings.feeRate || 0) / 100) * Number(this.settings.discount || 1); return Math.max(Math.floor(grossFee), Math.round(this.settings.minFee || 0)); },
    
            calcBrokerTax(subTotal, taxRatePercent) { return Math.floor(Number(subTotal || 0) * (Number(taxRatePercent || 0) / 100)); },
    
    recomputeAllTradesAndValidate() {
                const all = Array.isArray(this.transactions) ? this.transactions : [];
                const byPid = new Map();
                for (const tx of all) {
                    if (!tx || !tx.code) continue;
                    const pid = (tx.portfolioId || 'main');
                    if (!byPid.has(pid)) byPid.set(pid, []);
                    byPid.get(pid).push(tx);
                }
    
                const recomputeOne = (list) => {
                // Chronological order (oldest -> newest), stable within the same day
                const ordered = [...list].sort((a, b) => {
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
            
                };
    
                for (const [, list] of byPid.entries()) {
                    const ok = recomputeOne(list);
                    if (!ok) return false;
                }
                return true;
            }
    
  };
})(window);
