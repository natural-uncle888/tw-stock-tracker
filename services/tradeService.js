(function(window) {
  'use strict';

  window.StockTradeService = {
            holdings() {
                const orderedTx = [...(this.portfolioTransactions || [])].sort((a, b) => {
                    const da = new Date(a.date).getTime();
                    const db = new Date(b.date).getTime();
                    if (da !== db) return da - db;
                    return (Number(a.id || 0) - Number(b.id || 0));
                });
                const dividendEffects = window.StockDividendService ? window.StockDividendService.stockDividendPositionEffects(this) : [];
                const events = [
                    ...orderedTx.map(tx => ({ kind: 'trade', date: tx.date, sortId: Number(tx.id || 0), tx })),
                    ...dividendEffects.map(effect => ({ kind: 'stock_dividend', date: effect.date, sortId: Number(String(effect.id || '').replace(/\D/g, '').slice(-10)) || 0, effect })),
                ].sort((a, b) => {
                    const da = new Date(a.date).getTime();
                    const db = new Date(b.date).getTime();
                    if (da !== db) return da - db;
                    if (a.kind !== b.kind) return a.kind === 'stock_dividend' ? -1 : 1;
                    return (a.sortId || 0) - (b.sortId || 0);
                });

                const state = {};
                const realized = {};
                const ensureState = (code, seed) => {
                    if (!state[code]) {
                        state[code] = {
                            qty: 0,
                            cost: 0,
                            category: seed && seed.category,
                            name: (this.nameMap && this.nameMap[code]) ? this.nameMap[code] : (seed && seed.name) || code,
                            lots: [],
                        };
                    }
                    if (!realized[code]) realized[code] = 0;
                    return state[code];
                };

                const applyTrade = (tx) => {
                    if (!tx || !tx.code) return;
                    const code = String(tx.code).trim();
                    const s = ensureState(code, tx);
                    realized[code] += (tx.realizedPnL !== null && tx.realizedPnL !== undefined) ? Number(tx.realizedPnL) : 0;
                    const qty = Number(tx.posQty ?? tx.qty) || 0;
                    const totalAmount = Number(tx.posAmount ?? tx.totalAmount) || 0;
                    if (qty <= 0 || totalAmount < 0) return;

                    if (tx.type === 'buy') {
                        if (s.qty >= 0) {
                            s.qty += qty;
                            s.cost += totalAmount;
                            s.lots.push({ buyTxId: tx.id, date: tx.date, price: Number(tx.price) || 0, unitCost: qty > 0 ? totalAmount / qty : 0, remainingQty: qty, sourceType: 'buy' });
                        } else {
                            const absShort = Math.abs(s.qty);
                            const coverQty = Math.min(qty, absShort);
                            const avgEntry = s.cost / s.qty;
                            const coverAmount = totalAmount * (coverQty / qty);
                            s.qty += coverQty;
                            s.cost += avgEntry * coverQty;
                            const remain = qty - coverQty;
                            if (remain > 0) {
                                const remainAmount = totalAmount - coverAmount;
                                s.qty += remain;
                                s.cost += remainAmount;
                                s.lots.push({ buyTxId: tx.id, date: tx.date, price: Number(tx.price) || 0, unitCost: remain > 0 ? remainAmount / remain : 0, remainingQty: remain, sourceType: 'buy' });
                            }
                        }
                    } else if (tx.type === 'sell') {
                        if (s.qty <= 0) {
                            s.qty -= qty;
                            s.cost -= totalAmount;
                        } else {
                            const closeQty = Math.min(qty, s.qty);
                            const closeAmount = totalAmount * (closeQty / qty);
                            let qtyToClose = closeQty;
                            let closedCost = 0;
                            const allocations = Array.isArray(tx.lotAllocations) ? tx.lotAllocations : [];
                            if (!allocations.length) {
                                // Preserve the pre-upgrade average-cost behaviour for historical sells.
                                const avgEntry = s.qty > 0 ? s.cost / s.qty : 0;
                                closedCost = avgEntry * closeQty;
                                const totalOpen = s.lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.remainingQty) || 0), 0);
                                const ratio = totalOpen > 1e-9 ? Math.min(1, closeQty / totalOpen) : 0;
                                if (ratio > 0) s.lots.forEach(lot => { lot.remainingQty = Math.max(0, Number(lot.remainingQty) || 0) * (1 - ratio); });
                                qtyToClose = 0;
                            } else {
                                const consumeLot = (lot, wantedQty) => {
                                    if (!lot || qtyToClose <= 1e-9) return;
                                    const q = Math.min(qtyToClose, Math.max(0, Number(wantedQty) || 0), Math.max(0, Number(lot.remainingQty) || 0));
                                    if (q <= 0) return;
                                    closedCost += q * (Number(lot.unitCost) || 0);
                                    lot.remainingQty -= q;
                                    qtyToClose -= q;
                                };
                                for (const alloc of allocations) {
                                    if (qtyToClose <= 1e-9) break;
                                    const lot = s.lots.find(l => String(l.buyTxId) === String(alloc && alloc.buyTxId) && Number(l.remainingQty) > 1e-9);
                                    consumeLot(lot, alloc && alloc.qty);
                                }
                                for (const lot of s.lots) {
                                    if (qtyToClose <= 1e-9) break;
                                    consumeLot(lot, lot.remainingQty);
                                }
                            }
                            s.qty -= closeQty;
                            s.cost -= closedCost;
                            s.lots = s.lots.filter(l => Number(l.remainingQty) > 1e-9);
                            const remain = qty - closeQty;
                            if (remain > 0) {
                                const remainAmount = totalAmount - closeAmount;
                                s.qty -= remain;
                                s.cost -= remainAmount;
                            }
                        }
                    }
                    if (Math.abs(s.qty) < 1e-9) { s.qty = 0; s.cost = 0; }
                    s.category = tx.category || s.category;
                    s.name = tx.name || s.name;
                };

                const applyStockDividend = (effect) => {
                    if (!effect || !effect.code) return;
                    const code = String(effect.code).trim();
                    const s = ensureState(code, effect);
                    const qtyEffect = Number(effect.qtyEffect) || 0;
                    if (!qtyEffect) return;
                    s.qty += qtyEffect;
                    // Stock dividends increase share count but do not increase original cost.
                    s.cost += Number(effect.costEffect) || 0;
                    if (qtyEffect > 0) s.lots.push({ buyTxId: `dividend:${effect.id || effect.date}`, date: effect.date, price: 0, unitCost: 0, remainingQty: qtyEffect, sourceType: 'dividend' });
                    if (Math.abs(s.qty) < 1e-9) { s.qty = 0; s.cost = 0; }
                    s.name = effect.name || s.name;
                };

                events.forEach(event => {
                    if (event.kind === 'stock_dividend') applyStockDividend(event.effect);
                    else applyTrade(event.tx);
                });

                return Object.entries(state).filter(([code, s]) => s.qty !== 0).map(([code, s]) => {
                    const entryAvgPrice = s.qty ? (s.cost / s.qty) : 0;
                    const currentPrice = this.latestPrices[code] || entryAvgPrice;
                    const absQty = Math.abs(s.qty);
                    const marketValueAbs = currentPrice * absQty;
                    let unrealizedPnL = 0;
                    if (s.qty > 0) {
                        unrealizedPnL = (currentPrice * s.qty) - s.cost;
                    } else {
                        unrealizedPnL = (-s.cost) - marketValueAbs;
                    }
                    const investedBase = Math.abs(s.cost);
                    const roi = investedBase > 0 ? ((unrealizedPnL / investedBase) * 100).toFixed(2) : 0;
                    const status = this.latestStatus[code] || { isWarning: false, disposition: 0 };
                    const dividendSummary = window.StockDividendService ? window.StockDividendService.dividendSummaryByCode(this, code) : { settledCash: 0, receivableCash: 0, settledStockQty: 0, receivableStockQty: 0, totalCash: 0 };
                    const totalReturnPnL = unrealizedPnL + (realized[code] || 0) + Number(dividendSummary.totalCash || 0);
                    const totalReturnRoi = investedBase > 0 ? ((totalReturnPnL / investedBase) * 100).toFixed(2) : 0;
                    return {
                        code,
                        name: (this.nameMap && this.nameMap[code]) ? this.nameMap[code] : (s.name || code),
                        qty: s.qty,
                        category: s.category || 'core',
                        realizedPnL: (realized[code] || 0),
                        totalCost: s.cost,
                        buyAvgPrice: entryAvgPrice,
                        entryAvgPrice,
                        investedBase,
                        currentPrice,
                        unrealizedPnL,
                        roi,
                        dividendSummary,
                        dividendIncome: Number(dividendSummary.totalCash || 0),
                        dividendStockQty: Number(dividendSummary.settledStockQty || 0),
                        totalReturnPnL,
                        totalReturnRoi,
                        isWarning: status.isWarning,
                        disposition: status.disposition,
                    };
                }).sort((a,b) => (b.category || '').localeCompare(a.category || '') || a.code.localeCompare(b.code));
            },
                    filterCategories() {
                const cats = Array.isArray(this.categories) ? this.categories : [];
                // Show only categories that are used in current holdings, excluding 'all'
                const used = new Set((this.holdings || []).map(h => h && h.category).filter(Boolean));
                return cats.filter(c => c && c.id && used.has(c.id));
            },
    


            openLongLots(code, portfolioId, asOfDate) {
                const targetCode = String(code || '').trim();
                const pid = portfolioId || 'main';
                if (!targetCode) return [];
                const cutoff = asOfDate ? new Date(`${asOfDate}T23:59:59`).getTime() : Infinity;
                const txs = (Array.isArray(this.transactions) ? this.transactions : [])
                    .filter(tx => tx && String(tx.code || '').trim() === targetCode && (tx.portfolioId || 'main') === pid)
                    .filter(tx => {
                        const t = new Date(`${tx.date}T12:00:00`).getTime();
                        return Number.isFinite(t) && t <= cutoff;
                    })
                    .sort((a, b) => {
                        const da = new Date(a.date).getTime();
                        const db = new Date(b.date).getTime();
                        if (da !== db) return da - db;
                        return Number(a.id || 0) - Number(b.id || 0);
                    });

                const lots = [];
                let shortQty = 0;
                const findLot = id => lots.find(l => String(l.buyTxId) === String(id) && l.remainingQty > 1e-9);
                const consume = (qty, allocations) => {
                    let remain = Math.max(0, Number(qty) || 0);
                    if (remain <= 0) return;
                    const allocs = Array.isArray(allocations) ? allocations : [];
                    if (!allocs.length) {
                        // Legacy sells used average-cost accounting. Keep old records unchanged by
                        // reducing every open lot proportionally instead of assigning a specific lot.
                        const totalOpen = lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.remainingQty) || 0), 0);
                        const closeQty = Math.min(remain, totalOpen);
                        if (totalOpen > 1e-9 && closeQty > 0) {
                            const ratio = closeQty / totalOpen;
                            for (const lot of lots) lot.remainingQty = Math.max(0, Number(lot.remainingQty) || 0) * (1 - ratio);
                            remain -= closeQty;
                        }
                    } else {
                        for (const a of allocs) {
                            if (remain <= 1e-9) break;
                            const lot = findLot(a && a.buyTxId);
                            if (!lot) continue;
                            const q = Math.min(remain, lot.remainingQty, Math.max(0, Number(a.qty) || 0));
                            if (q <= 0) continue;
                            lot.remainingQty -= q;
                            remain -= q;
                        }
                        // Defensive fallback for edited/manual data whose allocations are incomplete.
                        for (const lot of lots) {
                            if (remain <= 1e-9) break;
                            if (lot.remainingQty <= 1e-9) continue;
                            const q = Math.min(remain, lot.remainingQty);
                            lot.remainingQty -= q;
                            remain -= q;
                        }
                    }
                    if (remain > 1e-9) shortQty += remain;
                };

                for (const tx of txs) {
                    const qty = Math.max(0, Number(tx.posQty ?? tx.qty) || 0);
                    if (qty <= 0) continue;
                    if (tx.type === 'buy') {
                        let q = qty;
                        if (shortQty > 0) {
                            const cover = Math.min(q, shortQty);
                            shortQty -= cover;
                            q -= cover;
                        }
                        if (q > 1e-9) {
                            const totalPosAmount = Number(tx.posAmount ?? tx.totalAmount) || 0;
                            const unitCost = qty > 0 ? totalPosAmount / qty : Number(tx.price) || 0;
                            lots.push({
                                buyTxId: tx.id,
                                date: tx.date,
                                price: Number(tx.price) || 0,
                                unitCost,
                                originalQty: q,
                                remainingQty: q,
                                mode: tx.mode || 'cash',
                                sourceType: 'buy'
                            });
                        }
                    } else if (tx.type === 'sell') {
                        if (shortQty > 0 || !lots.some(l => l.remainingQty > 1e-9)) {
                            shortQty += qty;
                        } else {
                            consume(qty, tx.lotAllocations);
                        }
                    }
                }

                return lots
                    .filter(l => l.remainingQty > 1e-9)
                    .map(l => ({ ...l, remainingQty: Number(l.remainingQty.toFixed(6)) }));
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
    
                // -------- Pass 4: apply position state (avg cost) using posQty/posAmount + settled stock dividends --------
                const pid = (list[0] && (list[0].portfolioId || 'main')) || 'main';
                const dividendEvents = window.StockDividendService ? window.StockDividendService.portfolioActionsFor(this, pid)
                    .filter(a => a && a.stockPaymentDate && a.stockSettled && Number(a.stockDividendQty || 0) > 0)
                    .map(a => ({
                        kind: 'stock_dividend',
                        date: a.stockPaymentDate,
                        sortId: Number(String(a.id || '').replace(/\D/g, '').slice(-10)) || 0,
                        code: a.code,
                        name: a.name,
                        qtyEffect: Number(a.stockDividendQty || 0),
                    })) : [];
                const positionEvents = [
                    ...ordered.map(tx => ({ kind: 'trade', date: tx.date, sortId: Number(tx.id || 0), tx })),
                    ...dividendEvents,
                ].sort((a, b) => {
                    const da = new Date(a.date).getTime();
                    const db = new Date(b.date).getTime();
                    if (da !== db) return da - db;
                    if (a.kind !== b.kind) return a.kind === 'stock_dividend' ? -1 : 1;
                    return (a.sortId || 0) - (b.sortId || 0);
                });

                for (const event of positionEvents) {
                    if (event.kind === 'stock_dividend') {
                        const code = event.code;
                        if (!code) continue;
                        if (!state[code]) state[code] = { qty: 0, cost: 0, lots: [] };
                        const dividendQty = Number(event.qtyEffect || 0);
                        state[code].qty += dividendQty;
                        if (dividendQty > 0 && state[code].qty > 0) {
                            state[code].lots.push({ buyTxId: `dividend:${event.sortId}:${event.date}`, date: event.date, price: 0, unitCost: 0, remainingQty: dividendQty, sourceType: 'dividend' });
                        }
                        if (Math.abs(state[code].qty) < 1e-9) {
                            state[code].qty = 0;
                            state[code].cost = 0;
                        }
                        continue;
                    }

                    const tx = event.tx;
                    if (!tx || !tx.code) continue;
                    const code = tx.code;
                    if (!state[code]) state[code] = { qty: 0, cost: 0, lots: [] };
    
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
                            state[code].lots.push({
                                buyTxId: tx.id,
                                date: tx.date,
                                price: Number(tx.price) || 0,
                                unitCost: qty > 0 ? amount / qty : 0,
                                remainingQty: qty,
                                sourceType: 'buy'
                            });
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
                                state[code].lots.push({
                                    buyTxId: tx.id,
                                    date: tx.date,
                                    price: Number(tx.price) || 0,
                                    unitCost: remain > 0 ? remainAmount / remain : 0,
                                    remainingQty: remain,
                                    sourceType: 'buy'
                                });
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
                            const closeAmount = amount * (closeQty / qty);

                            // New sells may carry explicit lot allocations. Historical sells do
                            // not, so keep their original average-cost accounting unchanged.
                            let qtyToClose = closeQty;
                            let closedCost = 0;
                            const lots = Array.isArray(state[code].lots) ? state[code].lots : (state[code].lots = []);
                            const allocationRows = Array.isArray(tx.lotAllocations) ? tx.lotAllocations : [];
                            if (!allocationRows.length) {
                                const avgEntry = state[code].qty > 0 ? state[code].cost / state[code].qty : 0;
                                closedCost = avgEntry * closeQty;
                                const totalOpen = lots.reduce((sum, lot) => sum + Math.max(0, Number(lot.remainingQty) || 0), 0);
                                const ratio = totalOpen > 1e-9 ? Math.min(1, closeQty / totalOpen) : 0;
                                if (ratio > 0) lots.forEach(lot => { lot.remainingQty = Math.max(0, Number(lot.remainingQty) || 0) * (1 - ratio); });
                                qtyToClose = 0;
                            } else {
                                const consumeLot = (lot, wantedQty) => {
                                    if (!lot || qtyToClose <= 1e-9) return 0;
                                    const q = Math.min(qtyToClose, Math.max(0, Number(wantedQty) || 0), Math.max(0, Number(lot.remainingQty) || 0));
                                    if (q <= 0) return 0;
                                    closedCost += q * (Number(lot.unitCost) || 0);
                                    lot.remainingQty -= q;
                                    qtyToClose -= q;
                                    return q;
                                };
                                for (const alloc of allocationRows) {
                                    if (qtyToClose <= 1e-9) break;
                                    const lot = lots.find(l => String(l.buyTxId) === String(alloc && alloc.buyTxId) && Number(l.remainingQty) > 1e-9);
                                    consumeLot(lot, alloc && alloc.qty);
                                }
                                // Defensive fallback if a later history edit made allocations incomplete.
                                for (const lot of lots) {
                                    if (qtyToClose <= 1e-9) break;
                                    consumeLot(lot, lot.remainingQty);
                                }
                            }

                            if (qtyToClose > 1e-6) {
                                this.openInfoModal('指定批次不足', `${tx.name || code} ${tx.date}：指定的買進批次可用股數不足，請重新選擇賣出批次。`);
                                return false;
                            }

                            const pnl = closeAmount - closedCost;
                            tx.realizedPnL = basePnL + pnl;
                            tx.closedQty = baseClosedQty + closeQty;
                            tx.closedBase = baseClosedBase + closedCost;

                            state[code].qty -= closeQty;
                            state[code].cost -= closedCost;
    
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
                        if (Array.isArray(state[code].lots)) state[code].lots = [];
                    } else if (Array.isArray(state[code].lots)) {
                        state[code].lots = state[code].lots.filter(l => Number(l.remainingQty) > 1e-9);
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
