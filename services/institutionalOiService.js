(function(window) {
  'use strict';

  const DATA_URL = 'https://www.taifex.com.tw/data_gov/taifex_open_data.asp?data_name=MarketDataOfMajorInstitutionalTradersDetailsOfFuturesContractsBytheDate';
  const PRODUCT_NAME = '臺股期貨';

  function toNumber(value) {
    if (value == null) return 0;
    const text = String(value).replace(/,/g, '').replace(/\s/g, '').trim();
    if (!text || text === '-' || text === '--') return 0;
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }

  function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function parseCsv(text) {
    const lines = String(text || '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] == null ? '' : cells[idx]; });
      return row;
    });
  }

  function normalizeDate(dateText) {
    const raw = String(dateText || '').trim();
    if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
    return raw;
  }

  function normalizeRow(row) {
    return {
      date: String(row['日期'] || '').trim(),
      dateLabel: normalizeDate(row['日期']),
      product: String(row['商品名稱'] || '').trim(),
      identity: String(row['身份別'] || '').trim(),
      tradeLong: toNumber(row['多方交易口數']),
      tradeShort: toNumber(row['空方交易口數']),
      tradeNet: toNumber(row['多空交易口數淨額']),
      oiLong: toNumber(row['多方未平倉口數']),
      oiLongAmountK: toNumber(row['多方未平倉契約金額(千元)']),
      oiShort: toNumber(row['空方未平倉口數']),
      oiShortAmountK: toNumber(row['空方未平倉契約金額(千元)']),
      oiNet: toNumber(row['多空未平倉口數淨額']),
      oiNetAmountK: toNumber(row['多空未平倉契約金額淨額(千元)']),
    };
  }

  function summarize(rows) {
    const foreign = rows.find(r => /外資/.test(r.identity)) || null;
    const dealer = rows.find(r => /自營/.test(r.identity)) || null;
    const trust = rows.find(r => /投信/.test(r.identity)) || null;
    const totalNet = rows.reduce((sum, r) => sum + Number(r.oiNet || 0), 0);
    return { foreign, dealer, trust, totalNet };
  }

  window.StockInstitutionalOiService = {
    sourceUrl: DATA_URL,
    productName: PRODUCT_NAME,

    parseCsv,
    normalizeRow,

    async fetchTaiexFuturesInstitutionalOi() {
      this.institutionalOiLoading = true;
      this.institutionalOiError = '';
      this.institutionalOiAttemptTs = Date.now();
      try {
        const proxyBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
          ? 'https://corsproxy.io/?'
          : '/.netlify/functions/taifex?u=';
        const res = await fetch(proxyBase + encodeURIComponent(DATA_URL), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const allRows = parseCsv(text).map(normalizeRow);
        const rows = allRows.filter(r => r.product === PRODUCT_NAME);
        if (!rows.length) throw new Error('TAIFEX_NO_TX_ROWS');
        const payload = {
          source: 'TAIFEX_OPEN_DATA',
          product: PRODUCT_NAME,
          fetchedAt: new Date().toISOString(),
          date: rows[0].date,
          dateLabel: rows[0].dateLabel,
          rows,
          summary: summarize(rows),
        };

        this.institutionalOiData = payload;
        this.institutionalOiLastUpdate = new Date().toLocaleString('zh-TW', { hour12: false });
        this.institutionalOiError = '';
        if (window.StockStorage && window.StockStorage.saveInstitutionalOiData) {
          window.StockStorage.saveInstitutionalOiData(this);
        }
        this.openInfoModal('更新成功', `已取得 ${payload.dateLabel} 臺股期貨法人未平倉資料。`);
        return payload;
      } catch (e) {
        console.warn('[InstitutionalOi] fetch failed:', e);
        this.institutionalOiError = '期交所資料暫時無法取得，請稍後再試；若有舊資料，畫面會保留上次查詢結果。';
        if (window.StockStorage && window.StockStorage.saveInstitutionalOiData) {
          window.StockStorage.saveInstitutionalOiData(this);
        }
        this.openInfoModal('更新失敗', this.institutionalOiError);
        return null;
      } finally {
        this.institutionalOiLoading = false;
      }
    },
  };
})(window);
