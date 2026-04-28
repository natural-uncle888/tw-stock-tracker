(function(window) {
  'use strict';

  const TWSE_NOTICE_URL = 'https://www.twse.com.tw/rwd/zh/announcement/notice';
  const TWSE_PUNISH_URL = 'https://www.twse.com.tw/rwd/zh/announcement/punish';
  const TPEX_ATTENTION_URL = 'https://www.tpex.org.tw/www/zh-tw/announce/market/attention';
  const TPEX_WARNING_URL = 'https://www.tpex.org.tw/www/zh-tw/announce/market/warning';
  const TPEX_DISPOSAL_URL = 'https://www.tpex.org.tw/www/zh-tw/announce/market/disposal';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(date) { return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`; }
  function ymdSlash(date) { return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }
  function rocSlash(date) { return `${date.getFullYear() - 1911}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }
  function addDays(date, delta) { const d = new Date(date); d.setDate(d.getDate() + delta); return d; }
  function safeText(value) { return value == null ? '' : String(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function cleanCode(value) { return String(value || '').replace(/\D/g, '').slice(0, 6); }
  function formatDateLabel(value) {
    const text = safeText(value);
    const raw = text.replace(/\D/g, '');
    if (raw.length === 8) return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
    if (/^\d{2,3}\/\d{1,2}\/\d{1,2}$/.test(text)) {
      const [y, m, d] = text.split('/');
      return `${Number(y) + 1911}/${pad2(m)}/${pad2(d)}`;
    }
    return text;
  }
  function getProxyUrl(url) {
    const encoded = encodeURIComponent(url);
    if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return `https://corsproxy.io/?${encoded}`;
    }
    return `/.netlify/functions/marketdata?u=${encoded}`;
  }
  async function fetchTextWithFallback(url) {
    const urls = [url, getProxyUrl(url)];
    let lastError = null;
    for (const target of urls) {
      try {
        const res = await fetch(target, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (err) { lastError = err; }
    }
    throw lastError || new Error('FETCH_FAILED');
  }
  async function fetchJsonWithFallback(url) {
    const text = await fetchTextWithFallback(url);
    const clean = text.replace(/^\uFEFF/, '').trim();
    try { return JSON.parse(clean); } catch (_) { return { html: clean }; }
  }
  function rowsFromResponse(json) {
    if (!json || typeof json !== 'object') return { fields: [], data: [] };
    const fields = json.fields || json.tables?.[0]?.fields || json.columns || json.titles || [];
    const data = json.data || json.tables?.[0]?.data || json.aaData || json.rows || json.items || [];
    return { fields: Array.isArray(fields) ? fields : [], data: Array.isArray(data) ? data : [] };
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
    if (Array.isArray(row)) return row[idx];
    const keys = Object.keys(row);
    return row[keys[idx]];
  }
  function rowAsText(row) {
    if (!row) return '';
    if (Array.isArray(row)) return row.map(safeText).join(' ');
    return Object.values(row).map(safeText).join(' ');
  }
  function normalizeRecord(source, type, fields, rawRow, code) {
    const codeIdx = pickIndex(fields, [/證券代號|有價證券代號|股票代號|代號|Code/i]);
    const nameIdx = pickIndex(fields, [/證券名稱|有價證券名稱|股票名稱|名稱|Name/i]);
    const dateIdx = pickIndex(fields, [/公告日期|處置日期|日期|Date/i]);
    const startIdx = pickIndex(fields, [/處置.*起|開始|起日|from|Start/i]);
    const endIdx = pickIndex(fields, [/處置.*迄|處置.*止|結束|迄日|to|End/i]);
    const reasonIdx = pickIndex(fields, [/原因|條件|注意交易資訊|處置條件|異常|說明|Reason|Description/i]);
    const measureIdx = pickIndex(fields, [/處置措施|措施|方式|Measure/i]);
    const countIdx = pickIndex(fields, [/累計|次數|count/i]);
    const record = {
      source,
      type,
      code: safeText(readCell(rawRow, codeIdx)) || code,
      name: safeText(readCell(rawRow, nameIdx)),
      date: safeText(readCell(rawRow, dateIdx)),
      dateLabel: formatDateLabel(readCell(rawRow, dateIdx)),
      startDate: safeText(readCell(rawRow, startIdx)),
      startDateLabel: formatDateLabel(readCell(rawRow, startIdx)),
      endDate: safeText(readCell(rawRow, endIdx)),
      endDateLabel: formatDateLabel(readCell(rawRow, endIdx)),
      reason: safeText(readCell(rawRow, reasonIdx)),
      measure: safeText(readCell(rawRow, measureIdx)),
      count: safeText(readCell(rawRow, countIdx)),
      rawText: rowAsText(rawRow),
    };
    if (!record.reason && type === 'attention') record.reason = record.rawText;
    if (!record.measure && type === 'disposition') record.measure = record.rawText;
    return record;
  }
  function extractRecordsFromJson(json, source, type, code) {
    const { fields, data } = rowsFromResponse(json);
    if (!data.length) return [];
    const codeIdx = pickIndex(fields, [/證券代號|有價證券代號|股票代號|代號|Code/i]);
    return data
      .filter(row => {
        const c = cleanCode(readCell(row, codeIdx));
        return c ? c === code : rowAsText(row).includes(code);
      })
      .map(row => normalizeRecord(source, type, fields, row, code));
  }
  function extractRecordsFromHtml(html, source, type, code) {
    const text = safeText(html);
    if (!text || !text.includes(code)) return [];
    // Fallback: keep a compact note if the official page is returned as HTML rather than JSON.
    const idx = text.indexOf(code);
    const snippet = text.slice(Math.max(0, idx - 120), Math.min(text.length, idx + 320));
    return [{ source, type, code, name: '', date: '', dateLabel: '', startDate: '', startDateLabel: '', endDate: '', endDateLabel: '', reason: snippet, measure: snippet, count: '', rawText: snippet }];
  }
  async function queryEndpoint(source, type, urls, code) {
    const results = [];
    for (const url of urls) {
      try {
        const json = await fetchJsonWithFallback(url);
        const rows = json && json.html ? extractRecordsFromHtml(json.html, source, type, code) : extractRecordsFromJson(json, source, type, code);
        if (rows.length) results.push(...rows);
      } catch (err) {
        console.warn('[StockRiskService] endpoint skipped:', url, err);
      }
    }
    return results;
  }
  function uniqueRecords(rows) {
    const seen = new Set();
    return rows.filter((r) => {
      const key = [r.source, r.type, r.code, r.dateLabel, r.startDateLabel, r.endDateLabel, r.reason, r.measure].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function buildUrls(code, lookbackDays) {
    const end = new Date();
    const start = addDays(end, -Math.max(7, Math.min(180, Number(lookbackDays) || 60)));
    const startYmd = ymd(start);
    const endYmd = ymd(end);
    const startSlash = ymdSlash(start);
    const endSlash = ymdSlash(end);
    const startRoc = rocSlash(start);
    const endRoc = rocSlash(end);
    return {
      twseNotice: [
        `${TWSE_NOTICE_URL}?response=json&stockNo=${code}&queryType=CODE&startDate=${startYmd}&endDate=${endYmd}`,
        `${TWSE_NOTICE_URL}?response=json&type=code&stockNo=${code}&startDate=${startYmd}&endDate=${endYmd}`,
        `${TWSE_NOTICE_URL}?response=json&selectType=ALL&startDate=${startYmd}&endDate=${endYmd}`,
      ],
      twsePunish: [
        `${TWSE_PUNISH_URL}?response=json&stockNo=${code}&queryType=CODE&startDate=${startYmd}&endDate=${endYmd}`,
        `${TWSE_PUNISH_URL}?response=json&type=code&stockNo=${code}&startDate=${startYmd}&endDate=${endYmd}`,
        `${TWSE_PUNISH_URL}?response=json&selectType=ALL&startDate=${startYmd}&endDate=${endYmd}`,
      ],
      tpexAttention: [
        `${TPEX_ATTENTION_URL}?response=json&type=code&code=${code}&startDate=${startYmd}&endDate=${endYmd}`,
        `${TPEX_ATTENTION_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startSlash)}&endDate=${encodeURIComponent(endSlash)}`,
        `${TPEX_ATTENTION_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startRoc)}&endDate=${encodeURIComponent(endRoc)}`,
      ],
      tpexWarning: [
        `${TPEX_WARNING_URL}?response=json&type=code&code=${code}&startDate=${startYmd}&endDate=${endYmd}`,
        `${TPEX_WARNING_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startSlash)}&endDate=${encodeURIComponent(endSlash)}`,
        `${TPEX_WARNING_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startRoc)}&endDate=${encodeURIComponent(endRoc)}`,
      ],
      tpexDisposal: [
        `${TPEX_DISPOSAL_URL}?response=json&type=code&code=${code}&startDate=${startYmd}&endDate=${endYmd}`,
        `${TPEX_DISPOSAL_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startSlash)}&endDate=${encodeURIComponent(endSlash)}`,
        `${TPEX_DISPOSAL_URL}?response=json&type=code&code=${code}&startDate=${encodeURIComponent(startRoc)}&endDate=${encodeURIComponent(endRoc)}`,
      ],
    };
  }
  function buildSummary(records) {
    const attention = records.filter(r => r.type === 'attention');
    const warning = records.filter(r => r.type === 'warning');
    const disposition = records.filter(r => r.type === 'disposition');
    let level = 'normal';
    let label = '正常';
    let className = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (attention.length) { level = 'attention'; label = '注意股'; className = 'text-amber-700 bg-amber-50 border-amber-200'; }
    if (warning.length) { level = 'warning'; label = '接近處置'; className = 'text-orange-700 bg-orange-50 border-orange-200'; }
    if (disposition.length) { level = 'disposition'; label = '處置中'; className = 'text-rose-700 bg-rose-50 border-rose-200'; }
    return { level, label, className, attentionCount: attention.length, warningCount: warning.length, dispositionCount: disposition.length };
  }
  async function fetchStockRiskData(code, lookbackDays = 60) {
    const clean = cleanCode(code);
    if (!/^\d{4,6}$/.test(clean)) throw new Error('請輸入有效股票代號。');
    const urls = buildUrls(clean, lookbackDays);
    const batches = await Promise.all([
      queryEndpoint('TWSE', 'attention', urls.twseNotice, clean),
      queryEndpoint('TWSE', 'disposition', urls.twsePunish, clean),
      queryEndpoint('TPEx', 'attention', urls.tpexAttention, clean),
      queryEndpoint('TPEx', 'warning', urls.tpexWarning, clean),
      queryEndpoint('TPEx', 'disposition', urls.tpexDisposal, clean),
    ]);
    const records = uniqueRecords(batches.flat());
    return {
      version: 1,
      code: clean,
      fetchedAt: new Date().toISOString(),
      fetchedAtLabel: new Date().toLocaleString('zh-TW', { hour12: false }),
      lookbackDays: Math.max(7, Math.min(180, Number(lookbackDays) || 60)),
      records,
      summary: buildSummary(records),
      source: 'TWSE_TPEX_FREE_RISK_DATA',
    };
  }
  function saveStockRiskCache(vm, payload) {
    if (!vm || !payload || !payload.code) return;
    vm.stockRiskCache = vm.stockRiskCache && typeof vm.stockRiskCache === 'object' ? vm.stockRiskCache : { version: 1, stocks: {} };
    vm.stockRiskCache.version = 1;
    vm.stockRiskCache.updatedAt = Date.now();
    vm.stockRiskCache.stocks = vm.stockRiskCache.stocks && typeof vm.stockRiskCache.stocks === 'object' ? vm.stockRiskCache.stocks : {};
    vm.stockRiskCache.stocks[payload.code] = payload;
    if (window.StockStorage && window.StockStorage.saveStockRiskData) window.StockStorage.saveStockRiskData(vm);
  }

  window.StockRiskService = {
    fetchStockRiskData,
    buildSummary,
    saveStockRiskCache,
    async queryStockRiskData(codeOverride) {
      const code = cleanCode(codeOverride || this.chipQueryCode || this.stockRiskQueryCode);
      this.stockRiskLoading = true;
      this.stockRiskError = '';
      this.stockRiskLastQuery = code;
      try {
        const payload = await fetchStockRiskData(code, this.stockRiskLookbackDays || 60);
        this.stockRiskData = payload;
        this.stockRiskLastUpdate = payload.fetchedAtLabel;
        this.stockRiskError = '';
        saveStockRiskCache(this, payload);
        return payload;
      } catch (e) {
        console.warn('[StockRiskService] query failed:', e);
        this.stockRiskError = e && e.message ? e.message : '注意 / 處置資料暫時無法取得。';
        if (window.StockStorage && window.StockStorage.saveStockRiskData) window.StockStorage.saveStockRiskData(this);
        return null;
      } finally {
        this.stockRiskLoading = false;
      }
    },
    loadCachedStockRisk(code) {
      const clean = cleanCode(code);
      const item = this.stockRiskCache?.stocks?.[clean];
      if (item) {
        this.stockRiskData = item;
        this.stockRiskLastQuery = clean;
        this.stockRiskLastUpdate = item.fetchedAtLabel || this.stockRiskLastUpdate || '';
        this.stockRiskError = '';
        return item;
      }
      return null;
    },
  };
})(window);
