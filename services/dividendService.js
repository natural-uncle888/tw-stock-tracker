(function(window) {
  'use strict';

  const ACTION_TYPES = ['cash_dividend', 'stock_dividend', 'cash_stock_dividend'];

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function toDateValue(date) {
    if (!date) return null;
    const t = new Date(String(date)).setHours(0, 0, 0, 0);
    return Number.isFinite(t) ? t : null;
  }

  function isOnOrBefore(date, baseDate = todayISO()) {
    const a = toDateValue(date);
    const b = toDateValue(baseDate);
    return a != null && b != null && a <= b;
  }

  function isAfter(date, baseDate = todayISO()) {
    const a = toDateValue(date);
    const b = toDateValue(baseDate);
    return a != null && b != null && a > b;
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function stableId(prefix = 'ca') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function normalizeAction(action) {
    const a = action && typeof action === 'object' ? action : {};
    const cashDividendPerShare = Math.max(0, num(a.cashDividendPerShare, 0));
    const stockDividendPerShareYuan = Math.max(0, num(a.stockDividendPerShareYuan, 0));
    const explicitRatio = num(a.stockDividendRatio, NaN);
    const stockDividendRatio = Number.isFinite(explicitRatio) && explicitRatio > 0
      ? explicitRatio
      : (stockDividendPerShareYuan > 0 ? stockDividendPerShareYuan / 10 : 0);
    const actionType = ACTION_TYPES.includes(a.actionType) ? a.actionType : (
      cashDividendPerShare > 0 && stockDividendRatio > 0 ? 'cash_stock_dividend' :
      stockDividendRatio > 0 ? 'stock_dividend' : 'cash_dividend'
    );
    return {
      id: a.id || stableId('ca'),
      portfolioId: text(a.portfolioId) || 'main',
      code: text(a.code),
      name: text(a.name),
      actionType,
      source: text(a.source) || 'manual',
      status: text(a.status) || 'planned',
      announceDate: text(a.announceDate),
      exDate: text(a.exDate),
      recordDate: text(a.recordDate),
      cashPaymentDate: text(a.cashPaymentDate),
      stockPaymentDate: text(a.stockPaymentDate),
      cashDividendPerShare,
      stockDividendPerShareYuan,
      stockDividendRatio,
      prevClose: Math.max(0, num(a.prevClose, 0)),
      exReferencePrice: Math.max(0, num(a.exReferencePrice, 0)),
      eligibleQty: Math.max(0, Math.floor(num(a.eligibleQty, 0))),
      lockedAt: text(a.lockedAt),
      taxWithheld: Math.max(0, num(a.taxWithheld, 0)),
      fractionalShareCash: Math.max(0, num(a.fractionalShareCash, 0)),
      note: text(a.note),
      createdAt: text(a.createdAt) || new Date().toISOString(),
      updatedAt: text(a.updatedAt) || new Date().toISOString(),
    };
  }

  function sortChronological(list) {
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
      const da = toDateValue(a && a.date) || 0;
      const db = toDateValue(b && b.date) || 0;
      if (da !== db) return da - db;
      return (Number(a && a.id) || 0) - (Number(b && b.id) || 0);
    });
  }

  function positionQtyAsOf(transactions, corporateActions, options) {
    const pid = text(options && options.portfolioId) || 'main';
    const code = text(options && options.code);
    const beforeDate = text(options && options.beforeDate);
    const ignoreActionId = text(options && options.ignoreActionId);
    if (!code || !beforeDate) return 0;
    const cutoff = toDateValue(beforeDate);
    if (cutoff == null) return 0;
    let qty = 0;
    sortChronological(transactions).forEach(tx => {
      if (!tx || text(tx.code) !== code) return;
      if ((tx.portfolioId || 'main') !== pid) return;
      const txDate = toDateValue(tx.date);
      if (txDate == null || txDate >= cutoff) return; // ex-date trades do not affect entitlement
      const posQty = Math.max(0, num(tx.posQty != null ? tx.posQty : tx.qty, 0));
      if (posQty <= 0) return;
      if (tx.type === 'buy') qty += posQty;
      else if (tx.type === 'sell') qty -= posQty;
    });

    (Array.isArray(corporateActions) ? corporateActions : []).forEach(raw => {
      const action = normalizeAction(raw);
      if (ignoreActionId && text(action.id) === ignoreActionId) return;
      if (action.portfolioId !== pid || action.code !== code) return;
      if (!action.stockPaymentDate) return;
      const payDate = toDateValue(action.stockPaymentDate);
      if (payDate == null || payDate >= cutoff) return;
      qty += calculateStockDividendQty(action, transactions, corporateActions).qty;
    });
    return qty;
  }

  function calculateEligibleQty(action, transactions, corporateActions) {
    const a = normalizeAction(action);
    if (Number(a.eligibleQty) > 0 || a.lockedAt) return Math.max(0, Math.floor(Number(a.eligibleQty) || 0));
    return Math.max(0, Math.floor(positionQtyAsOf(transactions, corporateActions, {
      portfolioId: a.portfolioId,
      code: a.code,
      beforeDate: a.exDate,
      ignoreActionId: a.id,
    }))); 
  }

  function calculateCashDividend(action, transactions, corporateActions) {
    const a = normalizeAction(action);
    const eligibleQty = calculateEligibleQty(a, transactions, corporateActions);
    const gross = Math.round(eligibleQty * a.cashDividendPerShare);
    const taxWithheld = Math.min(gross, Math.round(a.taxWithheld || 0));
    const fractionalShareCash = Math.round(a.fractionalShareCash || 0);
    const net = gross - taxWithheld + fractionalShareCash;
    return { eligibleQty, gross, taxWithheld, fractionalShareCash, net };
  }

  function calculateStockDividendQty(action, transactions, corporateActions) {
    const a = normalizeAction(action);
    const eligibleQty = calculateEligibleQty(a, transactions, corporateActions);
    const rawQty = eligibleQty * a.stockDividendRatio;
    const qty = Math.floor(rawQty + 1e-9);
    return { eligibleQty, rawQty, qty, fractionalQty: rawQty - qty };
  }

  function calculateExReferencePrice(action) {
    const a = normalizeAction(action);
    if (!a.prevClose) return null;
    const price = (a.prevClose - a.cashDividendPerShare) / (1 + a.stockDividendRatio);
    return Number.isFinite(price) && price > 0 ? Number(price.toFixed(2)) : null;
  }

  function enrichAction(action, transactions, corporateActions, baseDate = todayISO()) {
    const a = normalizeAction(action);
    const cash = calculateCashDividend(a, transactions, corporateActions);
    const stock = calculateStockDividendQty(a, transactions, corporateActions);
    const exReferencePrice = a.exReferencePrice || calculateExReferencePrice(a) || 0;
    let status = a.status || 'planned';
    if (isOnOrBefore(a.exDate, baseDate)) status = 'locked';
    if ((a.cashPaymentDate && isOnOrBefore(a.cashPaymentDate, baseDate)) || (a.stockPaymentDate && isOnOrBefore(a.stockPaymentDate, baseDate))) status = 'partially_settled';
    const cashSettled = !!(a.cashDividendPerShare > 0 && a.cashPaymentDate && isOnOrBefore(a.cashPaymentDate, baseDate));
    const stockSettled = !!(a.stockDividendRatio > 0 && a.stockPaymentDate && isOnOrBefore(a.stockPaymentDate, baseDate));
    if ((!a.cashDividendPerShare || cashSettled) && (!a.stockDividendRatio || stockSettled)) status = (a.cashDividendPerShare || a.stockDividendRatio) ? 'settled' : status;
    return Object.assign({}, a, {
      eligibleQty: cash.eligibleQty || stock.eligibleQty || a.eligibleQty || 0,
      cashDividendGross: cash.gross,
      cashDividendNet: cash.net,
      stockDividendQtyRaw: stock.rawQty,
      stockDividendQty: stock.qty,
      exReferencePrice,
      status,
      cashSettled,
      stockSettled,
      cashReceivable: a.cashDividendPerShare > 0 && isOnOrBefore(a.exDate, baseDate) && (!a.cashPaymentDate || isAfter(a.cashPaymentDate, baseDate)) ? cash.net : 0,
      stockReceivableQty: a.stockDividendRatio > 0 && isOnOrBefore(a.exDate, baseDate) && (!a.stockPaymentDate || isAfter(a.stockPaymentDate, baseDate)) ? stock.qty : 0,
    });
  }

  function portfolioActions(vm) {
    const pid = (vm && vm.currentPortfolioId) || 'main';
    return (vm && Array.isArray(vm.corporateActions) ? vm.corporateActions : [])
      .filter(a => a && (a.portfolioId || 'main') === pid)
      .map(a => enrichAction(a, vm.transactions || [], vm.corporateActions || []))
      .sort((a, b) => {
        const da = toDateValue(a.exDate || a.cashPaymentDate || a.stockPaymentDate) || 0;
        const db = toDateValue(b.exDate || b.cashPaymentDate || b.stockPaymentDate) || 0;
        if (da !== db) return db - da;
        return String(a.code).localeCompare(String(b.code));
      });
  }

  function settledCashNet(vm) {
    return portfolioActions(vm).reduce((sum, a) => sum + (a.cashSettled ? Number(a.cashDividendNet || 0) : 0), 0);
  }

  function cashReceivable(vm) {
    return portfolioActions(vm).reduce((sum, a) => sum + Number(a.cashReceivable || 0), 0);
  }

  function stockReceivableValue(vm) {
    return portfolioActions(vm).reduce((sum, a) => {
      const qty = Number(a.stockReceivableQty || 0);
      if (!qty) return sum;
      const price = Number((vm.latestPrices || {})[a.code] || a.prevClose || a.exReferencePrice || 0);
      return sum + (qty * price);
    }, 0);
  }

  function stockDividendPositionEffects(vm) {
    return portfolioActions(vm)
      .filter(a => a.stockDividendRatio > 0 && a.stockPaymentDate && isOnOrBefore(a.stockPaymentDate) && Number(a.stockDividendQty || 0) > 0)
      .map(a => ({
        kind: 'stock_dividend',
        id: a.id,
        portfolioId: a.portfolioId,
        code: a.code,
        name: a.name,
        date: a.stockPaymentDate,
        qtyEffect: Number(a.stockDividendQty || 0),
        costEffect: 0,
        category: a.category || null,
        note: `股票股利 ${a.stockDividendPerShareYuan || (a.stockDividendRatio * 10)} 元／股`,
      }));
  }

  function cashLedgerRows(vm) {
    return portfolioActions(vm)
      .filter(a => a.cashDividendPerShare > 0 && a.cashPaymentDate && isOnOrBefore(a.cashPaymentDate) && Number(a.cashDividendNet || 0) !== 0)
      .map(a => ({
        kind: 'dividend',
        id: `dividend_${a.id}`,
        rawId: a.id,
        date: a.cashPaymentDate,
        subType: 'cashDividend',
        label: '股利',
        txType: '現金股利',
        title: `${vm.displayNameOnly ? vm.displayNameOnly(a.code, a.name) : (a.name || a.code)} (${a.code})`,
        note: `現金股利 ${a.cashDividendPerShare} 元／股｜權利股數 ${a.eligibleQty} 股`,
        amount: Number(a.cashDividendNet || 0),
        inAmount: Math.max(0, Number(a.cashDividendNet || 0)),
        outAmount: Math.max(0, -Number(a.cashDividendNet || 0)),
        canDelete: false,
        sortId: Number(String(a.id).replace(/\D/g, '').slice(-10)) || 0,
      }));
  }

  function dividendSummaryByCode(vm, code) {
    const target = text(code);
    const rows = portfolioActions(vm).filter(a => a.code === target);
    const settledCash = rows.reduce((s, a) => s + (a.cashSettled ? Number(a.cashDividendNet || 0) : 0), 0);
    const receivableCash = rows.reduce((s, a) => s + Number(a.cashReceivable || 0), 0);
    const settledStockQty = rows.reduce((s, a) => s + (a.stockSettled ? Number(a.stockDividendQty || 0) : 0), 0);
    const receivableStockQty = rows.reduce((s, a) => s + Number(a.stockReceivableQty || 0), 0);
    return { code: target, rows, settledCash, receivableCash, settledStockQty, receivableStockQty, totalCash: settledCash + receivableCash };
  }

  window.StockDividendService = {
    ACTION_TYPES,
    todayISO,
    normalizeAction,
    positionQtyAsOf,
    calculateEligibleQty,
    calculateCashDividend,
    calculateStockDividendQty,
    calculateExReferencePrice,
    enrichAction,
    portfolioActions,
    settledCashNet,
    cashReceivable,
    stockReceivableValue,
    stockDividendPositionEffects,
    cashLedgerRows,
    dividendSummaryByCode,
  };
})(window);
