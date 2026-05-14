(function(window) {
  'use strict';

  const TWSE_T86_URL = 'https://www.twse.com.tw/rwd/zh/fund/T86';
  const TWSE_T86_OPENAPI_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/T86';
  const TWSE_MARGIN_URL = 'https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN';
  const TPEX_INSTI_URL = 'https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade';
  const TPEX_MARGIN_URL = 'https://www.tpex.org.tw/www/zh-tw/margin/marginBalance';
  const TWSE_MARGIN_OPENAPI_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/MI_MARGN';
  const TPEX_MARGIN_OPENAPI_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_margin_balance';
  const TWSE_MI_INDEX_URL = 'https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX';
  const TWSE_DAY_TRADING_URL = 'https://www.twse.com.tw/rwd/zh/dayTrading/TWTB4U';
  const TWSE_SHARES_OPENAPI_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
  const TPEX_DAILY_QUOTES_URL = 'https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes';
  const TPEX_DAY_TRADING_URL = 'https://www.tpex.org.tw/www/zh-tw/dayTrading/daily';
  const TPEX_SHARES_OPENAPI_URL = 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function formatDate(date) { return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`; }
  function formatDateSlash(date) { return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }
  function formatDateLabel(dateText) {
    const raw = String(dateText || '').replace(/\D/g, '');
    if (raw.length === 8) return `${raw.slice(0,4)}/${raw.slice(4,6)}/${raw.slice(6,8)}`;
    return String(dateText || '');
  }
  function rocDateSlash(date) { return `${date.getFullYear() - 1911}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`; }

  function parseDateLike(value) {
    const raw = String(value || '').replace(/\D/g, '');
    if (raw.length === 8) return new Date(Number(raw.slice(0,4)), Number(raw.slice(4,6)) - 1, Number(raw.slice(6,8)));
    if (raw.length === 7) return new Date(Number(raw.slice(0,3)) + 1911, Number(raw.slice(3,5)) - 1, Number(raw.slice(5,7)));
    return null;
  }

  function dateFromChipRow(row) {
    return parseDateLike(row?.date) || parseDateLike(row?.dateLabel) || null;
  }
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
    if (!row || idx == null || idx < 0) return '';
    if (Array.isArray(row)) return row[idx];
    if (typeof row === 'object') {
      if (typeof idx === 'string') return row[idx];
      const keys = Object.keys(row);
      return row[keys[idx]];
    }
    return '';
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

  function isLocalDev() {
    return location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function getProxyUrl(url) {
    const encoded = encodeURIComponent(url);
    if (isLocalDev()) return `https://corsproxy.io/?${encoded}`;
    return `${location.origin}/.netlify/functions/marketdata?u=${encoded}`;
  }

  async function fetchWithTimeout(target, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(target, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJsonWithFallback(url) {
    // 正式站優先走 Netlify Function，避免瀏覽器先直連官方站被 CORS 擋住，造成一鍵查持股看起來沒反應。
    const proxyUrl = getProxyUrl(url);
    const urls = isLocalDev() ? [proxyUrl, url] : [proxyUrl, url];
    let lastError = null;
    for (const target of urls) {
      try {
        const res = await fetchWithTimeout(target, { cache: 'no-store' });
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


  function tableCandidatesFromResponse(json) {
    if (!json) return [];
    if (Array.isArray(json)) {
      const fields = json.length && json[0] && typeof json[0] === 'object' && !Array.isArray(json[0]) ? Object.keys(json[0]) : [];
      return json.length ? [{ fields, data: json }] : [];
    }
    if (typeof json !== 'object') return [];
    const candidates = [];
    const pushCandidate = (fields, data) => {
      let f = Array.isArray(fields) ? fields : [];
      const d = Array.isArray(data) ? data : [];
      if ((!f || !f.length) && d.length && d[0] && typeof d[0] === 'object' && !Array.isArray(d[0])) f = Object.keys(d[0]);
      if (d.length) candidates.push({ fields: f || [], data: d });
    };
    pushCandidate(json.fields || json.columns, json.data || json.aaData || json.rows);
    if (Array.isArray(json.tables)) {
      json.tables.forEach(t => pushCandidate(t?.fields || t?.columns, t?.data || t?.aaData || t?.rows));
    }
    Object.keys(json).forEach((key) => {
      const m = /^data(\d+)$/i.exec(key);
      if (m) pushCandidate(json[`fields${m[1]}`] || json[`columns${m[1]}`], json[key]);
    });
    return candidates;
  }

  function rowsFromResponseByHints(json, stockCode, hintPatterns) {
    const candidates = tableCandidatesFromResponse(json);
    if (!candidates.length) return { fields: [], data: [] };
    const hints = Array.isArray(hintPatterns) ? hintPatterns : [];
    const scored = candidates.map((item) => {
      const row = stockCode ? findAnyRowByStockCode(item.fields, item.data, stockCode) : null;
      const fieldText = (item.fields || []).map(normalizedFieldName).join('|');
      const firstRowText = item.data?.[0] ? (Array.isArray(item.data[0]) ? item.data[0] : Object.keys(item.data[0] || {})).map(safeText).join('|') : '';
      const hintScore = hints.reduce((sum, pattern) => sum + (pattern.test(fieldText) || pattern.test(firstRowText) ? 10 : 0), 0);
      const rowScore = row ? 1000 : 0;
      return { ...item, row, score: rowScore + hintScore + Math.min(item.data?.length || 0, 50) };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    return { fields: best.fields || [], data: best.data || [], row: best.row || null };
  }

  function rowsFromResponse(json, stockCode) {
    if (!json) return { fields: [], data: [] };
    if (Array.isArray(json)) {
      const fields = json.length && json[0] && typeof json[0] === 'object' && !Array.isArray(json[0]) ? Object.keys(json[0]) : [];
      return { fields, data: json };
    }
    if (typeof json !== 'object') return { fields: [], data: [] };

    const candidates = [];
    const pushCandidate = (fields, data) => {
      let f = Array.isArray(fields) ? fields : [];
      const d = Array.isArray(data) ? data : [];
      if ((!f || !f.length) && d.length && d[0] && typeof d[0] === 'object' && !Array.isArray(d[0])) f = Object.keys(d[0]);
      if (d.length) candidates.push({ fields: f || [], data: d });
    };

    pushCandidate(json.fields || json.columns, json.data || json.aaData || json.rows);
    if (Array.isArray(json.tables)) {
      json.tables.forEach(t => pushCandidate(t?.fields || t?.columns, t?.data || t?.aaData || t?.rows));
    }
    // TWSE 有些 RWD API 會用 fields9/data9、fields8/data8 這類命名，不一定放在 tables[0]。
    Object.keys(json).forEach((key) => {
      const m = /^data(\d+)$/i.exec(key);
      if (m) pushCandidate(json[`fields${m[1]}`] || json[`columns${m[1]}`], json[key]);
    });

    if (stockCode) {
      for (const item of candidates) {
        if (findAnyRowByStockCode(item.fields, item.data, stockCode)) return item;
      }
    }
    return candidates.sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0] || { fields: [], data: [] };
  }

  function findRowByStockCode(fields, data, code) {
    const target = String(code || '').replace(/\D/g, '');
    if (!target || !Array.isArray(data)) return null;
    const codeIdx = pickIndex(fields, [/股票代號|證券代號|證券代碼|證券代號及名稱|代號|Code|code/]);
    const looksLikeCode = (value) => {
      const raw = safeText(value);
      const compact = raw.replace(/\s/g, '');
      const digits = compact.replace(/\D/g, '');
      return digits === target || compact === target || compact.startsWith(target);
    };
    if (codeIdx >= 0) {
      const row = data.find((row) => looksLikeCode(readCell(row, codeIdx)));
      if (row) return row;
    }
    // OpenAPI 或部分 RWD 表格有時欄位名稱不一致，直接掃每列所有儲存格避免漏掉。
    return data.find((row) => {
      if (Array.isArray(row)) return row.some(looksLikeCode);
      if (row && typeof row === 'object') return Object.values(row).some(looksLikeCode);
      return looksLikeCode(row);
    }) || null;
  }


  function normalizeNumberLike(value) { return toNumber(value); }

  function findAnyRowByStockCode(fields, data, code) {
    const row = findRowByStockCode(fields, data, code);
    if (row) return row;
    const target = String(code || '').replace(/\D/g, '');
    return (Array.isArray(data) ? data : []).find((item) => {
      if (!item || typeof item !== 'object') return false;
      return Object.values(item).some(v => String(v || '').replace(/\D/g, '') === target);
    }) || null;
  }

  function readByPatterns(fields, row, patterns, options) {
    const idx = pickStrictIndex(fields, patterns, options || {});
    return idx >= 0 ? readCell(row, idx) : '';
  }

  function parseSharesOutstandingFromRow(fields, row) {
    const value = readByPatterns(fields, row, [
      /已發行普通股數|發行股數|普通股股本|實收資本額|流通股數|Shares/i
    ]);
    const n = normalizeNumberLike(value);
    return n > 0 ? n : 0;
  }

  function normalizeOverviewRow(market, dateText, fields, row) {
    if (!row) return null;
    const dateIdx = pickIndex(fields, [/資料日期|日期|Date|date/]);
    const volumeRaw = readByPatterns(fields, row, [
      /成交股數|成交量|成交張數|Volume/i
    ]);
    let volumeShares = normalizeNumberLike(volumeRaw);
    // 有些資料源直接以張為單位，欄位名稱會標示張數，統一轉成股數方便比率計算。
    const volumeField = fields[pickStrictIndex(fields, [/成交張數|成交量\(張\)|成交張數\(張\)/])] || '';
    if (/張/.test(String(volumeField)) && volumeShares > 0) volumeShares *= 1000;
    const turnoverRaw = readByPatterns(fields, row, [/週轉率|周轉率\(%\)|Turnover/i]);
    let turnoverRate = normalizeNumberLike(turnoverRaw);
    if (turnoverRate > 1) turnoverRate = turnoverRate / 100;
    return {
      market,
      date: String(safeText(readCell(row, dateIdx)) || dateText || ''),
      dateLabel: formatDateLabel(safeText(readCell(row, dateIdx)) || dateText),
      volumeShares,
      volumeLots: toLots(volumeShares),
      turnoverRate: turnoverRate > 0 ? turnoverRate : null,
    };
  }

  function normalizeDayTradeRow(market, dateText, fields, row) {
    if (!row) return null;
    const dateIdx = pickIndex(fields, [/資料日期|日期|Date|date/]);
    const volumeRaw = readByPatterns(fields, row, [
      /當日沖銷交易成交股數|當沖成交股數|現股當沖成交股數|當日沖銷.*股數|Day.*Trade.*Volume/i,
      /當沖成交量|當沖張數/
    ]);
    let dayTradeShares = normalizeNumberLike(volumeRaw);
    const field = fields[pickStrictIndex(fields, [/當沖張數|當沖成交量\(張\)|當日沖銷.*張數/])] || '';
    if (/張/.test(String(field)) && dayTradeShares > 0) dayTradeShares *= 1000;
    return {
      market,
      date: String(safeText(readCell(row, dateIdx)) || dateText || ''),
      dateLabel: formatDateLabel(safeText(readCell(row, dateIdx)) || dateText),
      dayTradeShares,
      dayTradeLots: toLots(dayTradeShares),
    };
  }

  async function fetchTwseOverviewByDate(code, date) {
    const dateText = formatDate(date);
    const urls = [
      `${TWSE_MI_INDEX_URL}?response=json&date=${dateText}&type=ALLBUT0999`,
      `${TWSE_MI_INDEX_URL}?response=json&date=${dateText}&type=ALL`,
    ];
    for (const url of urls) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data } = rowsFromResponse(json, code);
        const row = findAnyRowByStockCode(fields, data, code);
        const overview = normalizeOverviewRow('上市', dateText, fields, row);
        if (overview && overview.volumeShares) return overview;
      } catch (e) { console.warn('[ChipService] TWSE overview skipped:', e); }
    }
    return null;
  }

  async function fetchTpexOverviewByDate(code, date) {
    const dateSlash = formatDateSlash(date);
    const urls = [
      `${TPEX_DAILY_QUOTES_URL}?date=${encodeURIComponent(dateSlash)}&response=json`,
      `${TPEX_DAILY_QUOTES_URL}?date=${encodeURIComponent(rocDateSlash(date))}&response=json`,
    ];
    for (const url of urls) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data } = rowsFromResponse(json, code);
        const row = findAnyRowByStockCode(fields, data, code);
        const overview = normalizeOverviewRow('上櫃', dateSlash.replace(/\//g, ''), fields, row);
        if (overview && overview.volumeShares) return overview;
      } catch (e) { console.warn('[ChipService] TPEx overview skipped:', e); }
    }
    return null;
  }

  async function fetchDayTradeByDate(code, date, preferredMarket) {
    const dateText = formatDate(date);
    const dateSlash = formatDateSlash(date);
    const candidates = [];
    if (preferredMarket !== '上櫃') candidates.push({ market: '上市', url: `${TWSE_DAY_TRADING_URL}?response=json&date=${dateText}&selectType=All` });
    if (preferredMarket !== '上市') {
      candidates.push({ market: '上櫃', url: `${TPEX_DAY_TRADING_URL}?date=${encodeURIComponent(dateSlash)}&response=json` });
      candidates.push({ market: '上櫃', url: `${TPEX_DAY_TRADING_URL}?date=${encodeURIComponent(rocDateSlash(date))}&response=json` });
    }
    for (const item of candidates) {
      try {
        const json = await fetchJsonWithFallback(item.url);
        const { fields, data } = rowsFromResponse(json, code);
        const row = findAnyRowByStockCode(fields, data, code);
        const day = normalizeDayTradeRow(item.market, item.market === '上市' ? dateText : dateSlash.replace(/\//g, ''), fields, row);
        if (day && day.dayTradeShares) return day;
      } catch (e) { console.warn('[ChipService] day trade skipped:', e); }
    }
    return null;
  }

  async function fetchSharesOutstanding(code, preferredMarket) {
    const candidates = [];
    if (preferredMarket !== '上櫃') candidates.push({ market: '上市', url: TWSE_SHARES_OPENAPI_URL });
    if (preferredMarket !== '上市') candidates.push({ market: '上櫃', url: TPEX_SHARES_OPENAPI_URL });
    for (const item of candidates) {
      try {
        const json = await fetchJsonWithFallback(item.url);
        const { fields, data } = rowsFromResponse(json, code);
        const row = findAnyRowByStockCode(fields, data, code);
        const shares = parseSharesOutstandingFromRow(fields, row);
        if (shares) return { market: item.market, sharesOutstanding: shares };
      } catch (e) { console.warn('[ChipService] shares outstanding skipped:', e); }
    }
    return null;
  }

  async function fetchChipOverview(code, latestDate, preferredMarket, latestInstitutional, marginRows) {
    const date = latestDate instanceof Date ? latestDate : new Date();
    let overview = null;
    try {
      if (preferredMarket === '上櫃') overview = await fetchTpexOverviewByDate(code, date) || await fetchTwseOverviewByDate(code, date);
      else if (preferredMarket === '上市') overview = await fetchTwseOverviewByDate(code, date) || await fetchTpexOverviewByDate(code, date);
      else overview = await fetchTwseOverviewByDate(code, date) || await fetchTpexOverviewByDate(code, date);
    } catch (_) {}
    const dayTrade = await fetchDayTradeByDate(code, date, preferredMarket || overview?.market || '');
    const sharesInfo = await fetchSharesOutstanding(code, preferredMarket || overview?.market || '');
    const latestMargin = Array.isArray(marginRows) ? marginRows[0] : null;
    const prevMargin = Array.isArray(marginRows) ? marginRows[1] : null;
    const volumeShares = Number(overview?.volumeShares || latestInstitutional?.volumeShares || 0);
    const dayTradeShares = Number(dayTrade?.dayTradeShares || 0);
    const sharesOutstanding = Number(sharesInfo?.sharesOutstanding || 0);
    const financeBalance = Number(latestMargin?.financeBalance || 0);
    const shortBalance = Number(latestMargin?.shortBalance || 0);
    const financeDiff = latestMargin && prevMargin ? financeBalance - Number(prevMargin.financeBalance || 0) : (latestMargin ? Number(latestMargin.financeBuy || 0) - Number(latestMargin.financeSell || 0) : null);
    const shortDiff = latestMargin && prevMargin ? shortBalance - Number(prevMargin.shortBalance || 0) : (latestMargin ? Number(latestMargin.shortSell || 0) - Number(latestMargin.shortBuy || 0) : null);
    return {
      version: 1,
      dateLabel: latestInstitutional?.dateLabel || overview?.dateLabel || dayTrade?.dateLabel || '',
      market: preferredMarket || overview?.market || latestInstitutional?.market || '',
      volumeShares,
      volumeLots: toLots(volumeShares),
      foreignNetLots: Number(latestInstitutional?.foreignNetLots || 0),
      trustNetLots: Number(latestInstitutional?.trustNetLots || 0),
      dealerNetLots: Number(latestInstitutional?.dealerNetLots || 0),
      totalNetLots: Number(latestInstitutional?.totalNetLots || 0),
      financeBalance,
      shortBalance,
      financeDiff: Number.isFinite(financeDiff) ? financeDiff : null,
      shortDiff: Number.isFinite(shortDiff) ? shortDiff : null,
      shortMarginRatio: financeBalance > 0 ? (shortBalance / financeBalance) : null,
      dayTradeShares,
      dayTradeLots: toLots(dayTradeShares),
      dayTradeRatio: volumeShares > 0 && dayTradeShares > 0 ? (dayTradeShares / volumeShares) : null,
      sharesOutstanding,
      turnoverRate: overview?.turnoverRate != null ? overview.turnoverRate : (volumeShares > 0 && sharesOutstanding > 0 ? (volumeShares / sharesOutstanding) : null),
      sources: {
        volume: overview ? 'TWSE_TPEX_DAILY' : (latestInstitutional?.volumeShares ? 'INSTITUTIONAL_ROW' : ''),
        dayTrade: dayTrade ? 'TWSE_TPEX_DAY_TRADING' : '',
        sharesOutstanding: sharesInfo ? 'MOPS_OPENAPI' : '',
      },
    };
  }

  function normalizeInstitutionalRow(market, dateText, fields, rawRow) {
    const codeIdx = pickIndex(fields, [/證券代號|代號|股票代號|Code|code/]);
    const nameIdx = pickIndex(fields, [/證券名稱|名稱|股票名稱|Name|name/]);
    const dateIdx = pickIndex(fields, [/資料日期|日期|Date|date/]);
    const trustNetIdx = pickStrictIndex(fields, [/^投信買賣超股數$/, /^投信買賣超$/, /^投信.*買賣超/]);
    const totalIdx = pickStrictIndex(fields, [/^三大法人買賣超股數$/, /^三大法人買賣超$/, /^三大法人.*買賣超/, /^合計.*買賣超/]);
    const volumeIdx = pickIndex(fields, [/成交股數|成交量/]);
    const foreignNet = getForeignNetShares(fields, rawRow);
    const trustNet = toNumber(readCell(rawRow, trustNetIdx));
    const dealerNet = getDealerNetShares(fields, rawRow);
    const totalNet = totalIdx >= 0 ? toNumber(readCell(rawRow, totalIdx)) : foreignNet + trustNet + dealerNet;
    const volume = toNumber(readCell(rawRow, volumeIdx));
    return {
      date: String(safeText(readCell(rawRow, dateIdx)) || dateText || ''),
      dateLabel: formatDateLabel(safeText(readCell(rawRow, dateIdx)) || dateText),
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
    const urls = [
      `${TWSE_T86_URL}?date=${dateText}&selectType=ALLBUT0999&response=json`,
      `${TWSE_T86_URL}?date=${dateText}&selectType=ALL&response=json`,
      TWSE_T86_OPENAPI_URL,
    ];
    let lastError = null;
    for (const url of urls) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data } = rowsFromResponse(json, code);
        const row = findRowByStockCode(fields, data, code);
        if (row) return normalizeInstitutionalRow('上市', dateText, fields, row);
      } catch (e) { lastError = e; }
    }
    if (lastError) console.warn('[ChipService] TWSE institutional skipped:', lastError);
    return null;
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
        const { fields, data } = rowsFromResponse(json, code);
        const row = findRowByStockCode(fields, data, code);
        if (row) return normalizeInstitutionalRow('上櫃', dateSlash.replace(/\//g, ''), fields, row);
      } catch (e) { lastError = e; }
    }
    if (lastError) console.warn('[ChipService] TPEx institutional skipped:', lastError);
    return null;
  }

  function readFirstPositive(fields, row, patterns, options) {
    for (const pattern of patterns) {
      const idx = pickStrictIndex(fields, [pattern], options || {});
      const n = idx >= 0 ? toNumber(readCell(row, idx)) : 0;
      if (n > 0 || (idx >= 0 && safeText(readCell(row, idx)) !== '')) return n;
    }
    return 0;
  }

  function readNumberByObjectKey(row, patterns, options) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return 0;
    const excludes = options?.excludes || [];
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      const key = keys.find((k) => {
        const normalized = normalizedFieldName(k);
        if (excludes.some((ex) => ex.test(normalized))) return false;
        return pattern.test(normalized) || pattern.test(k);
      });
      if (key != null) {
        const n = toNumber(row[key]);
        if (n > 0 || safeText(row[key]) !== '') return n;
      }
    }
    return 0;
  }

  function readRepeatedMarginLayout(fields, rawRow) {
    const names = Array.isArray(fields) ? fields.map(normalizedFieldName) : [];
    const indexes = (pattern, excludes) => names
      .map((f, i) => (pattern.test(f) && !(excludes || []).some(ex => ex.test(f))) ? i : -1)
      .filter(i => i >= 0);
    const readN = (idx) => idx == null || idx < 0 ? 0 : toNumber(readCell(rawRow, idx));

    const balanceIdxs = indexes(/今日餘額|本日餘額|餘額/, [/前日|昨日|限額|資券互抵/]);
    const buyIdxs = indexes(/買進/, []);
    const sellIdxs = indexes(/賣出/, []);

    // TWSE / TPEx 融資融券表常見欄位順序：
    // 代號、名稱、融資買進、融資賣出、融資償還、融資前日餘額、融資今日餘額、融資限額、
    // 融券買進、融券賣出、融券償還、融券前日餘額、融券今日餘額、融券限額。
    return {
      financeBuy: readN(buyIdxs[0]),
      financeSell: readN(sellIdxs[0]),
      financeBalance: readN(balanceIdxs[0]),
      shortBuy: readN(buyIdxs[1]),
      shortSell: readN(sellIdxs[1]),
      shortBalance: readN(balanceIdxs[1]),
    };
  }

  function normalizeMarginRow(market, dateText, fields, rawRow) {
    const codeIdx = pickIndex(fields, [/股票代號|證券代號|證券代碼|證券代號及名稱|代號|Code|code/]);
    const nameIdx = pickIndex(fields, [/股票名稱|證券名稱|名稱|Name|name/]);
    const dateIdx = pickIndex(fields, [/資料日期|日期|Date|date/]);

    const fieldNames = Array.isArray(fields) ? fields.map(normalizedFieldName) : [];
    const readN = (idx) => toNumber(readCell(rawRow, idx));

    const financeBalancePatterns = [
      /融資.*今日餘額/, /融資.*本日餘額/, /融資.*餘額/, /融資餘額/, /資餘額/, /資餘/, /MarginPurchaseTodayBalance/i, /MarginPurchaseBalance/i, /MarginPurchaseLimit/i
    ];
    const financeBuyPatterns = [
      /融資.*買進/, /融資買進/, /資買/, /MarginPurchaseBuy/i, /MarginPurchasePurchase/i
    ];
    const financeSellPatterns = [
      /融資.*賣出/, /融資賣出/, /資賣/, /MarginPurchaseSell/i, /MarginPurchaseSale/i
    ];
    const shortBalancePatterns = [
      /融券.*今日餘額/, /融券.*本日餘額/, /融券.*餘額/, /融券餘額/, /券餘額/, /券餘/, /ShortSaleTodayBalance/i, /ShortSaleBalance/i
    ];
    const shortSellPatterns = [
      /融券.*賣出/, /融券賣出/, /券賣/, /ShortSaleSell/i, /ShortSaleSale/i
    ];
    const shortBuyPatterns = [
      /融券.*買進/, /融券買進/, /券買/, /ShortSaleBuy/i, /ShortSalePurchase/i
    ];

    let financeBalance = readFirstPositive(fields, rawRow, financeBalancePatterns, { excludes: [/融券/, /券餘/, /限額/] })
      || readNumberByObjectKey(rawRow, financeBalancePatterns, { excludes: [/融券/, /券餘/, /限額/] });
    let financeBuy = readFirstPositive(fields, rawRow, financeBuyPatterns, { excludes: [/融券/] })
      || readNumberByObjectKey(rawRow, financeBuyPatterns, { excludes: [/融券/] });
    let financeSell = readFirstPositive(fields, rawRow, financeSellPatterns, { excludes: [/融券/] })
      || readNumberByObjectKey(rawRow, financeSellPatterns, { excludes: [/融券/] });
    let shortBalance = readFirstPositive(fields, rawRow, shortBalancePatterns, { excludes: [/融資/, /資餘/, /限額/] })
      || readNumberByObjectKey(rawRow, shortBalancePatterns, { excludes: [/融資/, /資餘/, /限額/] });
    let shortSell = readFirstPositive(fields, rawRow, shortSellPatterns, { excludes: [/融資/] })
      || readNumberByObjectKey(rawRow, shortSellPatterns, { excludes: [/融資/] });
    let shortBuy = readFirstPositive(fields, rawRow, shortBuyPatterns, { excludes: [/融資/] })
      || readNumberByObjectKey(rawRow, shortBuyPatterns, { excludes: [/融資/] });

    const repeatedLayout = readRepeatedMarginLayout(fields, rawRow);
    financeBalance = financeBalance || repeatedLayout.financeBalance;
    financeBuy = financeBuy || repeatedLayout.financeBuy;
    financeSell = financeSell || repeatedLayout.financeSell;
    shortBalance = shortBalance || repeatedLayout.shortBalance;
    shortSell = shortSell || repeatedLayout.shortSell;
    shortBuy = shortBuy || repeatedLayout.shortBuy;

    // 上櫃 marginBalance 有時欄名會被拆成兩段群組，實際欄位只剩「買進 / 賣出 / 今日餘額」重複出現。
    // 這裡依官方常見欄位順序補抓：融資區在前，融券區在後。
    if ((!financeBalance && !shortBalance) || fieldNames.filter(f => /今日餘額|餘額/.test(f)).length >= 2) {
      const balanceIdxs = fieldNames.map((f, i) => (/今日餘額|餘額/.test(f) && !/前日|限額/.test(f)) ? i : -1).filter(i => i >= 0);
      if (!financeBalance && balanceIdxs[0] != null) financeBalance = readN(balanceIdxs[0]);
      if (!shortBalance && balanceIdxs[1] != null) shortBalance = readN(balanceIdxs[1]);
    }
    if ((!financeBuy && !shortBuy) || fieldNames.filter(f => /買進/.test(f)).length >= 2) {
      const buyIdxs = fieldNames.map((f, i) => /買進/.test(f) ? i : -1).filter(i => i >= 0);
      if (!financeBuy && buyIdxs[0] != null) financeBuy = readN(buyIdxs[0]);
      if (!shortBuy && buyIdxs[1] != null) shortBuy = readN(buyIdxs[1]);
    }
    if ((!financeSell && !shortSell) || fieldNames.filter(f => /賣出/.test(f)).length >= 2) {
      const sellIdxs = fieldNames.map((f, i) => /賣出/.test(f) ? i : -1).filter(i => i >= 0);
      if (!financeSell && sellIdxs[0] != null) financeSell = readN(sellIdxs[0]);
      if (!shortSell && sellIdxs[1] != null) shortSell = readN(sellIdxs[1]);
    }

    const sourceDate = safeText(readCell(rawRow, dateIdx)) || dateText;
    return {
      date: String(sourceDate || ''),
      dateLabel: formatDateLabel(sourceDate),
      market,
      code: safeText(readCell(rawRow, codeIdx)) || String(rawRow?.['股票代號'] || rawRow?.['證券代號'] || rawRow?.['代號'] || ''),
      name: safeText(readCell(rawRow, nameIdx)) || String(rawRow?.['股票名稱'] || rawRow?.['證券名稱'] || rawRow?.['名稱'] || ''),
      financeBalance,
      financeBuy,
      financeSell,
      shortBalance,
      shortSell,
      shortBuy,
    };
  }

  async function fetchTwseMarginByDate(code, date) {
    const dateText = formatDate(date);
    const urls = [
      `${TWSE_MARGIN_URL}?date=${dateText}&selectType=ALL&response=json`,
      `${TWSE_MARGIN_URL}?date=${dateText}&selectType=MS&response=json`,
      TWSE_MARGIN_OPENAPI_URL,
    ];
    let lastError = null;
    for (const url of urls) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data, row: hintedRow } = rowsFromResponseByHints(json, code, [/融資|融券|Margin|Short/i, /今日餘額|餘額|買進|賣出/i]);
        const row = hintedRow || findRowByStockCode(fields, data, code);
        if (row) return normalizeMarginRow('上市', dateText, fields, row);
      } catch (e) { lastError = e; }
    }
    if (lastError) console.warn('[ChipService] TWSE margin skipped:', lastError);
    return null;
  }

  async function fetchTpexMarginByDate(code, date) {
    const dateSlash = formatDateSlash(date);
    const candidates = [
      `${TPEX_MARGIN_URL}?date=${encodeURIComponent(dateSlash)}&response=json`,
      `${TPEX_MARGIN_URL}?date=${encodeURIComponent(rocDateSlash(date))}&response=json`,
      TPEX_MARGIN_OPENAPI_URL,
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const json = await fetchJsonWithFallback(url);
        const { fields, data, row: hintedRow } = rowsFromResponseByHints(json, code, [/融資|融券|Margin|Short/i, /今日餘額|餘額|買進|賣出/i]);
        const row = hintedRow || findRowByStockCode(fields, data, code);
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

  async function fetchStockChipData(code, days, options = {}) {
    const cleanCode = String(code || '').replace(/\D/g, '').slice(0, 6);
    const targetDays = Math.max(5, Math.min(60, Number(days) || 10));
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
        if (!instRows.some(r => r.market === row.market && r.dateLabel === row.dateLabel)) instRows.push(row);
        const margin = await fetchMarginDay(cleanCode, date, preferredMarket);
        if (margin && !marginRows.some(r => r.market === margin.market && r.dateLabel === margin.dateLabel)) marginRows.push(margin);
      } catch (e) {
        console.warn('[ChipService] date skipped:', formatDate(date), e);
      }
    }

    // 保險補抓：有些日期法人資料抓得到、融資融券資料源卻晚更新或表格格式不同。
    // 如果主要流程沒有拿到融資融券，改用最近交易日獨立再掃一次，避免券資比整張卡片空白。
    if (!marginRows.length) {
      for (const date of candidates.slice(0, Math.max(12, Math.min(30, targetDays)))) {
        try {
          const margin = await fetchMarginDay(cleanCode, date, preferredMarket || instRows[0]?.market || '');
          if (margin && !marginRows.some(r => r.market === margin.market && r.dateLabel === margin.dateLabel)) marginRows.push(margin);
          if (marginRows.length >= 2) break;
        } catch (e) {
          console.warn('[ChipService] margin fallback skipped:', formatDate(date), e);
        }
      }
    }

    // 單檔查詢時，沒有法人資料仍維持原本提示；
    // 一鍵更新分析時改為「允許部分資料」，避免某一個官方來源暫時失敗就讓整檔持股顯示失敗。
    if (!instRows.length && !options.allowPartial) throw new Error('查無法人籌碼資料，可能是股票代號錯誤、資料尚未更新，或 TWSE / TPEx / Proxy 暫時無法連線。');

    const baseRow = instRows[0] || marginRows[0] || null;
    const overviewDate = dateFromChipRow(baseRow) || candidates[0];
    let overview = {};
    try {
      overview = await fetchChipOverview(cleanCode, overviewDate, preferredMarket || baseRow?.market || '', instRows[0] || {}, marginRows);
    } catch (e) {
      console.warn('[ChipService] overview skipped:', cleanCode, e);
      overview = {};
    }

    const hasAnyData = !!(instRows.length || marginRows.length || (overview && Object.keys(overview).length));
    if (!hasAnyData && !options.allowPartial) throw new Error('查無籌碼資料，可能是股票代號錯誤、資料尚未更新，或 Proxy 暫時無法連線。');

    const payload = {
      version: 1,
      code: cleanCode,
      name,
      market: preferredMarket || baseRow?.market || '',
      days: targetDays,
      fetchedAt: new Date().toISOString(),
      fetchedAtLabel: new Date().toLocaleString('zh-TW', { hour12: false }),
      institutionalRows: instRows,
      marginRows,
      summary: buildSummary(instRows, marginRows),
      overview,
      partial: !instRows.length,
      partialReason: !instRows.length ? '法人籌碼來源暫時沒有資料，已先保留融資融券／成交量等可取得資料。' : '',
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
        const payload = await fetchStockChipData(code, this.chipQueryDays || 10);
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
    
    async queryAllHoldingChipData() {
      const holdings = Array.isArray(this.holdings) ? this.holdings : [];
      const codes = [...new Set(holdings.map(h => String(h?.code || '').replace(/\D/g, '').slice(0, 6)).filter(Boolean))];
      if (!codes.length) {
        if (typeof this.openInfoModal === 'function') this.openInfoModal('沒有持股', '目前庫存沒有可查詢的股票。');
        return null;
      }

      this.chipBatchLoading = true;
      this.chipBatchDone = 0;
      this.chipBatchTotal = codes.length;
      this.chipBatchMessage = `準備查詢 ${codes.length} 檔持股籌碼…`;
      this.chipError = '';

      const originalCode = String(this.chipQueryCode || '').replace(/\D/g, '').slice(0, 6);
      const results = [];
      const failed = [];

      try {
        for (const code of codes) {
          this.chipBatchMessage = `正在查詢 ${code} 籌碼資料…（${this.chipBatchDone + 1}/${codes.length}）`;
          try {
            const payload = await fetchStockChipData(code, this.chipQueryDays || 10, { allowPartial: true });
            saveChipCache(this, payload);
            results.push(payload);

            if (window.StockRiskService && typeof window.StockRiskService.queryStockRiskData === 'function') {
              try { await window.StockRiskService.queryStockRiskData.call(this, code); }
              catch (riskErr) { console.warn('[ChipService] batch risk skipped:', code, riskErr); }
            }
          } catch (err) {
            console.warn('[ChipService] batch item failed:', code, err);
            const fallbackPayload = {
              version: 1,
              code,
              name: (holdings.find(h => String(h?.code || '').replace(/\D/g, '').slice(0, 6) === code) || {}).name || '',
              market: '',
              days: this.chipQueryDays || 10,
              fetchedAt: new Date().toISOString(),
              fetchedAtLabel: new Date().toLocaleString('zh-TW', { hour12: false }),
              institutionalRows: [],
              marginRows: [],
              summary: buildSummary([], []),
              overview: {},
              partial: true,
              error: err && err.message ? err.message : '查詢失敗',
              source: 'BATCH_FALLBACK',
            };
            saveChipCache(this, fallbackPayload);
            results.push(fallbackPayload);
            failed.push({ code, message: fallbackPayload.error });
          } finally {
            this.chipBatchDone += 1;
          }
        }

        const selected = results.find(r => r.code === originalCode) || results[0] || null;
        if (selected) {
          this.chipData = selected;
          this.chipQueryCode = selected.code;
          this.chipLastQuery = selected.code;
          this.chipLastUpdate = selected.fetchedAtLabel || new Date().toLocaleString('zh-TW', { hour12: false });
          if (window.StockRiskService && typeof window.StockRiskService.loadCachedStockRisk === 'function') {
            window.StockRiskService.loadCachedStockRisk.call(this, selected.code);
          }
        }

        if (window.StockStorage && window.StockStorage.saveChipData) window.StockStorage.saveChipData(this);
        if (window.StockStorage && window.StockStorage.saveStockRiskData) window.StockStorage.saveStockRiskData(this);

        const okCount = results.length;
        const failCount = failed.length;
        this.chipBatchMessage = failCount
          ? `持股分析更新完成：已處理 ${okCount} 檔，其中 ${failCount} 檔只有部分資料。`
          : `持股分析更新完成：已處理 ${okCount} 檔。`;
        if (typeof this.openInfoModal === 'function') {
          const failText = failCount ? `

部分資料：${failed.map(x => x.code).join('、')}` : '';
          this.openInfoModal('一鍵查持股完成', `${this.chipBatchMessage}${failText}`);
        }
        return { results, failed };
      } finally {
        this.chipBatchLoading = false;
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
