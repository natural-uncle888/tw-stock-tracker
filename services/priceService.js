(function(window) {
  'use strict';

  window.StockPriceService = {
    async fetchStockPrices() {
        if (this.holdings.length === 0) {
            this.openInfoModal('無庫存可更新', '目前沒有持倉股票，請先新增交易。');
            return;
        }
        this.isLoading = true;
        this.lastPriceUpdateError = '';
        this.lastPriceUpdateAttemptTs = Date.now();
        localStorage.setItem(window.StockStorage.KEYS.priceUpdateAttemptTimestamp, String(this.lastPriceUpdateAttemptTs));
        localStorage.setItem(window.StockStorage.KEYS.priceUpdateError, '');
    
        const proxyUrl = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? "https://corsproxy.io/?"
            : "/.netlify/functions/yahoo?u=";
    
        const promises = this.holdings.map(async (stock) => {
            const code = stock.code;
            let price = null;
            let status = this.latestStatus[code] || { isWarning: false, disposition: 0 }; let resolvedName = (this.nameMap && this.nameMap[code]) ? this.nameMap[code] : null;
    
            try {
                const res = await fetch(proxyUrl + encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.TW?interval=1d`));
                const data = await res.json();
                if (data.chart && data.chart.result) price = data.chart.result[0].meta.regularMarketPrice;
            } catch (e) {}
    
            if (price === null) {
                try {
                    const res = await fetch(proxyUrl + encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.TWO?interval=1d`));
                    const data = await res.json();
                    if (data.chart && data.chart.result) price = data.chart.result[0].meta.regularMarketPrice;
                } catch (e) {}
            }
    
            try {
                const pageRes = await fetch(proxyUrl + encodeURIComponent(`https://tw.stock.yahoo.com/quote/${code}`));
                const htmlText = await pageRes.text(); let pickedName = ''; try { const ogMatch = htmlText.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i); const twMatch = htmlText.match(/name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i); const tMatch = htmlText.match(/<title>([\s\S]*?)<\/title>/i); pickedName = (ogMatch && ogMatch[1]) ? ogMatch[1] : ((twMatch && twMatch[1]) ? twMatch[1] : ((tMatch && tMatch[1]) ? tMatch[1] : '')); pickedName = String(pickedName || '').replace(/\s+/g, ' ').trim(); pickedName = pickedName.replace(/\s*[-|｜]\s*Yahoo[\s\S]*$/i, '').trim(); const codeStr = String(code || '').trim(); if (codeStr) { pickedName = pickedName.replace(new RegExp('^\\s*' + codeStr + '\\s*[-：:]*\\s*', 'i'), ''); pickedName = pickedName.replace(new RegExp('^\\s*' + codeStr + '\\s*', 'i'), ''); } pickedName = pickedName.replace(/即時行情[\s\S]*$/,'').trim(); pickedName = pickedName.replace(/走勢圖[\s\S]*$/,'').trim(); pickedName = pickedName.replace(/\(\s*[0-9A-Za-z]{4,8}(?:\.(?:TW|TWO))?\s*\)/gi, '').trim(); if (codeStr) { const cRe2 = new RegExp('\\b' + codeStr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?:\\.(?:TW|TWO))?\\b', 'ig'); pickedName = pickedName.replace(cRe2,'').trim(); } pickedName = pickedName.replace(/\s+\d{2,3}\s*$/,'').trim(); pickedName = pickedName.replace(/\bTOP\s*\d+\b/ig, '').trim(); pickedName = pickedName.replace(/\bETF\b/ig, '').trim(); pickedName = pickedName.replace(/\s{2,}/g,' ').trim(); } catch(_) { pickedName = ''; } if (pickedName && /[\u4e00-\u9fff]/.test(pickedName) && !/yahoo|奇摩股市|yahoo股市/i.test(pickedName) && pickedName.length <= 40) { resolvedName = pickedName; }
                if (htmlText.match(/處置|彈性處置/)) {
                    status.disposition = 5;
                    if (htmlText.match(/20分鐘|二十分鐘|20分/)) {
                        status.disposition = 20;
                    }
                }
                if (htmlText.match(/注意|警示/)) {
                    status.isWarning = true;
                }
            } catch (e) {
                console.log('Status fetch failed for', code, e);
            }
    
            return { code, price, status, name: resolvedName };
        });
    
        try {
            const results = await Promise.all(promises);
            let updatedPriceCount = 0;
            let updatedNameCount = 0;
            let missingCount = 0;
    
            results.forEach(res => {
                if (res.price !== null && res.price !== undefined && !Number.isNaN(Number(res.price))) {
                    this.latestPrices[res.code] = Number(res.price);
                    updatedPriceCount += 1;
                } else {
                    missingCount += 1;
                }
                this.latestStatus[res.code] = res.status;
    
                if (res.name && typeof res.name === 'string') {
                    const n = res.name.trim();
                    if (n && /[\u4e00-\u9fff]/.test(n) && !/yahoo|奇摩股市|yahoo股市/i.test(n) && n.length <= 40) {
                        if (!this.nameMap) this.nameMap = {};
                        this.nameMap[res.code] = n;
                        updatedNameCount += 1;
                    }
                }
            });
    
            if (updatedPriceCount === 0 && updatedNameCount === 0) throw new Error('NO_PRICE_UPDATED');
    
            const now = new Date();
            this.lastUpdateTime = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            this.lastUpdateTimestamp = now.getTime();
    
            localStorage.setItem(window.StockStorage.KEYS.prices, JSON.stringify(this.latestPrices));
            localStorage.setItem(window.StockStorage.KEYS.priceStatus, JSON.stringify(this.latestStatus));
            localStorage.setItem(window.StockStorage.KEYS.priceUpdateTime, this.lastUpdateTime);
            localStorage.setItem(window.StockStorage.KEYS.priceUpdateTimestamp, String(this.lastUpdateTimestamp));
            localStorage.setItem(window.StockStorage.KEYS.stockNames, JSON.stringify(this.nameMap || {}));
    
            this.lastPriceUpdatePartial = (missingCount > 0);
            this.lastPriceUpdateMissingCount = missingCount;
            localStorage.setItem(window.StockStorage.KEYS.priceUpdatePartial, this.lastPriceUpdatePartial ? '1' : '0');
            localStorage.setItem(window.StockStorage.KEYS.priceUpdateMissingCount, String(this.lastPriceUpdateMissingCount));
    
            if (missingCount > 0) {
                this.openInfoModal('部分更新成功', ` ${updatedCount} 檔，${missingCount} 檔未更新（沿用上次價格）。`);
            } else {
                this.openInfoModal('更新成功', '股價與警示狀態已同步！');
            }
        } catch (error) {
            this.lastPriceUpdateError = '連線不穩定或資料來源暫時不可用，已沿用上次價格。';
            localStorage.setItem(window.StockStorage.KEYS.priceUpdateError, this.lastPriceUpdateError);
            this.lastPriceUpdatePartial = false;
            this.lastPriceUpdateMissingCount = 0;
            localStorage.setItem(window.StockStorage.KEYS.priceUpdatePartial, '0');
            localStorage.setItem(window.StockStorage.KEYS.priceUpdateMissingCount, '0');
            this.openInfoModal('', '連線不穩定，已沿用上次價格。可稍後再試。');
        } finally {
            this.isLoading = false;
        }
    },
    
            async fetchGlobalIndices() { this.isGlobalLoading = true; this.showGlobalIndices = true; this.globalIndices = []; const corsBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? "https://corsproxy.io/?" : "/.netlify/functions/yahoo?u="; const cors = (url) => `${corsBase}${encodeURIComponent(url)}`; const fetchFromYahooChart = async (symbol) => { const encodedSymbol = encodeURIComponent(symbol); const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json(); const meta = data?.chart?.result?.[0]?.meta; const price = meta?.regularMarketPrice; const prev = meta?.chartPreviousClose ?? meta?.previousClose; if (typeof price !== 'number' || typeof prev !== 'number' || prev === 0) throw new Error('No market meta'); const change = price - prev; const percent = (change / prev) * 100; return { price, change, percent }; }; const fetchTaiexNightFromYahooTW = async () => { const chartSymbols = ['WTX&', 'WTX@']; for (const symbol of chartSymbols) { try { const encodedSymbol = encodeURIComponent(symbol); const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json(); const meta = data?.chart?.result?.[0]?.meta; const price = meta?.regularMarketPrice; const prev = meta?.chartPreviousClose ?? meta?.previousClose; if (typeof price === 'number' && typeof prev === 'number' && prev !== 0) { const change = price - prev; const percent = (change / prev) * 100; return { price, change, percent }; } } catch (e) {} } const url = `https://tw.stock.yahoo.com/future/futures.html`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const htmlText = await res.text(); const idx = htmlText.indexOf('WTX&'); const idx2 = htmlText.indexOf('WTX&amp;'); const hit = (idx !== -1) ? idx : idx2; if (hit === -1) throw new Error('WTX& not found'); const slice = htmlText.slice(Math.max(0, hit - 4000), Math.min(htmlText.length, hit + 12000)); const textOnly = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); const after = textOnly.split(/WTX&|WTX&amp;/).slice(1).join(' ').trim(); const row = (after.split('WTX@')[0] || after).trim(); const nums = row.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || []; const floatStrs = nums.filter(s => s.includes('.')); const floatVals = floatStrs.map(s => parseFloat(s.replace(/,/g, ''))); const bigFloats = floatVals.filter(n => Math.abs(n) >= 1000); const price = (bigFloats.length >= 3) ? bigFloats[2] : bigFloats[0]; const ref = bigFloats.length ? bigFloats[bigFloats.length - 1] : null; if (typeof price !== 'number' || isNaN(price)) throw new Error('No price parsed'); if (typeof ref !== 'number' || isNaN(ref) || ref === 0) { const m = textOnly.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([+-]?\d+(?:\.\d+)?)%/); const change = m ? parseFloat(m[1].replace(/,/g, '')) : 0; const percent = m ? parseFloat(m[2]) : 0; return { price, change, percent }; } const change = price - ref; const percent = (change / ref) * 100; return { price, change, percent }; }; const targets = [ { symbol: '^DJI', name: '道瓊工業', kind: 'chart' }, { symbol: '^IXIC', name: 'NASDAQ', kind: 'chart' }, { symbol: '^GSPC', name: 'S&P 500', kind: 'chart' }, { symbol: '^SOX', name: '費城半導體', kind: 'chart' }, { symbol: 'WTX&', name: '台股指數(夜盤)', kind: 'taiexNight' }, ]; const promises = targets.map(async (t) => { try { const { price, change, percent } = (t.kind === 'taiexNight') ? await fetchTaiexNightFromYahooTW() : await fetchFromYahooChart(t.symbol); return { ...t, price: Number(price).toFixed(2), change, percent }; } catch (e) { return { ...t, price: '-', change: 0, percent: 0 }; } }); const results = await Promise.all(promises); this.globalIndices = results; const missing = results.filter(x => x && x.price === '-').length; const total = results.length; const success = total - missing; this.globalIndicesAttemptTs = Date.now(); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateAttemptTimestamp, String(this.globalIndicesAttemptTs)); if (success <= 0) { this.globalIndicesError = true; this.globalIndicesPartial = false; this.globalIndicesMissingCount = total; localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateError, '1'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdatePartial, '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateMissingCount, String(this.globalIndicesMissingCount)); } else { this.globalIndicesLastTs = Date.now(); localStorage.setItem(window.StockStorage.KEYS.globalIndexTimeTimestamp, String(this.globalIndicesLastTs)); this.globalIndicesError = false; this.globalIndicesPartial = (missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateError, '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdatePartial, this.globalIndicesPartial ? '1' : '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateMissingCount, String(this.globalIndicesMissingCount)); } this.isGlobalLoading = false; },
    
            async fetchTaiexNightIndex() { this.isTaiexNightLoading = true; this.showGlobalIndices = true; const corsBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? "https://corsproxy.io/?" : "/.netlify/functions/yahoo?u="; const cors = (url) => `${corsBase}${encodeURIComponent(url)}`; const fetchTaiexNightFromYahooTW = async () => { const chartSymbols = ['WTX&', 'TXFF202603']; for (const symbol of chartSymbols) { try { const encodedSymbol = encodeURIComponent(symbol); const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json(); const meta = data?.chart?.result?.[0]?.meta; const price = meta?.regularMarketPrice; const prev = meta?.chartPreviousClose ?? meta?.previousClose; if (typeof price === 'number' && typeof prev === 'number' && prev !== 0) { const change = price - prev; const percent = (change / prev) * 100; return { price, change, percent }; } } catch (e) {} } const url = `https://tw.stock.yahoo.com/future/futures.html`; const res = await fetch(cors(url)); if (!res.ok) throw new Error(`HTTP ${res.status}`); const htmlText = await res.text(); const idx = htmlText.indexOf('WTX&'); const idx2 = htmlText.indexOf('WTX&amp;'); const hit = (idx !== -1) ? idx : idx2; if (hit === -1) throw new Error('WTX& not found'); const slice = htmlText.slice(Math.max(0, hit - 4000), Math.min(htmlText.length, hit + 8000)); const textOnly = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); const m = textOnly.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([+-]?\d+(?:\.\d+)?)%/); let change = m ? parseFloat(m[1].replace(/,/g, '')) : null; let percent = m ? parseFloat(m[2]) : null; const after = textOnly.split(/WTX&|WTX&amp;/).slice(1).join(' ').trim(); const numsAfter = after.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g) || []; const price = numsAfter.length ? parseFloat(numsAfter[0].replace(/,/g, '')) : null; if (typeof price !== 'number' || isNaN(price)) throw new Error('No price parsed'); if (typeof percent === 'number' && !isNaN(percent) && typeof change === 'number' && !isNaN(change)) { if (percent < 0 && change > 0) change = -change; if (percent > 0 && change < 0) change = Math.abs(change); } return { price, change: (typeof change === 'number' && !isNaN(change)) ? change : 0, percent: (typeof percent === 'number' && !isNaN(percent)) ? percent : 0 }; }; try { const { price, change, percent } = await fetchTaiexNightFromYahooTW(); if (!Array.isArray(this.globalIndices) || this.globalIndices.length === 0) { await this.fetchGlobalIndices(); this.isTaiexNightLoading = false; return; } const i = this.globalIndices.findIndex(x => x.kind === 'taiexNight' || x.symbol === 'WTX&'); const item = { symbol: 'WTX&', name: '台股指數(夜盤)', kind: 'taiexNight', price: Number(price).toFixed(2), change: (typeof change === 'number' && !isNaN(change)) ? change : 0, percent: (typeof percent === 'number' && !isNaN(percent)) ? percent : 0 }; if (i >= 0) this.$set ? this.$set(this.globalIndices, i, item) : (this.globalIndices.splice(i, 1, item)); else this.globalIndices.push(item); this.globalIndicesLastTs = Date.now(); localStorage.setItem(window.StockStorage.KEYS.globalIndexTimeTimestamp, String(this.globalIndicesLastTs)); const missing = (this.globalIndices || []).filter(x => x && x.price === '-').length; const total = (this.globalIndices || []).length; const success = total - missing; this.globalIndicesError = (success <= 0); this.globalIndicesPartial = (!this.globalIndicesError && missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateError, this.globalIndicesError ? '1' : '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdatePartial, this.globalIndicesPartial ? '1' : '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateMissingCount, String(this.globalIndicesMissingCount)); } catch (e) { const i = this.globalIndices.findIndex(x => x.kind === 'taiexNight' || x.symbol === 'WTX&'); if (i >= 0) { const cur = this.globalIndices[i]; const next = { ...cur, price: '-', change: 0, percent: 0 }; this.globalIndices.splice(i, 1, next); } const missing = (this.globalIndices || []).filter(x => x && x.price === '-').length; const total = (this.globalIndices || []).length; const success = total - missing; this.globalIndicesError = (success <= 0); this.globalIndicesPartial = (!this.globalIndicesError && missing > 0); this.globalIndicesMissingCount = missing; localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateError, this.globalIndicesError ? '1' : '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdatePartial, this.globalIndicesPartial ? '1' : '0'); localStorage.setItem(window.StockStorage.KEYS.globalIndexUpdateMissingCount, String(this.globalIndicesMissingCount)); } finally { this.isTaiexNightLoading = false; } },
    
    async fetchOnlineSuggestions(query) {
        this.isSearching = true;
        try {
            const proxyUrl = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                ? "https://corsproxy.io/?"
                : "/.netlify/functions/yahoo?u=";
    
            const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=zh-Hant-TW&region=TW&quotesCount=5&newsCount=0`;
            const res = await fetch(proxyUrl + encodeURIComponent(url));
            const data = await res.json();
    
            if (data.quotes && data.quotes.length > 0) {
                const onlineResults = data.quotes
                    .filter(q => q.symbol && (q.symbol.endsWith('.TW') || q.symbol.endsWith('.TWO')))
                    .map(q => ({
                        code: q.symbol.replace(/\.TW(O)?$/, ''),
                        name: q.longname || q.shortname || '',
                        isOnline: true
                    }));
    
                const existingCodes = new Set(this.suggestions.map(s => s.code));
                onlineResults.forEach(item => {
                    if (!existingCodes.has(item.code)) this.suggestions.push(item);
                });
            }
        } catch (e) {
        } finally {
            this.isSearching = false;
        }
    }
  };
})(window);
