(function(window) {
  'use strict';

  const ACTION_TYPES = ['cash_dividend', 'stock_dividend', 'cash_stock_dividend'];
  const SHARED_PORTFOLIO_ID = 'shared';

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

  function normalizeOverride(value) {
    const o = value && typeof value === 'object' ? value : {};
    return {
      eligibleQty: Math.max(0, Math.floor(num(o.eligibleQty, 0))),
      lockedAt: text(o.lockedAt),
      taxWithheld: Math.max(0, num(o.taxWithheld, 0)),
      fractionalShareCash: Math.max(0, num(o.fractionalShareCash, 0)),
      note: text(o.note),
      updatedAt: text(o.updatedAt)
    };
  }

  function hasOverrideData(value) {
    const o = normalizeOverride(value);
    return o.eligibleQty > 0 || !!o.lockedAt || o.taxWithheld > 0 || o.fractionalShareCash > 0 || !!o.note;
  }

  function mergeOverride(base, addition) {
    const a = normalizeOverride(base);
    const b = normalizeOverride(addition);
    return {
      eligibleQty: b.eligibleQty > 0 || b.lockedAt ? b.eligibleQty : a.eligibleQty,
      lockedAt: b.lockedAt || a.lockedAt,
      taxWithheld: b.taxWithheld > 0 ? b.taxWithheld : a.taxWithheld,
      fractionalShareCash: b.fractionalShareCash > 0 ? b.fractionalShareCash : a.fractionalShareCash,
      note: b.note || a.note,
      updatedAt: b.updatedAt || a.updatedAt
    };
  }

  function normalizePortfolioOverrides(value) {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    Object.keys(value).forEach(pidRaw => {
      const pid = text(pidRaw) || 'main';
      const normalized = normalizeOverride(value[pidRaw]);
      if (hasOverrideData(normalized)) out[pid] = normalized;
    });
    return out;
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
    const portfolioId = text(a.portfolioId) || SHARED_PORTFOLIO_ID;
    const scope = text(a.scope) || (a.shared === false ? 'portfolio' : 'shared');
    const portfolioOverrides = normalizePortfolioOverrides(a.portfolioOverrides);
    return {
      id: a.id || stableId('ca'),
      sharedKey: text(a.sharedKey || a.shareKey),
      shared: a.shared !== false,
      scope,
      portfolioId,
      code: text(a.code).toUpperCase(),
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
      portfolioOverrides,
      createdAt: text(a.createdAt) || new Date().toISOString(),
      updatedAt: text(a.updatedAt) || new Date().toISOString(),
    };
  }

  function actionShareKey(action) {
    const a = normalizeAction(action);
    if (a.sharedKey) return a.sharedKey;
    return [
      a.code,
      a.exDate,
      a.recordDate,
      a.cashPaymentDate,
      a.stockPaymentDate,
      String(a.cashDividendPerShare),
      String(a.stockDividendPerShareYuan),
      String(a.prevClose || 0)
    ].join('|');
  }

  function overrideFromLegacyAction(action) {
    const a = normalizeAction(action);
    return normalizeOverride({
      eligibleQty: a.eligibleQty,
      lockedAt: a.lockedAt,
      taxWithheld: a.taxWithheld,
      fractionalShareCash: a.fractionalShareCash,
      note: '',
      updatedAt: a.updatedAt
    });
  }

  function mergeCommonFields(base, rawAction) {
    const a = normalizeAction(rawAction);
    const fields = ['code', 'name', 'actionType', 'source', 'status', 'announceDate', 'exDate', 'recordDate', 'cashPaymentDate', 'stockPaymentDate', 'note'];
    fields.forEach(field => {
      if (a[field] && (!base[field] || field === 'status')) base[field] = a[field];
    });
    ['cashDividendPerShare', 'stockDividendPerShareYuan', 'stockDividendRatio', 'prevClose', 'exReferencePrice'].forEach(field => {
      if (Number(a[field] || 0) > 0) base[field] = a[field];
    });
    if (!base.createdAt || (a.createdAt && a.createdAt < base.createdAt)) base.createdAt = a.createdAt;
    if (!base.updatedAt || (a.updatedAt && a.updatedAt > base.updatedAt)) base.updatedAt = a.updatedAt;
    base.shared = true;
    base.scope = 'shared';
    base.portfolioId = SHARED_PORTFOLIO_ID;
    base.sharedKey = base.sharedKey || actionShareKey(base);
    return base;
  }

  function normalizeSharedActions(list) {
    const rows = Array.isArray(list) ? list : [];
    const map = new Map();
    const order = [];

    rows.forEach(raw => {
      if (!raw || typeof raw !== 'object') return;
      const a = normalizeAction(raw);
      if (!a.code || !a.exDate) {
        const fallback = normalizeAction(Object.assign({}, raw, { shared: true, scope: 'shared', portfolioId: SHARED_PORTFOLIO_ID }));
        fallback.sharedKey = fallback.sharedKey || actionShareKey(fallback);
        order.push(fallback);
        return;
      }

      const key = actionShareKey(a);
      let base = map.get(key);
      if (!base) {
        base = normalizeAction(Object.assign({}, a, {
          id: a.id || stableId('ca'),
          sharedKey: key,
          shared: true,
          scope: 'shared',
          portfolioId: SHARED_PORTFOLIO_ID,
          eligibleQty: 0,
          lockedAt: '',
          taxWithheld: 0,
          fractionalShareCash: 0,
          portfolioOverrides: {}
        }));
        base.sharedKey = key;
        map.set(key, base);
        order.push(base);
      } else {
        mergeCommonFields(base, a);
      }

      Object.entries(a.portfolioOverrides || {}).forEach(([pidRaw, override]) => {
        const pid = text(pidRaw) || 'main';
        const merged = mergeOverride(base.portfolioOverrides[pid], override);
        if (hasOverrideData(merged)) base.portfolioOverrides[pid] = merged;
      });

      const rawHadModernOverrides = raw.portfolioOverrides && typeof raw.portfolioOverrides === 'object';
      const rawPid = text(raw.portfolioId);
      const legacyPid = rawPid && rawPid !== SHARED_PORTFOLIO_ID ? rawPid : (!rawHadModernOverrides && raw.scope !== 'shared' && raw.shared !== true ? 'main' : '');
      if (legacyPid) {
        const legacyOverride = overrideFromLegacyAction(a);
        if (hasOverrideData(legacyOverride)) {
          base.portfolioOverrides[legacyPid] = mergeOverride(base.portfolioOverrides[legacyPid], legacyOverride);
        }
      }
    });

    return order.map(item => normalizeAction(item));
  }

  function setPortfolioOverride(action, portfolioId, override) {
    const pid = text(portfolioId) || 'main';
    const base = normalizeAction(action);
    const overrides = Object.assign({}, base.portfolioOverrides || {});
    const normalizedOverride = normalizeOverride(Object.assign({}, override, { updatedAt: new Date().toISOString() }));
    if (hasOverrideData(normalizedOverride)) overrides[pid] = normalizedOverride;
    else delete overrides[pid];
    return normalizeAction(Object.assign({}, base, {
      shared: true,
      scope: 'shared',
      portfolioId: SHARED_PORTFOLIO_ID,
      portfolioOverrides: overrides,
      eligibleQty: 0,
      lockedAt: '',
      taxWithheld: 0,
      fractionalShareCash: 0,
      updatedAt: new Date().toISOString()
    }));
  }

  function upsertSharedAction(list, payload, portfolioId) {
    const pid = text(portfolioId) || 'main';
    const rows = normalizeSharedActions(list);
    const incoming = normalizeAction(Object.assign({}, payload, {
      shared: true,
      scope: 'shared',
      portfolioId: SHARED_PORTFOLIO_ID,
      sharedKey: text(payload && (payload.sharedKey || payload.shareKey)) || actionShareKey(payload)
    }));
    const key = incoming.sharedKey || actionShareKey(incoming);
    let idx = rows.findIndex(a => text(a.id) === text(payload && payload.id));
    if (idx < 0) idx = rows.findIndex(a => actionShareKey(a) === key);

    let base = idx >= 0 ? normalizeAction(rows[idx]) : normalizeAction(Object.assign({}, incoming, { id: incoming.id || stableId('ca') }));
    base = mergeCommonFields(base, incoming);
    base.sharedKey = key;
    base = setPortfolioOverride(base, pid, {
      eligibleQty: payload && payload.eligibleQty,
      lockedAt: payload && payload.lockedAt,
      taxWithheld: payload && payload.taxWithheld,
      fractionalShareCash: payload && payload.fractionalShareCash,
      note: payload && payload.portfolioNote
    });

    if (idx >= 0) rows[idx] = base;
    else rows.push(base);
    return normalizeSharedActions(rows);
  }

  function actionForPortfolio(action, portfolioId) {
    const pid = text(portfolioId) || 'main';
    const a = normalizeAction(action);
    const override = normalizeOverride((a.portfolioOverrides || {})[pid]);
    return Object.assign({}, a, {
      sourceId: a.id,
      baseId: a.id,
      portfolioId: pid,
      eligibleQty: override.eligibleQty,
      lockedAt: override.lockedAt,
      taxWithheld: override.taxWithheld,
      fractionalShareCash: override.fractionalShareCash,
      portfolioNote: override.note,
      globalNote: a.note,
      note: override.note || a.note,
      shared: true,
      scope: 'shared'
    });
  }

  function actionsForPortfolio(list, portfolioId) {
    const pid = text(portfolioId) || 'main';
    return normalizeSharedActions(list).map(action => actionForPortfolio(action, pid));
  }

  function removePortfolioOverrides(list, portfolioId) {
    const pid = text(portfolioId) || 'main';
    return normalizeSharedActions(list).map(raw => {
      const a = normalizeAction(raw);
      if (a.portfolioOverrides && a.portfolioOverrides[pid]) {
        const overrides = Object.assign({}, a.portfolioOverrides);
        delete overrides[pid];
        return normalizeAction(Object.assign({}, a, { portfolioOverrides: overrides, updatedAt: new Date().toISOString() }));
      }
      return a;
    });
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
    const code = text(options && options.code).toUpperCase();
    const beforeDate = text(options && options.beforeDate);
    const ignoreActionId = text(options && options.ignoreActionId);
    if (!code || !beforeDate) return 0;
    const cutoff = toDateValue(beforeDate);
    if (cutoff == null) return 0;
    let qty = 0;
    sortChronological(transactions).forEach(tx => {
      if (!tx || text(tx.code).toUpperCase() !== code) return;
      if ((tx.portfolioId || 'main') !== pid) return;
      const txDate = toDateValue(tx.date);
      if (txDate == null || txDate >= cutoff) return; // ex-date trades do not affect entitlement
      const posQty = Math.max(0, num(tx.posQty != null ? tx.posQty : tx.qty, 0));
      if (posQty <= 0) return;
      if (tx.type === 'buy') qty += posQty;
      else if (tx.type === 'sell') qty -= posQty;
    });

    actionsForPortfolio(corporateActions, pid).forEach(action => {
      if (ignoreActionId && text(action.id) === ignoreActionId) return;
      if (action.code !== code) return;
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

  function portfolioActionsFor(vm, portfolioId) {
    const pid = text(portfolioId || (vm && vm.currentPortfolioId)) || 'main';
    return actionsForPortfolio((vm && vm.corporateActions) || [], pid)
      .map(a => enrichAction(a, (vm && vm.transactions) || [], (vm && vm.corporateActions) || []))
      .sort((a, b) => {
        const da = toDateValue(a.exDate || a.cashPaymentDate || a.stockPaymentDate) || 0;
        const db = toDateValue(b.exDate || b.cashPaymentDate || b.stockPaymentDate) || 0;
        if (da !== db) return db - da;
        return String(a.code).localeCompare(String(b.code));
      });
  }

  function portfolioActions(vm) {
    return portfolioActionsFor(vm, vm && vm.currentPortfolioId);
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
        id: `dividend_${a.id}_${a.portfolioId}`,
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
    const target = text(code).toUpperCase();
    const rows = portfolioActions(vm).filter(a => a.code === target);
    const settledCash = rows.reduce((s, a) => s + (a.cashSettled ? Number(a.cashDividendNet || 0) : 0), 0);
    const receivableCash = rows.reduce((s, a) => s + Number(a.cashReceivable || 0), 0);
    const settledStockQty = rows.reduce((s, a) => s + (a.stockSettled ? Number(a.stockDividendQty || 0) : 0), 0);
    const receivableStockQty = rows.reduce((s, a) => s + Number(a.stockReceivableQty || 0), 0);
    return { code: target, rows, settledCash, receivableCash, settledStockQty, receivableStockQty, totalCash: settledCash + receivableCash };
  }

  window.StockDividendService = {
    ACTION_TYPES,
    SHARED_PORTFOLIO_ID,
    todayISO,
    normalizeAction,
    normalizeSharedActions,
    actionForPortfolio,
    actionsForPortfolio,
    setPortfolioOverride,
    upsertSharedAction,
    removePortfolioOverrides,
    actionShareKey,
    positionQtyAsOf,
    calculateEligibleQty,
    calculateCashDividend,
    calculateStockDividendQty,
    calculateExReferencePrice,
    enrichAction,
    portfolioActions,
    portfolioActionsFor,
    settledCashNet,
    cashReceivable,
    stockReceivableValue,
    stockDividendPositionEffects,
    cashLedgerRows,
    dividendSummaryByCode,
  };
})(window);
