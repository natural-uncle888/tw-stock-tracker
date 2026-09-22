(function(window) {
  'use strict';

  const EPS = 1e-6;
  const text = value => String(value == null ? '' : value).trim();
  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const dateValue = value => {
    if (!value) return null;
    const t = new Date(`${String(value).slice(0, 10)}T12:00:00`).getTime();
    return Number.isFinite(t) ? t : null;
  };

  function analyze(vm) {
    const items = [];
    const seen = new Set();
    const pid = text(vm && vm.currentPortfolioId) || 'main';
    const push = (severity, kind, title, message, extra = {}) => {
      const key = extra.key || `${severity}|${kind}|${title}|${message}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(Object.assign({ severity, kind, title, message, action: extra.action || '', code: extra.code || '' }, extra));
    };

    const transactions = (Array.isArray(vm && vm.transactions) ? vm.transactions : [])
      .filter(tx => tx && (tx.portfolioId || 'main') === pid);
    const codesWithTransactions = new Set(transactions.map(tx => text(tx.code).toUpperCase()).filter(Boolean));

    transactions.forEach(tx => {
      const code = text(tx.code).toUpperCase() || '未填代號';
      const qty = num(tx.qty);
      const price = num(tx.price);
      if (!dateValue(tx.date)) push('error', '交易', `${code} 交易日期異常`, '有一筆交易缺少有效日期，請到歷史帳務檢查。', { action: 'history', code, key: `txdate:${tx.id}` });
      if (!(qty > 0)) push('error', '交易', `${code} 股數異常`, '有一筆交易股數不是正數，可能影響庫存與損益。', { action: 'history', code, key: `txqty:${tx.id}` });
      if (!(price > 0)) push('error', '交易', `${code} 價格異常`, '有一筆交易價格不是正數，可能影響成本與損益。', { action: 'history', code, key: `txprice:${tx.id}` });
      if (Array.isArray(tx.lotAllocations) && tx.lotAllocations.length) {
        const selected = tx.lotAllocations.reduce((s, row) => s + Math.max(0, num(row && row.qty)), 0);
        const positionQty = Math.max(0, num(tx.posQty != null ? tx.posQty : tx.qty));
        if (Math.abs(selected - positionQty) > EPS) {
          push('error', '批次', `${code} 指定批次數量不一致`, `賣出部位 ${positionQty} 股，但指定批次合計 ${selected} 股。`, { action: 'history', code, key: `lotalloc:${tx.id}` });
        }
      }
    });

    // Rebuild position quantity only to detect impossible cash/margin oversells.
    const dividendEvents = window.StockDividendService
      ? window.StockDividendService.portfolioActionsFor(vm, pid).flatMap(a => {
          const out = [];
          if (a && a.stockSettled && a.stockPaymentDate && num(a.stockDividendQty) > 0) out.push({ kind: 'dividend', date: a.stockPaymentDate, sortId: 0, code: a.code, qty: num(a.stockDividendQty) });
          if (a && a.actionType === 'rights_issue' && a.rightsAllotmentDate && dateValue(a.rightsAllotmentDate) <= Date.now() && num(a.rightsSubscribedQty) > 0) out.push({ kind: 'rights_issue', date: a.rightsAllotmentDate, sortId: 0, code: a.code, qty: num(a.rightsSubscribedQty) });
          return out;
        })
      : [];
    const events = [
      ...transactions.map(tx => ({ kind: 'trade', date: tx.date, sortId: num(tx.id), tx })),
      ...dividendEvents
    ].sort((a, b) => {
      const da = dateValue(a.date) || 0;
      const db = dateValue(b.date) || 0;
      if (da !== db) return da - db;
      if (a.kind !== b.kind) return a.kind === 'dividend' ? -1 : 1;
      return num(a.sortId) - num(b.sortId);
    });
    const qtyState = {};
    events.forEach(event => {
      if (event.kind === 'dividend' || event.kind === 'rights_issue') {
        const code = text(event.code).toUpperCase();
        qtyState[code] = num(qtyState[code]) + num(event.qty);
        return;
      }
      const tx = event.tx;
      const code = text(tx && tx.code).toUpperCase();
      if (!code) return;
      const q = Math.max(0, num(tx.posQty != null ? tx.posQty : tx.qty));
      if (q <= 0) return;
      const before = num(qtyState[code]);
      if (tx.type === 'buy') {
        qtyState[code] = before + q;
      } else if (tx.type === 'sell') {
        if (tx.mode !== 'short' && q > Math.max(0, before) + EPS) {
          push('error', '庫存', `${code} 出現非融券超賣`, `${tx.date || ''} 賣出部位超過當時可用庫存，請檢查該筆交易。`, { action: 'history', code, key: `oversell:${tx.id}` });
        }
        qtyState[code] = before - q;
      }
    });

    const holdings = Array.isArray(vm && vm.holdings) ? vm.holdings : [];
    holdings.forEach(h => {
      const code = text(h && h.code).toUpperCase();
      const qty = num(h && h.qty);
      const cost = num(h && h.totalCost);
      if (qty > EPS && cost < -EPS) push('error', '成本', `${code} 多單成本為負值`, '目前是多單持股，但持倉成本小於 0，請檢查歷史交易。', { action: 'inventory', code, key: `negcost:${code}` });
      const price = num((vm.latestPrices || {})[code] || h.currentPrice);
      if (!(price > 0)) push('warning', '行情', `${code} 缺少有效現價`, '目前損益可能使用成本價替代，建議重新更新行情。', { action: 'inventory', code, key: `noprice:${code}` });
      if (qty > EPS && window.StockTradeService && typeof window.StockTradeService.openLongLots === 'function') {
        try {
          const lotQty = window.StockTradeService.openLongLots.call(vm, code, pid).reduce((s, lot) => s + num(lot && lot.remainingQty), 0);
          if (Math.abs(lotQty - qty) > EPS) {
            push('warning', '批次', `${code} 批次股數與庫存不一致`, `目前庫存 ${qty} 股，但可追蹤批次合計 ${Number(lotQty.toFixed(6))} 股。`, { action: 'inventory', code, key: `lotmismatch:${code}` });
          }
        } catch (_) {}
      }
    });

    const actions = Array.isArray(vm && vm.corporateActions) ? vm.corporateActions : [];
    const shareKeys = new Map();
    actions.forEach(raw => {
      if (!raw || !window.StockDividendService) return;
      const a = window.StockDividendService.normalizeAction(raw);
      const key = window.StockDividendService.actionShareKey(a);
      if (a.actionType === 'rights_issue') {
        if (!a.code || !(num(a.rightsIssuePrice) > 0) || !(num(a.rightsSubscribedQty) > 0)) push('warning', '現增', `${a.code || '現金增資'} 資料不完整`, '現金增資需要股票代號、認購價格與實際認購股數。', { action: 'dividend', code: a.code, key: `rightsbase:${a.id}` });
        const pay=dateValue(a.rightsPaymentDate), allot=dateValue(a.rightsAllotmentDate);
        if (!pay || !allot) push('warning','現增',`${a.code || '現金增資'} 日期不完整`,'請補上繳款日與撥股日。',{action:'dividend',code:a.code,key:`rightsdate:${a.id}`});
        if (pay && allot && allot < pay) push('error','現增',`${a.code} 撥股日早於繳款日`,'日期順序不合理，請到除息與增資修正。',{action:'dividend',code:a.code,key:`rightsorder:${a.id}`});
        return;
      }
      if (shareKeys.has(key)) {
        push('warning', '股利', `${a.code || '權息'} 可能有重複公告`, '偵測到相同股票與權息條件的重複資料，建議到權息管理確認。', { action: 'dividend', code: a.code, key: `dupdiv:${key}` });
      } else shareKeys.set(key, true);
      if (!a.code || !a.exDate) push('warning', '股利', '權息公告資料不完整', '有權息紀錄缺少股票代號或除權息日。', { action: 'dividend', code: a.code, key: `divbase:${a.id}` });
      if (!(num(a.cashDividendPerShare) > 0) && !(num(a.stockDividendRatio) > 0)) push('warning', '股利', `${a.code || '權息'} 股利數值為 0`, '這筆權息公告沒有現金股利或股票股利數值。', { action: 'dividend', code: a.code, key: `divzero:${a.id}` });
      const ex = dateValue(a.exDate);
      const cashPay = dateValue(a.cashPaymentDate);
      const stockPay = dateValue(a.stockPaymentDate);
      if (ex && cashPay && cashPay < ex) push('error', '股利', `${a.code} 現金發放日早於除息日`, '日期順序不合理，請到權息管理修正。', { action: 'dividend', code: a.code, key: `cashdate:${a.id}` });
      if (ex && stockPay && stockPay < ex) push('error', '股利', `${a.code} 股票發放日早於除權日`, '日期順序不合理，請到權息管理修正。', { action: 'dividend', code: a.code, key: `stockdate:${a.id}` });
    });

    if (Math.abs(num(vm && vm.dashboardReconciliationGap)) > 2) {
      const gap = Math.abs(num(vm.dashboardReconciliationGap));
      push(gap >= 100 ? 'error' : 'warning', '帳務', '總損益與資產帳務有差額', `目前帳務校驗差額約 ${Math.round(gap).toLocaleString('zh-TW')} 元，建議檢查資金流、股利與交易紀錄。`, { action: 'cash', key: 'reconciliation' });
    }
    if (num(vm && vm.cashBalance) < -EPS) {
      push('warning', '資金', '現金餘額為負數', `目前現金餘額約 -${Math.round(Math.abs(num(vm.cashBalance))).toLocaleString('zh-TW')} 元，請確認是否漏記入金。`, { action: 'cash', key: 'negative-cash' });
    }

    const severityRank = { error: 0, warning: 1, info: 2 };
    items.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || String(a.kind).localeCompare(String(b.kind)));
    const counts = {
      error: items.filter(x => x.severity === 'error').length,
      warning: items.filter(x => x.severity === 'warning').length,
      info: items.filter(x => x.severity === 'info').length,
    };
    return { items, counts, ok: counts.error === 0 && counts.warning === 0, total: items.length };
  }

  window.StockAuditService = { analyze };
})(window);
