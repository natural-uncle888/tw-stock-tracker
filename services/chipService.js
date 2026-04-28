(function(window) {
  'use strict';

  const TWSE_T86_URL = 'https://www.twse.com.tw/rwd/zh/fund/T86';
  const TWSE_MARGIN_URL = 'https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN';
  const TPEX_INSTI_URL = 'https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade';
  const TPEX_MARGIN_URL = 'https://www.tpex.org.tw/www/zh-tw/margin/marginBalance';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function formatDate(date) { return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`; }
  function formatDateSlash(date) { return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }
  function formatDateLabel(dateText) {
    const raw = String(dateText || '').replace(/\D/g, '');
    if (raw.length === 8) return `${raw.slice(0,4)}/${raw.slice(4,6)}/${raw.slice(6,8)}`;
    return String(dateText || '');
  }
  function rocDateSlash(date) { return `${date.getFullYear() - 1911}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }
  function toNumber(value) {
    if (value == null) return 0;
    const text = String(value).replace(/,/g, '').replace(/\s/g, '').replace(/--/g, '').trim();
    if (!text || text === '-') return 0;
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  function toLots(shares) { return Math.round((Number(shares) || 0) / 1000); }
  function safeText(value) { return value == null ? '' : String(value).replace(/<[^>]+>/g, '').trim(); }

  function recentCalendarDates(maxCalendarDays) {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < maxCalendarDays; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const day = d.getDay();
      if (day !== 0 && day !== 6) dates.push(d);
    }
    return dates;
  }

  function pickIndex(fields, patterns) {
    const list = Array.isArray(fields) ? fields.map(safeText) : [];
    for (const pattern of patterns) {
      const idx = list.findIndex((f) => pattern.test(f));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function readCell(row, idx) {
    if (!row || idx < 0) return '';
    return Array.isArray(row) ? row[idx] : row[idx];
  }


  function normalizedFieldName(value) {
    return safeText(value).replace(/\s+/g, '').replace(/　/g, '');
  }

  function findFieldIndex(fields, matcher) {
    const list = Array.isArray(fields) ? fields : [];
    for (let i = 0; i < list.length; i += 1) {
      if (matcher(normalizedFieldName(list[i]), safeText(list[i]), i)) return i;
    }
    return -1;
  }

  function pickStrictIndex(fields, patterns, options) {
    const excludes = options?.excludes || [];
    return findFieldIndex(fields, (normalized) => {
      if (excludes.some((pattern) => pattern.test(normalized))) return false;
      return patterns.some((pattern) => pattern.test(normalized));
    });
  }

  function getDealerNetShares(fields, rawRow) {
    const totalIdx = pickStrictIndex(fields, [
      /^自營商買賣超股數$/,
      /^自營商買賣超$/,
    ], { excludes: [/外資/, /外陸/, /陸資/] });

    const selfIdx = pickStrictIndex(fields, [
      /^自營商買賣超股數\(自行買賣\)$/,
      /^自營商\(自行買賣\)買賣超股數$/,
      /^自營商自行買賣買賣超股數$/,
      /^自營商.*自行買賣.*買賣超/,
    ], { excludes: [/外資/, /外陸/, /陸資/] });

    const hedgeIdx = pickStrictIndex(fields, [
      /^自營商買賣超股數\(避險\)$/,
      /^自營商\(避險\)買賣超股數$/,
      /^自營商避險買賣超股數$/,
      /^自營商.*避險.*買賣超/,
    ], { excludes: [/外資/, /外陸/, /陸資/] });

    if (totalIdx >= 0) return toNumber(readCell(rawRow, totalIdx));
    if (selfIdx >= 0 || hedgeIdx >= 0) {
      return toNumber(readCell(rawRow, selfIdx)) + toNumber(readCell(rawRow, hedgeIdx));
    }

    const fallbackIdx = pickStrictIndex(fields, [
      /^自營商.*買賣超.*股數$/,
      /^自營商.*買賣超/,
    ], { excludes: [/外資/, /外陸/, /陸資/] });
    return toNumber(readCell(rawRow, fallbackIdx));
  }

  function getForeignNetShares(fields, rawRow) {
    const totalIdx = pickStrictIndex(fields, [
      /^外資及陸資買賣超股數$/,
      /^外資及陸資買賣超$/,
      /^外陸資買賣超股數$/,
      /^外陸資買賣超$/,
      /^外資買賣超股數$/,
      /^外資買賣超$/,
    ]);
    if (totalIdx >= 0) return toNumber(readCell(rawRow, totalIdx));

    const excludingDealerIdx = pickStrictIndex(fields, [
      /^外資及陸資買賣超股數\(不含外資自營商\)$/,
      /^外陸資買賣超股數\(不含外資自營商\)$/,
      /^外資買賣超股數\(不含外資自營商\)$/,
      /^外.*不含外資自營商.*買賣超/,
    ]);
    const foreignDealerIdx = pickStrictIndex(fields, [
      /^外資自營商買賣超股數$/,
      /^外資自營商買賣超$/,
    ]);
    if (excludingDealerIdx >= 0 || foreignDealerIdx >= 0) {
      return toNumber(readCell(rawRow, excludingDealerIdx)) + toNumber(readCell(rawRow, foreignDealerIdx));
    }

    const fallbackIdx = pickStrictIndex(fields, [
      /^外資.*買賣超.*股數$/,
      /^外陸資.*買賣超.*股數$/,
      /^外資及陸資.*買賣超/,
    ]);
    return toNumber(readCell(rawRow, fallbackIdx));
  }

  function getProxyUrl(url) {
    const encoded = encodeURIComponent(url);
    if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return `https://corsproxy.io/?${encoded}`;
    }
    return `/.netlify/functions/marketdata?u=${encoded}`;
  }

  async function fetchJsonWithFallback(url) {
    const urls = [url, getProxyUrl(url)];
    let lastError = null;
    for (const target of urls) {
      try {
        const res = await fetch(target, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        try { return JSON.parse(text); }
        catch (_) {
          const stripped = text.replace(/^\uFEFF/, '').trim();
          return JSON.parse(stripped);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('FETCH_FAILED');
  }

  function rowsFromResponse(json) {
    if (!json || typeof json !== 'object') return { fields: [], data: [] };
    const fields = json.fields || json.tables?.[0]?.fields || json.columns || [];
    const data = json.data || json.tables?.[0]?.data || json.aaData || json.rows || [];
    return { fields, data: Array.isArray(data) ? data : [] };
  }

  function normalizeInstitutionalRow(market, dateText, fields, rawRow) {
    const codeIdx = pickIndex(fields, [/證券代號|代號|股票代號/]);
    const nameIdx = pickIndex(fields, [/證券名稱|名稱|股票名稱/]);
    const trustNetIdx = pickStrictIndex(fields, [/^投信買賣超股數$/, /^投信買賣超$/, /^投信.*買賣超/]);
    const totalIdx = pickStrictIndex(fields, [/^三大法人買賣超股數$/, /^三大法人買賣超$/, /^三大法人.*買賣超/, /^合計.*買賣超/]);
    const volumeIdx = pickIndex(fields, [/成交股數|成交量/]);
    const foreignNet = getForeignNetShares(fields, rawRow);
    const trustNet = toNumber(readCell(rawRow, trustNetIdx));
    const dealerNet = getDealerNetShares(fields, rawRow);
    const totalNet = totalIdx >= 0 ? toNumber(readCell(rawRow, totalIdx)) : foreignNet + trustNet + dealerNet;
    const volume = toNumber(readCell(rawRow, volumeIdx));
    return {
      date: String(dateText || ''),
      dateLabel: formatDateLabel(dateText),
      market,
      code: safeText(readCell(rawRow, codeIdx)),
      name: safeText(readCell(rawRow, nameIdx)),
      foreignNetShares: foreignNet,
      trustNetShares: trustNet,
      dealerNetShares: dealerNet,
      totalNetShares: totalNet,
      foreignNetLots: toLots(foreignNet),
      trustNetLots: toLots(trustNet),
      dealerNetLots: toLots(dealerNet),
      totalNetLots: toLots(totalNet),
      volumeShares: volume,
      institutionalVolumeRatio: volume ? totalNet / volume : null,
    };
  }

  async function fetchTwseInstitutionalByDate(code, date) {
    const dateText = formatDate(date);
    const url = `${TWSE_T86_URL}?date=${dateText}&selectType=ALLBUT0999&response=json`;
    const json = await fetchJsonWithFallback(url);
    const { fields, data } = rowsFromResponse(json);
    const row = data.find(r => safeText(readCell(r, pickIndex(fields, [/證券代號|代號|股票代號/]))).replace(/\D/g, '') === String(code));
    return row ? normalizeInstitutionalRow('上市', dateText, fields, row) : null;
  }

  async function fetchTpexInstitutionalByDate(code, date) {
    const dateSlash = formatDateSlash(date);
    const candidates = [
      `${TPEX_INSTI_URL}?date=${encodeURIComponent(dateSlash)}&type=Daily&response=json`,
      `${TPEX_INSTI_URL}?date=${encodeURIComponent(rocDateSlash(date))}&type=Daily&response=json`,
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data } = rowsFromResponse(json);
        const codeIdx = pickIndex(fields, [/證券代號|代號|股票代號/]);
        const row = data.find(r => safeText(readCell(r, codeIdx)).replace(/\D/g, '') === String(code));
        if (row) return normalizeInstitutionalRow('上櫃', dateSlash.replace(/\//g, ''), fields, row);
      } catch (e) { lastError = e; }
    }
    if (lastError) console.warn('[ChipService] TPEx institutional skipped:', lastError);
    return null;
  }

  function normalizeMarginRow(market, dateText, fields, rawRow) {
    const codeIdx = pickIndex(fields, [/股票代號|證券代號|代號/]);
    const nameIdx = pickIndex(fields, [/股票名稱|證券名稱|名稱/]);
    const financeTodayIdx = pickIndex(fields, [/融資.*今日餘額|融資餘額|資餘/]);
    const financeBuyIdx = pickIndex(fields, [/融資.*買進/]);
    const financeSellIdx = pickIndex(fields, [/融資.*賣出/]);
    const shortTodayIdx = pickIndex(fields, [/融券.*今日餘額|融券餘額|券餘/]);
    const shortSellIdx = pickIndex(fields, [/融券.*賣出/]);
    const shortBuyIdx = pickIndex(fields, [/融券.*買進/]);
    return {
      date: String(dateText || ''),
      dateLabel: formatDateLabel(dateText),
      market,
      code: safeText(readCell(rawRow, codeIdx)),
      name: safeText(readCell(rawRow, nameIdx)),
      financeBalance: toNumber(readCell(rawRow, financeTodayIdx)),
      financeBuy: toNumber(readCell(rawRow, financeBuyIdx)),
      financeSell: toNumber(readCell(rawRow, financeSellIdx)),
      shortBalance: toNumber(readCell(rawRow, shortTodayIdx)),
      shortSell: toNumber(readCell(rawRow, shortSellIdx)),
      shortBuy: toNumber(readCell(rawRow, shortBuyIdx)),
    };
  }

  async function fetchTwseMarginByDate(code, date) {
    const dateText = formatDate(date);
    const url = `${TWSE_MARGIN_URL}?date=${dateText}&selectType=MS&response=json`;
    const json = await fetchJsonWithFallback(url);
    const { fields, data } = rowsFromResponse(json);
    const codeIdx = pickIndex(fields, [/股票代號|證券代號|代號/]);
    const row = data.find(r => safeText(readCell(r, codeIdx)).replace(/\D/g, '') === String(code));
    return row ? normalizeMarginRow('上市', dateText, fields, row) : null;
  }

  async function fetchTpexMarginByDate(code, date) {
    const dateSlash = formatDateSlash(date);
    const candidates = [
      `${TPEX_MARGIN_URL}?date=${encodeURIComponent(dateSlash)}&response=json`,
      `${TPEX_MARGIN_URL}?date=${encodeURIComponent(rocDateSlash(date))}&response=json`,
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data } = rowsFromResponse(json);
        const codeIdx = pickIndex(fields, [/股票代號|證券代號|代號/]);
        const row = data.find(r => safeText(readCell(r, codeIdx)).replace(/\D/g, '') === String(code));
        if (row) return normalizeMarginRow('上櫃', dateSlash.replace(/\//g, ''), fields, row);
      } catch (e) { lastError = e; }
    }
    if (lastError) console.warn('[ChipService] TPEx margin skipped:', lastError);
    return null;
  }

  async function fetchInstitutionalDay(code, date, preferredMarket) {
    if (preferredMarket === '上櫃') return await fetchTpexInstitutionalByDate(code, date) || await fetchTwseInstitutionalByDate(code, date);
    if (preferredMarket === '上市') return await fetchTwseInstitutionalByDate(code, date) || await fetchTpexInstitutionalByDate(code, date);
    return await fetchTwseInstitutionalByDate(code, date) || await fetchTpexInstitutionalByDate(code, date);
  }

  async function fetchMarginDay(code, date, preferredMarket) {
    try {
      if (preferredMarket === '上櫃') return await fetchTpexMarginByDate(code, date) || await fetchTwseMarginByDate(code, date);
      if (preferredMarket === '上市') return await fetchTwseMarginByDate(code, date) || await fetchTpexMarginByDate(code, date);
      return await fetchTwseMarginByDate(code, date) || await fetchTpexMarginByDate(code, date);
    } catch (e) {
      console.warn('[ChipService] margin day skipped:', e);
      return null;
    }
  }

  function buildSummary(institutionalRows, marginRows) {
    const rows = Array.isArray(institutionalRows) ? institutionalRows : [];
    const latest = rows[0] || null;
    const sum = (n) => rows.slice(0, n).reduce((s, r) => s + Number(r.totalNetLots || 0), 0);
    const foreignSum = (n) => rows.slice(0, n).reduce((s, r) => s + Number(r.foreignNetLots || 0), 0);
    let streak = 0;
    if (latest) {
      const sign = Number(latest.totalNetLots || 0) >= 0 ? 1 : -1;
      for (const r of rows) {
        const value = Number(r.totalNetLots || 0);
        if (value === 0 || (value > 0 ? 1 : -1) !== sign) break;
        streak += sign;
      }
    }
    const latestMargin = Array.isArray(marginRows) ? marginRows[0] : null;
    let signal = '中性';
    if (latest && sum(5) > 0 && Number(latest.foreignNetLots || 0) > 0 && Number(latest.trustNetLots || 0) >= 0) signal = '偏多';
    if (latest && sum(5) < 0 && Number(latest.foreignNetLots || 0) < 0 && Number(latest.trustNetLots || 0) <= 0) signal = '偏空';
    return {
      latest,
      latestMargin,
      total5: sum(5),
      total10: sum(10),
      total20: sum(20),
      foreign5: foreignSum(5),
      streak,
      signal,
      updatedAt: Date.now(),
    };
  }

  async function fetchStockChipData(code, days) {
    const cleanCode = String(code || '').replace(/\D/g, '').slice(0, 6);
    const targetDays = Math.max(5, Math.min(60, Number(days) || 20));
    if (!/^\d{4,6}$/.test(cleanCode)) throw new Error('請輸入有效股票代號。');
    const candidates = recentCalendarDates(Math.max(45, targetDays * 3));
    const instRows = [];
    const marginRows = [];
    let preferredMarket = '';
    let name = '';

    for (const date of candidates) {
      if (instRows.length >= targetDays) break;
      try {
        const row = await fetchInstitutionalDay(cleanCode, date, preferredMarket);
        if (!row) continue;
        preferredMarket = row.market || preferredMarket;
        name = row.name || name;
        instRows.push(row);
        const margin = await fetchMarginDay(cleanCode, date, preferredMarket);
        if (margin) marginRows.push(margin);
      } catch (e) {
        console.warn('[ChipService] date skipped:', formatDate(date), e);
      }
    }

    if (!instRows.length) throw new Error('查無三大法人資料，可能是股票代號錯誤、今日資料尚未更新，或資料來源暫時無法連線。');
    const payload = {
      version: 1,
      code: cleanCode,
      name,
      market: preferredMarket || instRows[0].market || '',
      days: targetDays,
      fetchedAt: new Date().toISOString(),
      fetchedAtLabel: new Date().toLocaleString('zh-TW', { hour12: false }),
      institutionalRows: instRows,
      marginRows,
      summary: buildSummary(instRows, marginRows),
      source: 'TWSE_TPEX_FREE_DATA',
    };
    return payload;
  }

  function saveChipCache(vm, payload) {
    if (!vm || !payload || !payload.code) return;
    vm.chipCache = vm.chipCache && typeof vm.chipCache === 'object' ? vm.chipCache : { version: 2, stocks: {} };
    vm.chipCache.version = 2;
    vm.chipCache.updatedAt = Date.now();
    vm.chipCache.stocks = vm.chipCache.stocks && typeof vm.chipCache.stocks === 'object' ? vm.chipCache.stocks : {};
    vm.chipCache.stocks[payload.code] = payload;
    if (window.StockStorage && window.StockStorage.saveChipData) window.StockStorage.saveChipData(vm);
  }

  window.StockChipService = {
    fetchStockChipData,
    buildSummary,
    async queryStockChipData() {
      const code = String(this.chipQueryCode || '').replace(/\D/g, '').slice(0, 6);
      this.chipLoading = true;
      this.chipError = '';
      this.chipLastQuery = code;
      try {
        const payload = await fetchStockChipData(code, this.chipQueryDays || 20);
        this.chipData = payload;
        this.chipLastUpdate = payload.fetchedAtLabel;
        this.chipError = '';
        saveChipCache(this, payload);
        this.openInfoModal('查詢完成', `已取得 ${payload.code} ${payload.name || ''} 最近 ${payload.institutionalRows.length} 筆法人籌碼資料。`);
        return payload;
      } catch (e) {
        console.warn('[ChipService] query failed:', e);
        this.chipError = e && e.message ? e.message : '籌碼資料暫時無法取得，請稍後再試。';
        if (window.StockStorage && window.StockStorage.saveChipData) window.StockStorage.saveChipData(this);
        this.openInfoModal('查詢失敗', this.chipError);
        return null;
      } finally {
        this.chipLoading = false;
      }
    },
    loadCachedStockChip(code) {
      const cleanCode = String(code || '').replace(/\D/g, '').slice(0, 6);
      const item = this.chipCache?.stocks?.[cleanCode];
      if (item) {
        this.chipData = item;
        this.chipQueryCode = cleanCode;
        this.chipLastUpdate = item.fetchedAtLabel || this.chipLastUpdate || '';
        this.chipError = '';
        return item;
      }
      return null;
    },
  };
})(window);
